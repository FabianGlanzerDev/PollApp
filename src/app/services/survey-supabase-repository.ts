import { SupabaseClient } from '@supabase/supabase-js';
import {
  Answer,
  NewSurveyInput,
  NewSurveyQuestion,
  Question,
  Survey,
  SurveySubmission,
  SurveyVote,
} from '../interfaces/survey-interface';



/**
 * Encapsulates Supabase reads and writes used by the survey service.
 */
export class SurveySupabaseRepository {
  /**
   * Creates a repository for an existing Supabase client.
   *
   * @param client Supabase client configured by the application environment.
   */
  constructor(private readonly client: SupabaseClient) { }



  /**
   * Loads all survey metadata from Supabase.
   *
   * @returns A Promise resolving to an array of Survey objects.
   */
  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await this.client.from('surveyDetail').select('*');
    if (error) throw error;
    return (data ?? []) as Survey[];
  }



  /**
   * Loads questions belonging to one survey in database order.
   *
   * @param surveyId Id of the survey whose questions are requested.
   * @returns A Promise resolving to an array of Question objects.
   */
  async getQuestions(surveyId: number): Promise<Question[]> {
    const query = this.client.from('questionDetail').select('*').eq('survey', surveyId);
    const { data, error } = await query.order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Question[];
  }



  /**
   * Loads answer options belonging to one question in database order.
   *
   * @param questionId Id of the question whose answers are requested.
   * @returns A Promise resolving to an array of Answer objects.
   */
  async getAnswers(questionId: number): Promise<Answer[]> {
    const query = this.client.from('answerDetail').select('*').eq('question', questionId);
    const { data, error } = await query.order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Answer[];
  }



  /**
   * Loads persisted votes belonging to one survey.
   *
   * @param surveyId Id of the survey whose votes are requested.
   * @returns A Promise resolving to an array of SurveyVote records.
   */
  async getStatistics(surveyId: number): Promise<SurveyVote[]> {
    const query = this.client.from('choosenDetail').select('*').eq('survey_id', surveyId);
    const { data, error } = await query.order('answer_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as SurveyVote[];
  }



  /**
   * Creates a survey and all related question and answer records.
   *
   * @param input Normalized survey creation data.
   * @returns A Promise resolving to the newly created Survey.
   */
  async createSurvey(input: NewSurveyInput): Promise<Survey> {
    const survey = await this.insertSurvey(input);
    const questionIds = await this.insertQuestions(survey.id, input.questions);
    await this.insertAnswers(input.questions, questionIds);
    return survey;
  }



  /**
   * Stores submitted vote records in Supabase.
   *
   * @param votes SurveySubmission records selected by the participant.
   * @returns A Promise that resolves after the vote records are inserted.
   */
  async submitVotes(votes: SurveySubmission[]): Promise<void> {
    const { error } = await this.client.from('choosenDetail').insert(votes);
    if (error) throw error;
  }



  /**
   * Inserts survey metadata and returns the generated record.
   *
   * @param input Normalized survey creation data.
   * @returns A Promise resolving to the inserted Survey.
   */
  private async insertSurvey(input: NewSurveyInput): Promise<Survey> {
    const payload = {
      title: input.title,
      deadline: input.deadline,
      category: input.category,
      description: input.description,
    };
    const response = await this.client.from('surveyDetail').insert(payload).select().single();
    if (response.error || !response.data) throw response.error;
    return response.data as Survey;
  }



  /**
   * Inserts questions and returns their generated ids.
   *
   * @param surveyId Id of the parent survey.
   * @param questions Question payloads to insert.
   * @returns A Promise resolving to an array of generated question ids.
   */
  private async insertQuestions(
    surveyId: number,
    questions: NewSurveyQuestion[],
  ): Promise<number[]> {
    const payload = questions.map((entry) => ({
      survey: surveyId,
      question: entry.questionText,
      allowMultipleAnswers: entry.allowMultiple,
    }));
    const response = await this.client.from('questionDetail').insert(payload).select('id');
    if (response.error || !response.data) throw response.error;
    return response.data.map((question) => Number(question.id));
  }



  /**
   * Inserts all answer options for newly created questions.
   *
   * @param questions Question payloads containing their answer text.
   * @param questionIds Generated question ids matching the payload order.
   * @returns A Promise that resolves after all answer records are inserted.
   */
  private async insertAnswers(
    questions: NewSurveyQuestion[],
    questionIds: number[],
  ): Promise<void> {
    const payload = questions.flatMap((entry, index) =>
      entry.answers.map((answer) => ({ question: questionIds[index], answer })),
    );
    const response = await this.client.from('answerDetail').insert(payload);
    if (response.error) throw response.error;
  }
}
