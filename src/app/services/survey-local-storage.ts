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

export const LOCAL_VOTES_KEY = 'pollapp-local-votes';
export const LOCAL_SURVEYS_KEY = 'pollapp-local-surveys';

const LOCAL_ID_START = 1000;



/**
 * Provides the local-storage fallback used when Supabase is not configured.
 */
export class SurveyLocalStorage {
  /**
   * Reads all locally stored surveys.
   *
   * @returns An array of Survey objects stored in the browser.
   */
  getSurveys(): Survey[] {
    return this.readSurveyStore().surveys;
  }



  /**
   * Reads all locally stored questions belonging to one survey.
   *
   * @param surveyId Id of the survey whose questions are requested.
   * @returns An array of Question objects for the survey.
   */
  getQuestions(surveyId: number): Question[] {
    return this.readSurveyStore().questions.filter((question) => question.survey === surveyId);
  }



  /**
   * Reads all locally stored answers belonging to one question.
   *
   * @param questionId Id of the question whose answers are requested.
   * @returns An array of Answer objects for the question.
   */
  getAnswers(questionId: number): Answer[] {
    return this.readSurveyStore().answers.filter((answer) => answer.question === questionId);
  }



  /**
   * Creates and persists a complete survey in local storage.
   *
   * @param input Normalized survey creation data.
   * @returns The newly created Survey object.
   */
  createSurvey(input: NewSurveyInput): Survey {
    const store = this.readSurveyStore();
    const surveyId = this.nextId(store.surveys);
    const survey = this.toSurvey(surveyId, input);
    const built = this.buildQuestions(surveyId, input, store);
    this.persistSurvey(store, survey, built);
    return survey;
  }



  /**
   * Stores submitted votes in local storage.
   *
   * @param votes SurveySubmission records selected by the participant.
   * @returns An array of SurveyVote records after persistence.
   */
  submitVotes(votes: SurveySubmission[]): SurveyVote[] {
    const storedVotes = this.readVotes();
    const timestamp = new Date().toISOString();
    const newVotes = votes.map((vote) => ({ ...vote, created_at: timestamp }));
    const nextVotes = [...storedVotes, ...newVotes];
    localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(nextVotes));
    return nextVotes;
  }



  /**
   * Reads vote statistics for one survey from local storage.
   *
   * @param surveyId Id of the survey whose votes are requested.
   * @returns An array of SurveyVote records belonging to the survey.
   */
  getStatistics(surveyId: number): SurveyVote[] {
    return this.readVotes().filter((vote) => vote.survey_id === surveyId);
  }



  /**
   * Persists a survey with all of its questions and answers.
   *
   * @param store Existing local survey store.
   * @param survey Survey metadata to append.
   * @param built Newly created questions and answers.
   */
  private persistSurvey(
    store: LocalSurveyStore,
    survey: Survey,
    built: Pick<LocalSurveyStore, 'questions' | 'answers'>,
  ): void {
    const nextStore = {
      surveys: [...store.surveys, survey],
      questions: [...store.questions, ...built.questions],
      answers: [...store.answers, ...built.answers],
    };
    localStorage.setItem(LOCAL_SURVEYS_KEY, JSON.stringify(nextStore));
  }



  /**
   * Maps new survey input to persisted survey metadata.
   *
   * @param id Generated survey id.
   * @param input Normalized survey creation data.
   * @returns A Survey object ready for persistence.
   */
  private toSurvey(id: number, input: NewSurveyInput): Survey {
    return {
      id,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      category: input.category,
    };
  }



  /**
   * Creates local question and answer records for a survey.
   *
   * @param surveyId Id of the survey being created.
   * @param input Normalized survey creation data.
   * @param store Existing local survey store.
   * @returns An object containing the newly created questions and answers.
   */
  private buildQuestions(
    surveyId: number,
    input: NewSurveyInput,
    store: LocalSurveyStore,
  ): Pick<LocalSurveyStore, 'questions' | 'answers'> {
    const state = this.createBuildState(store);
    input.questions.forEach((entry) => this.appendQuestion(surveyId, entry, state));
    return { questions: state.questions, answers: state.answers };
  }



  /**
   * Creates the id counters and output collections used while building a survey.
   *
   * @param store Existing local survey store.
   * @returns A LocalBuildState initialized with the next available ids.
   */
  private createBuildState(store: LocalSurveyStore): LocalBuildState {
    return {
      questionId: this.nextId(store.questions),
      answerId: this.nextId(store.answers),
      questions: [],
      answers: [],
    };
  }



  /**
   * Appends one question and its answer records to the build state.
   *
   * @param surveyId Id of the survey being created.
   * @param entry Question data entered by the user.
   * @param state Mutable local build state.
   */
  private appendQuestion(surveyId: number, entry: NewSurveyQuestion, state: LocalBuildState): void {
    const questionId = state.questionId++;
    const answers = entry.answers.map((answer) => this.toAnswer(questionId, answer, state));
    state.answers.push(...answers);
    state.questions.push({
      id: questionId,
      question: entry.questionText,
      allowMultipleAnswers: entry.allowMultiple,
      answers,
      survey: surveyId,
    });
  }



  /**
   * Creates one local answer record and advances the answer id counter.
   *
   * @param questionId Id of the parent question.
   * @param answer Answer text entered by the user.
   * @param state Mutable local build state.
   * @returns An Answer object ready for local persistence.
   */
  private toAnswer(questionId: number, answer: string, state: LocalBuildState): Answer {
    return { id: state.answerId++, answer, question: questionId };
  }



  /**
   * Calculates the next local id using the configured local id range.
   *
   * @param items Existing objects containing numeric ids.
   * @returns A number containing the next local id.
   */
  private nextId(items: { id: number }[]): number {
    return Math.max(LOCAL_ID_START, ...items.map((item) => item.id)) + 1;
  }



  /**
   * Reads persisted local vote records safely.
   *
   * @returns An array of valid SurveyVote records or an empty array.
   */
  private readVotes(): SurveyVote[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_VOTES_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed as SurveyVote[] : [];
    } catch {
      return [];
    }
  }



  /**
   * Reads the complete local survey store safely.
   *
   * @returns A LocalSurveyStore containing surveys, questions and answers.
   */
  private readSurveyStore(): LocalSurveyStore {
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
}
