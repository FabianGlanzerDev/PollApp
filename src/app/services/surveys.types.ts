import { Answer, Question, Survey } from '../interfaces/survey-interface';



/**
 * Complete local fallback data stored in the browser.
 */
export type LocalSurveyStore = {
  surveys: Survey[];
  questions: Question[];
  answers: Answer[];
};



/**
 * Mutable counters and collections used while building a local survey.
 */
export type LocalBuildState = {
  questionId: number;
  answerId: number;
  questions: Question[];
  answers: Answer[];
};
