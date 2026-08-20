import { Answer, Question, Survey } from '../interfaces/survey-interface';

export type LocalSurveyStore = {
  surveys: Survey[];
  questions: Question[];
  answers: Answer[];
};

export type LocalBuildState = {
  questionId: number;
  answerId: number;
  questions: Question[];
  answers: Answer[];
};
