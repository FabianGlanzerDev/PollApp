import { Injectable, OnDestroy, signal } from '@angular/core';
import { RealtimeChannel, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import {
  Answer,
  NewSurveyInput,
  Question,
  Survey,
  SurveySubmission,
  SurveyVote,
} from '../interfaces/survey-interface';
import {
  LOCAL_SURVEYS_KEY,
  LOCAL_VOTES_KEY,
  SurveyLocalStorage,
} from './survey-local-storage';
import { SurveySupabaseRepository } from './survey-supabase-repository';

const RESULT_CHANNEL = 'pollapp-result-updates';
const SURVEY_CHANNEL = 'pollapp-survey-updates';



/**
 * Central data service for surveys, questions, votes and realtime synchronization.
 */
@Injectable({ providedIn: 'root' })
export class Surveys implements OnDestroy {
  readonly supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  readonly surveys = signal<Survey[]>([]);
  readonly questions = signal<Question[]>([]);
  readonly statistics = signal<SurveyVote[]>([]);

  private readonly localStore = new SurveyLocalStorage();
  private readonly remoteStore = new SurveySupabaseRepository(this.supabase);
  private activeStatisticsSurveyId: number | null = null;
  private realtimeChannel?: RealtimeChannel;
  private resultChannel?: BroadcastChannel;
  private surveyChannel?: BroadcastChannel;



  /**
   * Initializes local synchronization and Supabase realtime subscriptions when configured.
   */
  constructor() {
    this.setupLocalSync();
    if (!this.isConfigured()) {
      this.refreshLocalSurveys();
      return;
    }
    this.getSurveys();
    this.subscribeToTables();
  }



  /**
   * Loads all available surveys from Supabase or the local fallback store.
   *
   * @returns A Promise resolving to an array of Survey objects.
   */
  async getSurveys(): Promise<Survey[]> {
    if (!this.isConfigured()) return this.refreshLocalSurveys();
    const surveys = await this.remoteStore.getSurveys();
    this.surveys.set(surveys);
    return this.surveys();
  }



  /**
   * Creates a survey using Supabase when configured, otherwise local storage.
   *
   * @param input Normalized survey data entered by the user.
   * @returns A Promise resolving to the newly created Survey.
   */
  async createSurvey(input: NewSurveyInput): Promise<Survey> {
    if (!this.isConfigured()) return this.createLocalSurvey(input);
    const survey = await this.remoteStore.createSurvey(input);
    await this.getSurveys();
    return survey;
  }



  /**
   * Loads the questions and answer options belonging to a survey.
   *
   * @param surveyId Id of the survey to load.
   * @returns A Promise resolving to an array of Question objects with related answers.
   */
  async loadSurveyContent(surveyId: number): Promise<Question[]> {
    await this.setRelatedQuestions(surveyId);
    const answers = await Promise.all(this.questions().map((question) => this.getRelatedAnswers(question.id)));
    this.mergeAnswersIntoQuestions(answers);
    return this.questions();
  }



  /**
   * Loads all vote records required to calculate live survey statistics.
   *
   * @param surveyId Id of the survey whose results should be loaded.
   * @returns A Promise resolving to an array of SurveyVote records.
   */
  async getStatisticsData(surveyId: number): Promise<SurveyVote[]> {
    this.activeStatisticsSurveyId = surveyId;
    if (!this.isConfigured()) return this.loadLocalStatistics(surveyId);
    const votes = await this.remoteStore.getStatistics(surveyId);
    this.statistics.set(votes);
    return this.statistics();
  }



  /**
   * Persists a completed survey submission and refreshes its statistics.
   *
   * @param votes Vote records generated from the selected answers.
   * @returns A Promise that resolves after the votes have been stored.
   */
  async submitVotes(votes: SurveySubmission[]): Promise<void> {
    if (votes.length === 0) return;
    if (!this.isConfigured()) {
      this.submitLocalVotes(votes);
      return;
    }
    await this.remoteStore.submitVotes(votes);
    await this.getStatisticsData(votes[0].survey_id);
  }



  /**
   * Releases realtime channels, broadcast channels and storage listeners.
   */
  ngOnDestroy(): void {
    if (this.realtimeChannel) this.supabase.removeChannel(this.realtimeChannel);
    this.resultChannel?.close();
    this.surveyChannel?.close();
    window.removeEventListener('storage', this.handleStorageChange);
  }



  /**
   * Loads survey questions from Supabase or local storage.
   *
   * @param surveyId Id of the survey whose questions are requested.
   * @returns A Promise that resolves after the question signal is updated.
   */
  private async setRelatedQuestions(surveyId: number): Promise<void> {
    const questions = this.isConfigured()
      ? await this.remoteStore.getQuestions(surveyId)
      : this.localStore.getQuestions(surveyId);
    this.questions.set(questions);
  }



  /**
   * Loads answer options for one question from Supabase or local storage.
   *
   * @param questionId Id of the question whose answers are requested.
   * @returns A Promise resolving to an array of Answer objects.
   */
  private async getRelatedAnswers(questionId: number): Promise<Answer[]> {
    if (!this.isConfigured()) return this.localStore.getAnswers(questionId);
    return this.remoteStore.getAnswers(questionId);
  }



  /**
   * Adds loaded answer groups to their matching question objects.
   *
   * @param answerGroups Answer arrays ordered like the current questions.
   */
  private mergeAnswersIntoQuestions(answerGroups: Answer[][]): void {
    const questions = this.questions();
    this.questions.set(questions.map((question, index) => ({
      ...question,
      answers: answerGroups[index] ?? [],
    })));
  }



  /**
   * Creates a survey in local storage and refreshes connected local views.
   *
   * @param input Normalized survey creation data.
   * @returns The newly created Survey object.
   */
  private createLocalSurvey(input: NewSurveyInput): Survey {
    const survey = this.localStore.createSurvey(input);
    this.refreshLocalSurveys();
    this.surveyChannel?.postMessage('refresh');
    return survey;
  }



  /**
   * Persists votes locally and broadcasts the result update to other tabs.
   *
   * @param votes Vote records generated from the selected answers.
   */
  private submitLocalVotes(votes: SurveySubmission[]): void {
    this.localStore.submitVotes(votes);
    this.loadLocalStatistics(votes[0].survey_id);
    this.resultChannel?.postMessage(votes[0].survey_id);
  }



  /**
   * Refreshes locally stored statistics for one survey.
   *
   * @param surveyId Id of the survey whose statistics are requested.
   * @returns An array of SurveyVote records for the survey.
   */
  private loadLocalStatistics(surveyId: number): SurveyVote[] {
    const votes = this.localStore.getStatistics(surveyId);
    this.statistics.set(votes);
    return this.statistics();
  }



  /**
   * Refreshes the survey signal from the local fallback store.
   *
   * @returns An array containing all locally stored Survey objects.
   */
  private refreshLocalSurveys(): Survey[] {
    const surveys = this.localStore.getSurveys();
    this.surveys.set(surveys);
    return this.surveys();
  }



  /**
   * Registers local storage and BroadcastChannel synchronization.
   */
  private setupLocalSync(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', this.handleStorageChange);
    if (typeof BroadcastChannel === 'undefined') return;
    this.resultChannel = new BroadcastChannel(RESULT_CHANNEL);
    this.resultChannel.onmessage = (event) => this.refreshLocalResults(Number(event.data));
    this.surveyChannel = new BroadcastChannel(SURVEY_CHANNEL);
    this.surveyChannel.onmessage = () => this.refreshLocalSurveys();
  }



  /**
   * Refreshes local surveys or votes when another browser context changes storage.
   *
   * @param event Browser storage event containing the changed key.
   */
  private readonly handleStorageChange = (event: StorageEvent): void => {
    if (event.key === LOCAL_SURVEYS_KEY) this.refreshLocalSurveys();
    if (event.key !== LOCAL_VOTES_KEY || this.activeStatisticsSurveyId === null) return;
    this.loadLocalStatistics(this.activeStatisticsSurveyId);
  };



  /**
   * Refreshes local statistics only when the broadcast targets the active survey.
   *
   * @param surveyId Id sent through the result BroadcastChannel.
   */
  private refreshLocalResults(surveyId: number): void {
    if (surveyId !== this.activeStatisticsSurveyId) return;
    this.loadLocalStatistics(surveyId);
  }



  /**
   * Checks whether real Supabase connection values are configured.
   *
   * @returns A boolean that is true when the environment contains usable values.
   */
  private isConfigured(): boolean {
    return !environment.supabaseUrl.includes('example.supabase.co') &&
      environment.supabaseAnonKey !== 'placeholder-public-anon-key';
  }



  /**
   * Creates the realtime channel and subscribes to survey and vote changes.
   */
  private subscribeToTables(): void {
    this.realtimeChannel = this.supabase.channel('pollapp-live-data');
    this.subscribeToSurveyChanges();
    this.subscribeToVoteChanges();
    this.realtimeChannel.subscribe();
  }



  /**
   * Registers realtime updates for survey metadata changes.
   */
  private subscribeToSurveyChanges(): void {
    const config = { event: '*' as const, schema: 'public', table: 'surveyDetail' };
    this.realtimeChannel?.on('postgres_changes', config, () => this.getSurveys());
  }



  /**
   * Registers realtime updates for submitted vote changes.
   */
  private subscribeToVoteChanges(): void {
    const config = { event: '*' as const, schema: 'public', table: 'choosenDetail' };
    this.realtimeChannel?.on('postgres_changes', config, () => this.refreshRemoteResults());
  }



  /**
   * Refreshes remote statistics for the survey currently displayed.
   */
  private refreshRemoteResults(): void {
    if (this.activeStatisticsSurveyId === null) return;
    this.getStatisticsData(this.activeStatisticsSurveyId);
  }
}
