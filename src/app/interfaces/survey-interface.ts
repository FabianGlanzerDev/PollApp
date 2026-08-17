
/**
 * Interfaces for the survey
 * @interface Survey the types of the surveys metadata
 */
export interface Survey {
  id: number;
  title: string;
  description: string;
  deadline: string;
  category: string;

}

/**
 * @interface Question the types of the questions
 * 
 */
export interface Question {
  id: number;
  question: string;
  allowMultipleAnswers: boolean;
  answers:Answer[];
  survey: number
}

/**
 * @interface Answer the types of the answers
 */
export interface Answer {
  id: number;
  answer: string;
  question: number;
}

/**
 * @interface CompletedSurvey the types of the completed survey
 */
export interface CompletedSurvey {
  survey_id: number;
  question_id: number;
  answer_id: Number | undefined;
  submission_id: string;
}

/**
 * @interface statistics the types of the statistics
 */
export interface statistics {
  survey_id: number;
  question_id: number;
  answer_id: number;
  created_at: string;
  submission_id: string;
  xTimesSurveyFilled: number
  idsOfAnswer: number[]
}

/**
 * @interface computedStatistics the types of the computed statistics, after the statistics are computed/changed
 */
export interface computedStatistics {
  xTimesSurveyFilled: number
  idsOfAnswer: number[]
}
