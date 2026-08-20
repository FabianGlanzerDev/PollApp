import { Question, SurveyVote } from '../interfaces/survey-interface';

/**
 * Creates a demo question with generated answer ids.
 */
const question = (
  id: number,
  survey: number,
  text: string,
  allowMultipleAnswers: boolean,
  answers: string[],
): Question => ({
  id,
  survey,
  question: text,
  allowMultipleAnswers,
  answers: answers.map((answer, index) => ({ id: id * 10 + index + 1, question: id, answer })),
});

/**
 * Demo questions and answer options used by the local fallback mode.
 */
export const DEMO_QUESTIONS: Question[] = [
  question(1011, 101, 'Which activity should we choose?', false, [
    'Dinner together', 'Escape room', 'Outdoor adventure', 'Bowling',
  ]),
  question(1012, 101, 'Which day works best?', false, [
    'Friday afternoon', 'Friday evening', 'Saturday afternoon', 'Saturday evening',
  ]),
  question(1013, 101, 'What matters most for the event?', true, [
    'Team bonding', 'Good food', 'Something new', 'A relaxed atmosphere',
  ]),
  question(1014, 101, 'How long should the event last?', false, [
    'Two hours', 'Half a day', 'Full day',
  ]),
  question(1021, 102, 'Which location do you prefer?', false, [
    'Vienna', 'Graz', 'Linz', 'Salzburg',
  ]),
  question(1022, 102, 'What should the workshop focus on?', true, [
    'Frontend', 'Backend', 'UI and UX', 'Teamwork',
  ]),
  question(1041, 104, 'How would you rate the summer event?', false, [
    'Excellent', 'Good', 'Okay', 'Needs improvement',
  ]),
];

/**
 * Returns cloned demo questions for a survey.
 *
 * @param surveyId Id of the demo survey.
 */
export const getDemoQuestions = (surveyId: number) =>
  DEMO_QUESTIONS.filter((item) => item.survey === surveyId).map((item) => ({
    ...item,
    answers: item.answers.map((entry) => ({ ...entry })),
  }));

/**
 * Returns cloned demo answers for a question.
 *
 * @param questionId Id of the demo question.
 */
export const getDemoAnswers = (questionId: number) => {
  const item = DEMO_QUESTIONS.find((entry) => entry.id === questionId);
  return item?.answers.map((entry) => ({ ...entry })) ?? [];
};

/**
 * Creates a demo vote record used by the statistics fallback.
 */
const vote = (surveyId: number, questionId: number, answerId: number, submissionId: string): SurveyVote => ({
  survey_id: surveyId,
  question_id: questionId,
  answer_id: answerId,
  submission_id: submissionId,
  created_at: new Date().toISOString(),
});

/**
 * Demo vote records used to display statistics without a backend.
 */
export const DEMO_STATISTICS: SurveyVote[] = [
  vote(102, 1021, 10211, 'demo-a'),
  vote(102, 1022, 10221, 'demo-a'),
  vote(102, 1021, 10212, 'demo-b'),
  vote(102, 1022, 10222, 'demo-b'),
  vote(102, 1021, 10211, 'demo-c'),
  vote(102, 1022, 10221, 'demo-c'),
  vote(102, 1021, 10213, 'demo-d'),
  vote(102, 1022, 10223, 'demo-d'),
  vote(104, 1041, 10411, 'past-a'),
  vote(104, 1041, 10412, 'past-b'),
  vote(104, 1041, 10411, 'past-c'),
];

/**
 * Returns cloned demo statistics for a survey.
 *
 * @param surveyId Id of the demo survey.
 */
export const getDemoStatistics = (surveyId: number) =>
  DEMO_STATISTICS.filter((entry) => entry.survey_id === surveyId).map((entry) => ({ ...entry }));
