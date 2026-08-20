/**
 * Basic survey metadata displayed in survey lists and detail views.
 */
export interface Survey {
  id: number;
  title: string;
  description: string;
  deadline: string;
  category: string;
}



/**
 * Survey question including its voting mode and available answers.
 */
export interface Question {
  id: number;
  question: string;
  allowMultipleAnswers: boolean;
  answers: Answer[];
  survey: number;
}



/**
 * Answer option belonging to a survey question.
 */
export interface Answer {
  id: number;
  answer: string;
  question: number;
}



/**
 * Vote record written when a participant submits an answer.
 */
export interface SurveySubmission {
  survey_id: number;
  question_id: number;
  answer_id: number;
  submission_id: string;
}



/**
 * Persisted vote record including its creation timestamp.
 */
export interface SurveyVote extends SurveySubmission {
  created_at: string;
}



/**
 * Question payload used while creating a new survey.
 */
export interface NewSurveyQuestion {
  questionText: string;
  allowMultiple: boolean;
  answers: string[];
}



/**
 * Complete normalized payload required to create a survey.
 */
export interface NewSurveyInput {
  title: string;
  description: string;
  deadline: string;
  category: string;
  questions: NewSurveyQuestion[];
}
