/**
 * @fileoverview This is the service file, which is responsible for data traffic between supabase and the locale application itself
 * @import Injectable is used to inject the services on top level "root"
 * @import Signal is used to provide the signals core function
 * @import Survey is used to import the survey interface
 * @import createClient is used to create a new client and use api URL
 * @import RealtimeChannel is used to create a new realtime channel and access its core function
 * @import RealtimePostgresChangesPayload is used to create a new realtime postgres changes payload
 * @import Question is used to import the question interface
 * @import statistics is used to import the statistics interface
 * 
 */
import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { Survey } from '../interfaces/survey-interface';
import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Question } from '../interfaces/survey-interface';
import { statistics } from '../interfaces/survey-interface';


@Injectable({
  providedIn: 'root',
})
export class Surveys {

  // [x: string]: any;
  /**
   * @param supabase is used to create a new client and use api URL
   * @param surveys is used to provide the surveys signals core function
   * @param questions is used to provide the questions signals core function
   * @param statistics is used to provide the statistics signals core function
   * @param channels is is a core defnition of a realtime channel
   * @constructor the constructor sets a default value for the survey signal, executes the getSurveys function to porvide it in the home view
   * and executes the subscribeToTables function
   */

  supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey)
  surveys = signal<Survey[]>([]);
  questions = signal<Question[]>([]);
  statistics = signal<statistics[]>([]);

  channels: RealtimeChannel | undefined;

  constructor() {
    this.surveys.set([
      {
        "id": 0,
        "title": "erster Title",
        "description": "Erste Beschreibung",
        "deadline": "2023-12-31",
        "category": "erste Kategorie"
      }
    ])
    this.getSurveys()
    this["subscribeToTables"]()
  }
  
  /**
   * @function getSurveys is the function to provide all surveys in the home view
   * @param data is the data from the supabase
   * @param error is the error from the supabase
   * @returns surveys
   */
  async getSurveys() {
    const { data, error } = await this.supabase
      .from('surveyDetail')
      .select('*')
    if (error || !data) return
    this.surveys.set(data)

  }

  /**
   * @function setRelatedQuestions is used to provide the questions according to the survey id
   * @param id is the survey id
   * @param data is the data from the supabase
   * @param error is the error from the supabase
   * @returns questions this is the signal with all questions
   * @param questionDetail this is the table in supabase
   * @param answerId is a core definition of the answer id
   * @returns data
   */
  answerId: number = 1

  async setRelatedQuestions(id: number) {
    const { data, error } = await this.supabase
      .from('questionDetail')
      .select('*')
      .eq('survey', id)
    this.questions.set(data ?? []) 
    return data
  }



  /**
   * @function getRelatedAnswers is used to provide the answers according to the question id
   * @param answerId the id of a specific answer
   * @param data the recived data from supabase
   * @param answerDetail this is the table in supabase with all answers
   * @returns data | null
   */
  async getRelatedAnswers(answerId: number): Promise<object[]> {
    let { data, error } = await this.supabase
      .from('answerDetail')
      .select('*')
      .eq('question', answerId)
    return data as any | null
  }

  /**
   * 
   * @param surveyId this is the id of the current open survey
   * @param data the recived data from supabase
   * @param choosenDetail this is the table in supabase with all choosen answer from the user
   * @param statistics this is the local signal to provide a reaktive storage for statistics data
   * @returns data | null
   */
  async getStatisticsData(surveyId: number) {   //holt alle einträge mit der bestimmten survey id
    let { data, error } = await this.supabase
      .from('choosenDetail')
      .select('*')
      .eq('survey_id', surveyId)
      .order('answer_id', { ascending: true })
    data ? this.statistics.set(data) : this.statistics.set([])
    return data as statistics[] | null
  }

  

  

/**
 * @function subscribeToTables is used to subscribe to the realtime channel(s)
 * @param channels a predefined variable with a type to provide an global scope for the realtime channel
 * @param event all CRUD events from the realtime channel
 * @param payload the recived payload/change
 * @param schema the schema of the realtime channel - public or private
 * @param table the specific table of the realtime channel
 * @function getSurveys is used to execute the getSurveys function after a realtime change had been made
 * @function getStatisticsData is used to execute the getStatisticsData function after a realtime change had been made
 * in order to update the statistics
 */
  async subscribeToTables() {
    this.channels = this.supabase.channel('custom-all-channels')
    .on('postgres_changes',
      {event: '*', schema: 'public', table: 'surveyDetail' },
      (payload: RealtimePostgresChangesPayload<Survey>) => {
        this.getSurveys()}
    ).on('postgres_changes',
        { event: '*', schema: 'public', table: 'choosenDetail' },
        (payload: { new?: { id?: number; answer_id?: number, question_id?: number, survey_id?: number } }) => {
          this.getStatisticsData(payload.new?.survey_id || 0)      
          },) 
      .subscribe()
  }
  
  /**
   * @function ngOnDestroy is used to unsubscribe from the realtime channel
   * and is executed if the user leaves this component
   */
  ngOnDestroy() {
    this.supabase.removeChannel(this.channels as RealtimeChannel);

  }
}


