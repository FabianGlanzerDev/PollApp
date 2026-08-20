import { Injectable, OnDestroy, signal } from '@angular/core';
import { RealtimeChannel, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import {
  Answer,
  NewSurveyInput,
  NewSurveyQuestion,
  Question,
  Survey,
  SurveySubmission,
  SurveyVote,
} from '../interfaces/survey-interface';
import { LocalBuildState, LocalSurveyStore } from './surveys.types';

const LOCAL_VOTES_KEY = 'pollapp-local-votes';
const LOCAL_SURVEYS_KEY = 'pollapp-local-surveys';
const RESULT_CHANNEL = 'pollapp-result-updates';
const SURVEY_CHANNEL = 'pollapp-survey-updates';

@Injectable({ providedIn: 'root' })
/**
 * Central data service for surveys, questions, votes and realtime synchronization.
 */
export class Surveys implements OnDestroy {
  readonly supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  readonly surveys = signal<Survey[]>([]);
  readonly questions = signal<Question[]>([]);
  readonly statistics = signal<SurveyVote[]>([]);

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
   * @returns A promise resolving to the current survey collection.
   */
  async getSurveys() {
    if (!this.isConfigured()) return this.refreshLocalSurveys();
    const { data, error } = await this.supabase.from('surveyDetail').select('*');
    if (!error && data) this.surveys.set(data as Survey[]);
    return this.surveys();
  }



  /**
   * Creates a survey using Supabase when configured, otherwise local storage.
   *
   * @param input Normalized survey data entered by the user.
   * @returns The newly created survey.
   */
  async createSurvey(input: NewSurveyInput) {
    if (!this.isConfigured()) return this.createLocalSurvey(input);
    return this.createRemoteSurvey(input);
  }



  /**
   * Loads the questions and answer options belonging to a survey.
   *
   * @param surveyId Id of the survey to load.
   * @returns The questions including their related answers.
   */
  async loadSurveyContent(surveyId: number) {
    await this.setRelatedQuestions(surveyId);
    const answers = await Promise.all(this.questions().map((question) => this.getRelatedAnswers(question.id)));
    this.mergeAnswersIntoQuestions(answers);
    return this.questions();
  }



  /**
   * Loads all vote records required to calculate live survey statistics.
   *
   * @param surveyId Id of the survey whose results should be loaded.
   * @returns The current vote records for the survey.
   */
  async getStatisticsData(surveyId: number) {
    this.activeStatisticsSurveyId = surveyId;
    if (!this.isConfigured()) return this.loadLocalStatistics(surveyId);
    const query = this.supabase.from('choosenDetail').select('*').eq('survey_id', surveyId);
    const { data } = await query.order('answer_id', { ascending: true });
    this.statistics.set((data ?? []) as SurveyVote[]);
    return this.statistics();
  }



  /**
   * Persists a completed survey submission and refreshes its statistics.
   *
   * @param votes Vote records generated from the selected answers.
   * @returns A promise that resolves after the votes have been stored.
   */
  async submitVotes(votes: SurveySubmission[]) {
    if (votes.length === 0) return;
    if (!this.isConfigured()) return this.submitLocalVotes(votes);
    const { error } = await this.supabase.from('choosenDetail').insert(votes);
    if (error) throw error;
    await this.getStatisticsData(votes[0].survey_id);
  }



  /**
   * Releases realtime channels, broadcast channels and storage listeners.
   */
  ngOnDestroy() {
    if (this.realtimeChannel) this.supabase.removeChannel(this.realtimeChannel);
    this.resultChannel?.close();
    this.surveyChannel?.close();
    window.removeEventListener('storage', this.handleStorageChange);
  }



  private async setRelatedQuestions(id: number) {
    if (!this.isConfigured()) {
      const localQuestions = this.readLocalSurveyStore().questions.filter((question) => question.survey === id);
      this.questions.set(localQuestions);
      return;
    }
    const { data } = await this.supabase.from('questionDetail').select('*').eq('survey', id).order('id', { ascending: true });
    this.questions.set((data ?? []) as Question[]);
  }



  private async getRelatedAnswers(questionId: number): Promise<Answer[]> {
    if (!this.isConfigured()) {
      const localAnswers = this.readLocalSurveyStore().answers.filter((answer) => answer.question === questionId);
      return localAnswers;
    }
    const { data } = await this.supabase.from('answerDetail').select('*').eq('question', questionId).order('id', { ascending: true });
    return (data ?? []) as Answer[];
  }



  private mergeAnswersIntoQuestions(answerGroups: Answer[][]) {
    const questions = this.questions();
    this.questions.set(questions.map((question, index) => ({
      ...question,
      answers: answerGroups[index] ?? [],
    })));
  }



  private createLocalSurvey(input: NewSurveyInput) {
    const store = this.readLocalSurveyStore();
    const surveyId = this.nextId(store.surveys);
    const survey = this.toSurvey(surveyId, input);
    const built = this.buildLocalQuestions(surveyId, input, store);
    this.persistLocalSurvey(store, survey, built);
    return survey;
  }


  private persistLocalSurvey(store: LocalSurveyStore, survey: Survey, built: Pick<LocalSurveyStore, 'questions' | 'answers'>) {
    const nextStore = {
      surveys: [...store.surveys, survey],
      questions: [...store.questions, ...built.questions],
      answers: [...store.answers, ...built.answers],
    };
    localStorage.setItem(LOCAL_SURVEYS_KEY, JSON.stringify(nextStore));
    this.refreshLocalSurveys();
    this.surveyChannel?.postMessage('refresh');
  }



  private toSurvey(id: number, input: NewSurveyInput): Survey {
    return {
      id,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      category: input.category,
    };
  }



  private buildLocalQuestions(surveyId: number, input: NewSurveyInput, store: LocalSurveyStore) {
    const state: LocalBuildState = {
      questionId: this.nextId(store.questions),
      answerId: this.nextId(store.answers),
      questions: [],
      answers: [],
    };
    input.questions.forEach((entry) => this.appendLocalQuestion(surveyId, entry, state));
    return { questions: state.questions, answers: state.answers };
  }


  private appendLocalQuestion(surveyId: number, entry: NewSurveyQuestion, state: LocalBuildState) {
    const questionId = state.questionId++;
    const answers = entry.answers.map((answer) => this.toLocalAnswer(questionId, answer, state));
    state.answers.push(...answers);
    state.questions.push({
      id: questionId, question: entry.questionText, allowMultipleAnswers: entry.allowMultiple,
      answers, survey: surveyId,
    });
  }


  private toLocalAnswer(questionId: number, answer: string, state: LocalBuildState): Answer {
    return { id: state.answerId++, answer, question: questionId };
  }



  private nextId(items: { id: number }[]) {
    return Math.max(1000, ...items.map((item) => item.id)) + 1;
  }



  private async createRemoteSurvey(input: NewSurveyInput) {
    const survey = await this.insertRemoteSurvey(input);
    const questionIds = await this.insertRemoteQuestions(survey.id, input.questions);
    await this.insertRemoteAnswers(input.questions, questionIds);
    await this.getSurveys();
    return survey;
  }


  private async insertRemoteSurvey(input: NewSurveyInput): Promise<Survey> {
    const payload = {
      title: input.title, deadline: input.deadline, category: input.category,
      description: input.description,
    };
    const response = await this.supabase.from('surveyDetail').insert(payload).select().single();
    if (response.error || !response.data) throw response.error;
    return response.data as Survey;
  }


  private async insertRemoteQuestions(surveyId: number, questions: NewSurveyQuestion[]) {
    const payload = questions.map((entry) => ({
      survey: surveyId, question: entry.questionText, allowMultipleAnswers: entry.allowMultiple,
    }));
    const response = await this.supabase.from('questionDetail').insert(payload).select('id');
    if (response.error || !response.data) throw response.error;
    return response.data.map((question) => Number(question.id));
  }


  private async insertRemoteAnswers(questions: NewSurveyQuestion[], questionIds: number[]) {
    const payload = questions.flatMap((entry, index) =>
      entry.answers.map((answer) => ({ question: questionIds[index], answer })),
    );
    const response = await this.supabase.from('answerDetail').insert(payload);
    if (response.error) throw response.error;
  }



  private submitLocalVotes(votes: SurveySubmission[]) {
    const storedVotes = this.readLocalVotes();
    const timestamp = new Date().toISOString();
    const newVotes = votes.map((vote) => ({ ...vote, created_at: timestamp }));
    localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify([...storedVotes, ...newVotes]));
    this.loadLocalStatistics(votes[0].survey_id);
    this.resultChannel?.postMessage(votes[0].survey_id);
  }



  private loadLocalStatistics(surveyId: number) {
    const customVotes = this.readLocalVotes().filter((vote) => vote.survey_id === surveyId);
    this.statistics.set(customVotes);
    return this.statistics();
  }



  private refreshLocalSurveys() {
    const localSurveys = this.readLocalSurveyStore().surveys;
    this.surveys.set(localSurveys);
    return this.surveys();
  }



  private readLocalVotes(): SurveyVote[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_VOTES_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed as SurveyVote[] : [];
    } catch {
      return [];
    }
  }



  private readLocalSurveyStore(): LocalSurveyStore {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_SURVEYS_KEY) ?? '{}');
      return {
        surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      };
    } catch {
      return { surveys: [], questions: [], answers: [] };
    }
  }



  private setupLocalSync() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', this.handleStorageChange);
    if (typeof BroadcastChannel === 'undefined') return;
    this.resultChannel = new BroadcastChannel(RESULT_CHANNEL);
    this.resultChannel.onmessage = (event) => this.refreshLocalResults(Number(event.data));
    this.surveyChannel = new BroadcastChannel(SURVEY_CHANNEL);
    this.surveyChannel.onmessage = () => this.refreshLocalSurveys();
  }



  private readonly handleStorageChange = (event: StorageEvent) => {
    if (event.key === LOCAL_SURVEYS_KEY) this.refreshLocalSurveys();
    if (event.key !== LOCAL_VOTES_KEY || this.activeStatisticsSurveyId === null) return;
    this.loadLocalStatistics(this.activeStatisticsSurveyId);
  };



  private refreshLocalResults(surveyId: number) {
    if (surveyId !== this.activeStatisticsSurveyId) return;
    this.loadLocalStatistics(surveyId);
  }



  private isConfigured() {
    return !environment.supabaseUrl.includes('example.supabase.co') &&
      environment.supabaseAnonKey !== 'placeholder-public-anon-key';
  }



  private subscribeToTables() {
    this.realtimeChannel = this.supabase.channel('pollapp-live-data');
    this.subscribeToSurveyChanges();
    this.subscribeToVoteChanges();
    this.realtimeChannel.subscribe();
  }



  private subscribeToSurveyChanges() {
    const config = { event: '*' as const, schema: 'public', table: 'surveyDetail' };
    this.realtimeChannel?.on('postgres_changes', config, () => this.getSurveys());
  }



  private subscribeToVoteChanges() {
    const config = { event: '*' as const, schema: 'public', table: 'choosenDetail' };
    this.realtimeChannel?.on('postgres_changes', config, () => this.refreshRemoteResults());
  }



  private refreshRemoteResults() {
    if (this.activeStatisticsSurveyId === null) return;
    this.getStatisticsData(this.activeStatisticsSurveyId);
  }
}
