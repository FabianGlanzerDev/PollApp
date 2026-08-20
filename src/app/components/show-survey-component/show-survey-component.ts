import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Question, Survey, SurveySubmission } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from '../create-survey-component/create-survey-component';

/**
 * Maps each question id to the currently selected answer ids.
 */
type SelectedAnswers = Record<number, number[]>;

const COMPLETED_SURVEYS_KEY = 'pollapp-completed-surveys';

@Component({
  selector: 'app-show-survey-component',
  imports: [RouterLink, CreateSurveyComponent],
  templateUrl: './show-survey-component.html',
  styleUrl: './show-survey-component.scss',
})
/**
 * Displays a survey, handles voting and presents live result statistics.
 */
export class ShowSurveyComponent implements OnInit, OnDestroy {
  @ViewChild(CreateSurveyComponent) createSurveyModal?: CreateSurveyComponent;

  readonly surveysData = inject(Surveys);
  readonly selectedAnswers = signal<SelectedAnswers>({});
  readonly validationMessage = signal('');
  readonly successVisible = signal(false);
  readonly submitting = signal(false);
  readonly alreadyCompleted = signal(false);
  readonly resultsVisible = signal(true);
  readonly innerWidth = signal(typeof window === 'undefined' ? 1200 : window.innerWidth);
  readonly participantCount = computed(() => this.countParticipants());

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly submissionId = crypto.randomUUID();
  private redirectTimer?: number;
  private surveyId = 0;

  readonly letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');



  /**
   * Returns the survey currently selected by the route parameter.
   */
  get survey(): Survey | undefined {
    return this.surveysData.surveys().find((survey) => survey.id === this.surveyId);
  }



  /**
   * Returns the questions loaded for the current survey.
   */
  get questions() {
    return this.surveysData.questions();
  }



  /**
   * Indicates whether the survey deadline has passed.
   */
  get expired() {
    if (!this.survey?.deadline) return false;
    return Date.now() > new Date(`${this.survey.deadline}T23:59:59`).getTime();
  }



  /**
   * Indicates whether the current user can still submit a vote.
   */
  get canVote() {
    return Boolean(this.survey) && !this.expired && !this.alreadyCompleted();
  }



  /**
   * Loads survey content, completion state and current statistics for the route.
   *
   * @returns A promise that resolves when the survey data has been loaded.
   */
  async ngOnInit() {
    this.document.body.classList.add('show-body');
    this.surveyId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!this.surveyId) return;
    this.loadCompletionState();
    await Promise.all([
      this.surveysData.loadSurveyContent(this.surveyId),
      this.surveysData.getStatisticsData(this.surveyId),
    ]);
  }



  /**
   * Removes page-specific styling and clears a pending redirect timer.
   */
  ngOnDestroy() {
    this.document.body.classList.remove('show-body');
    if (this.redirectTimer) window.clearTimeout(this.redirectTimer);
  }



  @HostListener('window:resize')
  /**
   * Updates the stored viewport width after a browser resize.
   */
  onResize() {
    this.innerWidth.set(window.innerWidth);
  }



  /**
   * Formats a survey deadline for the detail view.
   *
   * @param deadline Survey deadline in YYYY-MM-DD format.
   * @returns A localized date or a no-deadline label.
   */
  formatDeadline(deadline: string | null) {
    if (!deadline) return 'No deadline';
    const [year, month, day] = deadline.split('-');
    return `${day}.${month}.${year}`;
  }


  /**
   * Opens the create-survey dialog from the survey detail page.
   */
  openCreateSurvey() {
    this.createSurveyModal?.open();
  }



  /**
   * Toggles the visibility of the result section on smaller layouts.
   */
  toggleResults() {
    this.resultsVisible.update((visible) => !visible);
  }



  /**
   * Updates the selected answer state for a question.
   *
   * @param question The question being answered.
   * @param answerId Id of the changed answer.
   * @param checked Whether the answer is selected.
   */
  updateAnswer(question: Question, answerId: number, checked: boolean) {
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
   * @returns True when the answer is currently selected.
   */
  isSelected(questionId: number, answerId: number) {
    return this.selectedAnswers()[questionId]?.includes(answerId) ?? false;
  }



  /**
   * Validates the current choices and submits the completed survey.
   *
   * @returns A promise that resolves after the submission attempt finishes.
   */
  async completeSurvey() {
    if (!this.canVote || this.submitting()) return;
    if (!this.everyQuestionAnswered()) return this.showMissingAnswers();
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
   * Calculates the participant percentage that selected an answer.
   *
   * @param answerId Id of the answer to evaluate.
   * @returns Rounded percentage of participating submissions.
   */
  answerPercentage(answerId: number) {
    const participants = this.participantCount();
    if (participants === 0) return 0;
    const votes = this.surveysData.statistics().filter((vote) => vote.answer_id === answerId);
    const voters = new Set(votes.map((vote) => vote.submission_id)).size;
    return Math.round((voters / participants) * 100);
  }



  /**
   * Closes the success state by returning the user to the home page.
   */
  hideSuccessMessage() {
    this.returnToHome();
  }



  private getNextSelection(question: Question, current: number[], answerId: number, checked: boolean) {
    if (!question.allowMultipleAnswers) return checked ? [answerId] : [];
    if (checked && !current.includes(answerId)) return [...current, answerId];
    if (!checked) return current.filter((id) => id !== answerId);
    return current;
  }



  private everyQuestionAnswered() {
    return this.questions.every((question) => (this.selectedAnswers()[question.id]?.length ?? 0) > 0);
  }



  private showMissingAnswers() {
    this.validationMessage.set('Please answer every question before submitting.');
  }



  /**
   * Converts all selected answers into database submission records.
   *
   * @returns Vote records ready to be persisted.
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



  private finishSubmission() {
    this.rememberCompletedSurvey();
    this.alreadyCompleted.set(true);
    this.successVisible.set(true);
    this.validationMessage.set('');
    this.scheduleHomeRedirect();
  }



  private scheduleHomeRedirect() {
    this.redirectTimer = window.setTimeout(() => this.returnToHome(), 1800);
  }



  private async returnToHome() {
    if (this.redirectTimer) window.clearTimeout(this.redirectTimer);
    this.redirectTimer = undefined;
    this.successVisible.set(false);

    const navigated = await this.router.navigateByUrl('/', { replaceUrl: true });
    if (!navigated) window.location.assign(this.document.baseURI);
  }



  private loadCompletionState() {
    const ids = this.readCompletedSurveyIds();
    this.alreadyCompleted.set(ids.includes(this.surveyId));
  }



  private rememberCompletedSurvey() {
    const ids = new Set(this.readCompletedSurveyIds());
    ids.add(this.surveyId);
    localStorage.setItem(COMPLETED_SURVEYS_KEY, JSON.stringify([...ids]));
  }



  private readCompletedSurveyIds(): number[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMPLETED_SURVEYS_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }



  /**
   * Counts unique submissions represented in the current statistics.
   *
   * @returns Number of unique survey participants.
   */
  private countParticipants() {
    return new Set(this.surveysData.statistics().map((vote) => vote.submission_id)).size;
  }
}
