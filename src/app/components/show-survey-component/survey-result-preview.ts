import { SurveyVote } from '../../interfaces/survey-interface';

const RESULT_PERCENTAGE_SCALE = 100;



/**
 * Maps each question id to the currently selected answer ids.
 */
export type SelectedAnswers = Record<number, number[]>;



/**
 * Data required to calculate a live result preview before submission.
 */
export interface ResultPreviewState {
  statistics: SurveyVote[];
  selectedAnswers: SelectedAnswers;
  submissionId: string;
  canVote: boolean;
}



/**
 * Counts persisted participants and the current unsaved participant when applicable.
 *
 * @param state Current persisted and unsaved result state.
 * @returns A number containing the effective participant count.
 */
export function countParticipantsWithPreview(state: ResultPreviewState): number {
  const persisted = new Set(state.statistics.map((vote) => vote.submission_id)).size;
  return persisted + (hasPreviewParticipant(state) ? 1 : 0);
}



/**
 * Calculates one answer percentage including the current unsaved selection.
 *
 * @param answerId Id of the answer being evaluated.
 * @param state Current persisted and unsaved result state.
 * @returns A number containing the rounded live percentage.
 */
export function calculateAnswerPercentage(answerId: number, state: ResultPreviewState): number {
  const participants = countParticipantsWithPreview(state);
  if (participants === 0) return 0;
  const persisted = countPersistedAnswerVoters(answerId, state.statistics);
  const preview = shouldPreviewAnswer(answerId, state) ? 1 : 0;
  return Math.round(((persisted + preview) / participants) * RESULT_PERCENTAGE_SCALE);
}



/**
 * Counts unique persisted submissions for one answer.
 *
 * @param answerId Id of the answer being evaluated.
 * @param statistics Persisted vote records.
 * @returns A number containing the unique voter count.
 */
function countPersistedAnswerVoters(answerId: number, statistics: SurveyVote[]): number {
  const votes = statistics.filter((vote) => vote.answer_id === answerId);
  return new Set(votes.map((vote) => vote.submission_id)).size;
}



/**
 * Checks whether an unsaved selection should count as a temporary participant.
 *
 * @param state Current persisted and unsaved result state.
 * @returns A boolean that is true while an unsaved selection is active.
 */
function hasPreviewParticipant(state: ResultPreviewState): boolean {
  return state.canVote && !hasPersistedSubmission(state) && hasSelectedAnswer(state.selectedAnswers);
}



/**
 * Checks whether the current submission id is already persisted.
 *
 * @param state Current persisted and unsaved result state.
 * @returns A boolean that prevents double-counting after persistence.
 */
function hasPersistedSubmission(state: ResultPreviewState): boolean {
  return state.statistics.some((vote) => vote.submission_id === state.submissionId);
}



/**
 * Checks whether at least one answer is currently selected.
 *
 * @param selectedAnswers Current answer selections grouped by question.
 * @returns A boolean that is true when any answer is selected.
 */
function hasSelectedAnswer(selectedAnswers: SelectedAnswers): boolean {
  return Object.values(selectedAnswers).some((answerIds) => answerIds.length > 0);
}



/**
 * Checks whether one answer should include the current live preview vote.
 *
 * @param answerId Id of the answer being evaluated.
 * @param state Current persisted and unsaved result state.
 * @returns A boolean that is true when the answer belongs to the live preview.
 */
function shouldPreviewAnswer(answerId: number, state: ResultPreviewState): boolean {
  if (!hasPreviewParticipant(state)) return false;
  return Object.values(state.selectedAnswers).some((answerIds) => answerIds.includes(answerId));
}
