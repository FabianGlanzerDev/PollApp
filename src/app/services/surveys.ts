import { Injectable, OnDestroy, signal } from '@angular/core';
import { RealtimeChannel, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { getDemoAnswers, getDemoQuestions, getDemoStatistics } from '../data/demo-survey-content';
import { DEMO_SURVEYS } from '../data/demo-surveys';
import {
  Answer,
  NewSurveyInput,
  Question,
  Survey,
  SurveySubmission,
  SurveyVote,
} from '../interfaces/survey-interface';

const LOCAL_VOTES_KEY = 'pollapp-local-votes';
const LOCAL_SURVEYS_KEY = 'pollapp-local-surveys';
const RESULT_CHANNEL = 'pollapp-result-updates';
const SURVEY_CHANNEL = 'pollapp-survey-updates';

type LocalSurveyStore = {
  surveys: Survey[];
  questions: Question[];
  answers: Answer[];
};

@Injectable({ providedIn: 'root' })
export class Surveys implements OnDestroy {
  readonly supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  readonly surveys = signal<Survey[]>(DEMO_SURVEYS);
  readonly questions = signal<Question[]>([]);
  readonly statistics = signal<SurveyVote[]>([]);

  private activeStatisticsSurveyId: number | null = null;
  private realtimeChannel?: RealtimeChannel;
  private resultChannel?: BroadcastChannel;
  private surveyChannel?: BroadcastChannel;

  constructor() {
    this.setupLocalSync();
    if (!this.isConfigured()) {
      this.refreshLocalSurveys();
      return;
    }
    this.getSurveys();
    this.subscribeToTables();
  }



  async getSurveys() {
    if (!this.isConfigured()) return this.refreshLocalSurveys();
    const { data, error } = await this.supabase.from('surveyDetail').select('*');
    if (!error && data) this.surveys.set(data as Survey[]);
    return this.surveys();
  }



  async createSurvey(input: NewSurveyInput) {
    if (!this.isConfigured()) return this.createLocalSurvey(input);
    return this.createRemoteSurvey(input);
  }



  async loadSurveyContent(surveyId: number) {
    await this.setRelatedQuestions(surveyId);
    const answers = await Promise.all(this.questions().map((question) => this.getRelatedAnswers(question.id)));
    this.mergeAnswersIntoQuestions(answers);
    return this.questions();
  }



  async getStatisticsData(surveyId: number) {
    this.activeStatisticsSurveyId = surveyId;
    if (!this.isConfigured()) return this.loadLocalStatistics(surveyId);
    const query = this.supabase.from('choosenDetail').select('*').eq('survey_id', surveyId);
    const { data } = await query.order('answer_id', { ascending: true });
    this.statistics.set((data ?? []) as SurveyVote[]);
    return this.statistics();
  }



  async submitVotes(votes: SurveySubmission[]) {
    if (votes.length === 0) return;
    if (!this.isConfigured()) return this.submitLocalVotes(votes);
    const { error } = await this.supabase.from('choosenDetail').insert(votes);
    if (error) throw error;
    await this.getStatisticsData(votes[0].survey_id);
  }



  ngOnDestroy() {
    if (this.realtimeChannel) this.supabase.removeChannel(this.realtimeChannel);
    this.resultChannel?.close();
    this.surveyChannel?.close();
    window.removeEventListener('storage', this.handleStorageChange);
  }



  private async setRelatedQuestions(id: number) {
    if (!this.isConfigured()) {
      const localQuestions = this.readLocalSurveyStore().questions.filter((question) => question.survey === id);
      this.questions.set(localQuestions.length ? localQuestions : getDemoQuestions(id));
      return;
    }
    const { data } = await this.supabase.from('questionDetail').select('*').eq('survey', id);
    this.questions.set((data ?? []) as Question[]);
  }



  private async getRelatedAnswers(questionId: number): Promise<Answer[]> {
    if (!this.isConfigured()) {
      const localAnswers = this.readLocalSurveyStore().answers.filter((answer) => answer.question === questionId);
      return localAnswers.length ? localAnswers : getDemoAnswers(questionId);
    }
    const { data } = await this.supabase.from('answerDetail').select('*').eq('question', questionId);
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
    const surveyId = this.nextId([...DEMO_SURVEYS, ...store.surveys]);
    const survey = this.toSurvey(surveyId, input);
    const built = this.buildLocalQuestions(surveyId, input, store);

    const nextStore: LocalSurveyStore = {
      surveys: [...store.surveys, survey],
      questions: [...store.questions, ...built.questions],
      answers: [...store.answers, ...built.answers],
    };

    localStorage.setItem(LOCAL_SURVEYS_KEY, JSON.stringify(nextStore));
    this.refreshLocalSurveys();
    this.surveyChannel?.postMessage('refresh');
    return survey;
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
    let questionId = this.nextId(store.questions);
    let answerId = this.nextId(store.answers);
    const questions: Question[] = [];
    const answers: Answer[] = [];

    for (const entry of input.questions) {
      const currentQuestionId = questionId++;
      const questionAnswers = entry.answers.map((answer) => ({
        id: answerId++,
        answer,
        question: currentQuestionId,
      }));
      answers.push(...questionAnswers);
      questions.push({
        id: currentQuestionId,
        question: entry.questionText,
        allowMultipleAnswers: entry.allowMultiple,
        answers: questionAnswers,
        survey: surveyId,
      });
    }

    return { questions, answers };
  }



  private nextId(items: { id: number }[]) {
    return Math.max(1000, ...items.map((item) => item.id)) + 1;
  }



  private async createRemoteSurvey(input: NewSurveyInput) {
    const surveyResponse = await this.supabase.from('surveyDetail').insert({
      title: input.title,
      deadline: input.deadline,
      category: input.category,
      description: input.description,
    }).select().single();
    if (surveyResponse.error || !surveyResponse.data) throw surveyResponse.error;

    const surveyId = Number(surveyResponse.data.id);
    const questionPayload = input.questions.map((entry) => ({
      survey: surveyId,
      question: entry.questionText,
      allowMultipleAnswers: entry.allowMultiple,
    }));
    const questionResponse = await this.supabase.from('questionDetail').insert(questionPayload).select();
    if (questionResponse.error || !questionResponse.data) throw questionResponse.error;

    const answerPayload = input.questions.flatMap((entry, index) => {
      const questionId = Number(questionResponse.data[index].id);
      return entry.answers.map((answer) => ({ question: questionId, answer }));
    });
    const answerResponse = await this.supabase.from('answerDetail').insert(answerPayload);
    if (answerResponse.error) throw answerResponse.error;

    await this.getSurveys();
    return surveyResponse.data as Survey;
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
    this.statistics.set([...getDemoStatistics(surveyId), ...customVotes]);
    return this.statistics();
  }



  private refreshLocalSurveys() {
    const localSurveys = this.readLocalSurveyStore().surveys;
    this.surveys.set([...DEMO_SURVEYS, ...localSurveys]);
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
