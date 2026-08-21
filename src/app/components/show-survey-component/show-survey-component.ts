import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Question, Survey, SurveySubmission } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from '../create-survey-component/create-survey-component';
import {
  ResultPreviewState,
  SelectedAnswers,
  calculateAnswerPercentage,
  countParticipantsWithPreview,
} from './survey-result-preview';

const COMPLETED_SURVEYS_KEY = 'pollapp-completed-surveys';
const DEFAULT_VIEWPORT_WIDTH = 1200;
const SUCCESS_REDIRECT_DELAY_MS = 1800;



/**
 * Displays a survey, handles voting and presents live result statistics.
 */
@Component({
  selector: 'app-show-survey-component',
  imports: [RouterLink, CreateSurveyComponent],
  templateUrl: './show-survey-component.html',
  styleUrl: './show-survey-component.scss',
})
export class ShowSurveyComponent implements OnInit, OnDestroy {
  @ViewChild(CreateSurveyComponent) createSurveyModal?: CreateSurveyComponent;

  readonly surveysData = inject(Surveys);
  readonly selectedAnswers = signal<SelectedAnswers>({});
  readonly validationMessage = signal('');
  readonly successVisible = signal(false);
  readonly submitting = signal(false);
  readonly alreadyCompleted = signal(false);
  readonly resultsVisible = signal(true);
  readonly innerWidth = signal(typeof window === 'undefined' ? DEFAULT_VIEWPORT_WIDTH : window.innerWidth);
  readonly participantCount = computed(() => this.countParticipants());
  readonly letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly submissionId = crypto.randomUUID();
  private redirectTimer?: number;
  private surveyId = 0;



  /**
   * Provides the survey selected by the current route parameter.
   *
   * @returns The matching Survey or undefined while no matching survey is available.
   */
  get survey(): Survey | undefined {
    return this.surveysData.surveys().find((survey) => survey.id === this.surveyId);
  }



  /**
   * Provides the questions loaded for the current survey.
   *
   * @returns An array of Question objects including their answer options.
   */
  get questions(): Question[] {
    return this.surveysData.questions();
  }



  /**
   * Indicates whether the survey deadline has passed.
   *
   * @returns A boolean that is true after the configured deadline.
   */
  get expired(): boolean {
    if (!this.survey?.deadline) return false;
    return Date.now() > new Date(`${this.survey.deadline}T23:59:59`).getTime();
  }



  /**
   * Indicates whether the current user can still submit a vote.
   *
   * @returns A boolean describing the current voting permission.
   */
  get canVote(): boolean {
    return Boolean(this.survey) && !this.expired && !this.alreadyCompleted();
  }



  /**
   * Loads survey content, completion state and current statistics for the route.
   *
   * @returns A Promise that resolves when the survey data has been loaded.
   */
  async ngOnInit(): Promise<void> {
    this.document.body.classList.add('show-body');
    this.surveyId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!this.surveyId) return;
    this.loadCompletionState();
    await Promise.all([
      this.surveysData.loadSurveyContent(this.surveyId),
      this.surveysData.getStatisticsData(this.surveyId),
    ]);
  }



  /** Removes page-specific styling and clears a pending redirect timer. */
  ngOnDestroy(): void {
    this.document.body.classList.remove('show-body');
    if (this.redirectTimer) window.clearTimeout(this.redirectTimer);
  }



  /** Updates the stored viewport width after a browser resize. */
  @HostListener('window:resize')
  onResize(): void {
    this.innerWidth.set(window.innerWidth);
  }



  /**
   * Formats a survey deadline for the detail view.
   *
   * @param deadline Survey deadline in YYYY-MM-DD format.
   * @returns A string containing the localized date or a no-deadline label.
   */
  formatDeadline(deadline: string | null): string {
    if (!deadline) return 'No deadline';
    const [year, month, day] = deadline.split('-');
    return `${day}.${month}.${year}`;
  }



  /** Opens the create-survey dialog from the survey detail page. */
  openCreateSurvey(): void {
    this.createSurveyModal?.open();
  }



  /** Toggles the visibility of the result section on smaller layouts. */
  toggleResults(): void {
    this.resultsVisible.update((visible) => !visible);
  }



  /**
   * Updates one answer selection and immediately recalculates the result preview.
   *
   * @param question The Question being answered.
   * @param answerId Id of the changed answer.
   * @param checked Whether the answer is selected.
   */
  updateAnswer(question: Question, answerId: number, checked: boolean): void {
    if (!this.canVote) return;
    const selections = { ...this.selectedAnswers() };
    const current = selections[question.id] ?? [];
    selections[question.id] = this.getNextSelection(question, current, answerId, checked);
    this.selectedAnswers.set(selections);
    this.validationMessage.set('');
  }



  /**
   * Checks whether an answer is selected for a question.
   *
   * @param questionId Id of the question.
   * @param answerId Id of the answer.
   * @returns A boolean that is true when the answer is currently selected.
   */
  isSelected(questionId: number, answerId: number): boolean {
    return this.selectedAnswers()[questionId]?.includes(answerId) ?? false;
  }



  /**
   * Validates the current choices and submits the completed survey.
   *
   * @returns A Promise that resolves after the submission attempt finishes.
   */
  async completeSurvey(): Promise<void> {
    if (!this.canVote || this.submitting()) return;
    if (!this.everyQuestionAnswered()) {
      this.showMissingAnswers();
      return;
    }
    await this.submitValidatedSurvey();
  }



  /**
   * Calculates the current percentage for an answer including the unsaved live selection.
   *
   * @param answerId Id of the answer to evaluate.
   * @returns A number containing the rounded participant percentage.
   */
  answerPercentage(answerId: number): number {
    return calculateAnswerPercentage(answerId, this.resultPreviewState());
  }



  /** Closes the success state by returning the user to the home page. */
  hideSuccessMessage(): void {
    this.returnToHome();
  }



  /**
   * Persists a validated submission and handles its success or error state.
   *
   * @returns A Promise that resolves after the submission attempt.
   */
  private async submitValidatedSurvey(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.surveysData.submitVotes(this.buildSubmission());
      this.finishSubmission();
    } catch {
      this.validationMessage.set('The survey could not be submitted. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }



  /**
   * Calculates the next selected answer ids for single- or multiple-choice questions.
   *
   * @param question The Question whose selection changes.
   * @param current Currently selected answer ids.
   * @param answerId Id of the changed answer.
   * @param checked Whether the answer is selected.
   * @returns An array containing the next selected answer ids.
   */
  private getNextSelection(question: Question, current: number[], answerId: number, checked: boolean): number[] {
    if (!question.allowMultipleAnswers) return checked ? [answerId] : [];
    if (checked && !current.includes(answerId)) return [...current, answerId];
    if (!checked) return current.filter((id) => id !== answerId);
    return current;
  }



  /**
   * Checks whether every displayed question currently has at least one answer.
   *
   * @returns A boolean that is true when every question has a selection.
   */
  private everyQuestionAnswered(): boolean {
    return this.questions.every((question) => (this.selectedAnswers()[question.id]?.length ?? 0) > 0);
  }



  /** Shows the validation message used for incomplete submissions. */
  private showMissingAnswers(): void {
    this.validationMessage.set('Please answer every question before submitting.');
  }



  /**
   * Converts all selected answers into database submission records.
   *
   * @returns An array of SurveySubmission records ready to be persisted.
   */
  private buildSubmission(): SurveySubmission[] {
    return this.questions.flatMap((question) =>
      (this.selectedAnswers()[question.id] ?? []).map((answerId) => ({
        survey_id: this.surveyId,
        question_id: question.id,
        answer_id: answerId,
        submission_id: this.submissionId,
      })),
    );
  }



  /** Stores the completed state and displays the success feedback. */
  private finishSubmission(): void {
    this.rememberCompletedSurvey();
    this.alreadyCompleted.set(true);
    this.successVisible.set(true);
    this.validationMessage.set('');
    this.scheduleHomeRedirect();
  }



  /** Schedules the automatic return to the survey overview. */
  private scheduleHomeRedirect(): void {
    this.redirectTimer = window.setTimeout(() => this.returnToHome(), SUCCESS_REDIRECT_DELAY_MS);
  }



  /**
   * Returns to the home page and clears a pending redirect timer.
   *
   * @returns A Promise that resolves after the navigation attempt.
   */
  private async returnToHome(): Promise<void> {
    if (this.redirectTimer) window.clearTimeout(this.redirectTimer);
    this.redirectTimer = undefined;
    this.successVisible.set(false);
    const navigated = await this.router.navigateByUrl('/', { replaceUrl: true });
    if (!navigated) window.location.assign(this.document.baseURI);
  }



  /** Restores whether the current browser already completed this survey. */
  private loadCompletionState(): void {
    const ids = this.readCompletedSurveyIds();
    this.alreadyCompleted.set(ids.includes(this.surveyId));
  }



  /** Persists the current survey id as completed in local storage. */
  private rememberCompletedSurvey(): void {
    const ids = new Set(this.readCompletedSurveyIds());
    ids.add(this.surveyId);
    localStorage.setItem(COMPLETED_SURVEYS_KEY, JSON.stringify([...ids]));
  }



  /**
   * Reads survey ids already completed in the current browser.
   *
   * @returns An array containing valid numeric survey ids.
   */
  private readCompletedSurveyIds(): number[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMPLETED_SURVEYS_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }



  /**
   * Builds the state required to calculate the live result preview.
   *
   * @returns An object containing persisted votes, current selections and submission state.
   */
  private resultPreviewState(): ResultPreviewState {
    return {
      statistics: this.surveysData.statistics(),
      selectedAnswers: this.selectedAnswers(),
      submissionId: this.submissionId,
      canVote: this.canVote,
    };
  }



  /**
   * Counts persisted participants and the current unsaved participant.
   *
   * @returns A number containing the participant count used by the live result preview.
   */
  private countParticipants(): number {
    return countParticipantsWithPreview(this.resultPreviewState());
  }
}
