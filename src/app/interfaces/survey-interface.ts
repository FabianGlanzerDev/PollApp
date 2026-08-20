export interface Survey {
  id: number;
  title: string;
  description: string;
  deadline: string;
  category: string;
}



export interface Question {
  id: number;
  question: string;
  allowMultipleAnswers: boolean;
  answers: Answer[];
  survey: number;
}



export interface Answer {
  id: number;
  answer: string;
  question: number;
}



export interface SurveySubmission {
  survey_id: number;
  question_id: number;
  answer_id: number;
  submission_id: string;
}



export interface SurveyVote extends SurveySubmission {
  created_at: string;
}



export interface NewSurveyQuestion {
  questionText: string;
  allowMultiple: boolean;
  answers: string[];
}



export interface NewSurveyInput {
  title: string;
  description: string;
  deadline: string;
  category: string;
  questions: NewSurveyQuestion[];
}
