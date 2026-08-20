import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Question, Survey, SurveySubmission } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from '../create-survey-component/create-survey-component';

type SelectedAnswers = Record<number, number[]>;

const COMPLETED_SURVEYS_KEY = 'pollapp-completed-surveys';

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
  readonly innerWidth = signal(typeof window === 'undefined' ? 1200 : window.innerWidth);
  readonly participantCount = computed(() => this.countParticipants());

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly submissionId = crypto.randomUUID();
  private redirectTimer?: number;
  private surveyId = 0;

  readonly letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');



  get survey(): Survey | undefined {
    return this.surveysData.surveys().find((survey) => survey.id === this.surveyId);
  }



  get questions() {
    return this.surveysData.questions();
  }



  get expired() {
    if (!this.survey) return false;
    return Date.now() > new Date(`${this.survey.deadline}T23:59:59`).getTime();
  }



  get canVote() {
    return Boolean(this.survey) && !this.expired && !this.alreadyCompleted();
  }



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



  ngOnDestroy() {
    this.document.body.classList.remove('show-body');
    if (this.redirectTimer) window.clearTimeout(this.redirectTimer);
  }



  @HostListener('window:resize')
  onResize() {
    this.innerWidth.set(window.innerWidth);
  }



  openCreateSurvey() {
    this.createSurveyModal?.open();
  }



  toggleResults() {
    this.resultsVisible.update((visible) => !visible);
  }



  updateAnswer(question: Question, answerId: number, checked: boolean) {
    if (!this.canVote) return;
    const selections = { ...this.selectedAnswers() };
    const current = selections[question.id] ?? [];
    selections[question.id] = this.getNextSelection(question, current, answerId, checked);
    this.selectedAnswers.set(selections);
    this.validationMessage.set('');
  }



  isSelected(questionId: number, answerId: number) {
    return this.selectedAnswers()[questionId]?.includes(answerId) ?? false;
  }



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



  answerPercentage(answerId: number) {
    const participants = this.participantCount();
    if (participants === 0) return 0;
    const votes = this.surveysData.statistics().filter((vote) => vote.answer_id === answerId);
    const voters = new Set(votes.map((vote) => vote.submission_id)).size;
    return Math.round((voters / participants) * 100);
  }



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



  private countParticipants() {
    return new Set(this.surveysData.statistics().map((vote) => vote.submission_id)).size;
  }
}
