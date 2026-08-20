import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NewSurveyInput } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';

/**
 * Creates a validator that checks the trimmed text length.
 *
 * @param minLength Minimum number of non-whitespace characters.
 * @returns An Angular validator function.
 */
const trimmedMinLength = (minLength: number) => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    return value.length >= minLength ? null : { trimmedMinLength: true };
  };
};

/**
 * Rejects dates that are earlier than the current day.
 *
 * @param control Form control containing the selected date.
 * @returns A validation error for past dates, otherwise null.
 */
const notPastDate = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(control.value) < today ? { pastDate: true } : null;
};

@Component({
  selector: 'app-create-survey-component',
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey-component.html',
  styleUrl: './create-survey-component.scss',
})
/**
 * Manages the create-survey dialog, validation and dynamic questions and answers.
 */
export class CreateSurveyComponent {
  @ViewChild('surveyDialog') dialog?: ElementRef<HTMLDialogElement>;
  @Output() published = new EventEmitter<void>();

  private readonly document = inject(DOCUMENT);
  private readonly formBuilder = inject(FormBuilder);
  private readonly surveysData = inject(Surveys);

  readonly categories = ['Health Care', 'Business', 'Lifestyle', 'Education', 'Population', 'Money', 'Environment', 'Work'];
  readonly minEndDate = new Date().toISOString().slice(0, 10);
  categoryOpen = false;
  toastVisible = false;
  isSaving = false;
  publishError = '';

  surveyForm = this.formBuilder.group({
    surveyName: ['', [Validators.required, trimmedMinLength(5)]],
    endDate: ['', notPastDate],
    description: [''],
    category: ['', Validators.required],
    questions: this.formBuilder.array([this.createQuestion()]),
  });


  /**
   * Returns the question form array of the survey form.
   */
  get questions() {
    return this.surveyForm.controls.questions;
  }


  /**
   * Opens the survey dialog and prevents background scrolling.
   */
  open() {
    this.dialog?.nativeElement.showModal();
    this.document.body.style.overflow = 'hidden';
  }


  /**
   * Closes the create-survey dialog.
   */
  close() {
    this.dialog?.nativeElement.close();
  }


  /**
   * Resets the form and restores page scrolling after the dialog closes.
   */
  onDialogClose() {
    this.resetForm();
    this.document.body.style.removeProperty('overflow');
  }


  /**
   * Closes the dialog when the user clicks directly on its backdrop.
   *
   * @param event The click event raised by the dialog.
   */
  closeFromBackdrop(event: MouseEvent) {
    if (event.target === this.dialog?.nativeElement) this.close();
  }


  /**
   * Toggles the category picker and marks the control as touched when closing it.
   */
  toggleCategory() {
    this.categoryOpen = !this.categoryOpen;
    if (!this.categoryOpen) this.surveyForm.controls.category.markAsTouched();
  }


  /**
   * Selects a category and closes the category picker.
   *
   * @param category The category selected by the user.
   */
  selectCategory(category: string) {
    this.surveyForm.controls.category.setValue(category);
    this.categoryOpen = false;
  }


  /**
   * Returns the answer form array for a question.
   *
   * @param questionIndex Index of the question in the form.
   * @returns The answer controls belonging to the question.
   */
  getAnswers(questionIndex: number) {
    return this.questions.at(questionIndex).controls.answers as FormArray;
  }


  /**
   * Adds another question while the configured question limit is not reached.
   */
  addQuestion() {
    if (this.questions.length < 4) this.questions.push(this.createQuestion());
  }


  /**
   * Removes a question or resets the mandatory first question.
   *
   * @param questionIndex Index of the question to remove.
   */
  removeQuestion(questionIndex: number) {
    if (questionIndex === 0) this.questions.at(0).reset();
    else this.questions.removeAt(questionIndex);
  }


  /**
   * Adds an answer option to a question while the answer limit is not reached.
   *
   * @param questionIndex Index of the target question.
   */
  addAnswer(questionIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (answers.length < 6) answers.push(this.createAnswer());
  }


  /**
   * Removes an answer option while preserving the minimum required answers.
   *
   * @param questionIndex Index of the target question.
   * @param answerIndex Index of the answer to remove.
   */
  removeAnswer(questionIndex: number, answerIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (questionIndex === 0 && answerIndex < 2) answers.at(answerIndex).reset();
    else if (answers.length > 2) answers.removeAt(answerIndex);
  }


  /**
   * Converts a zero-based answer index to its alphabetical label.
   *
   * @param index Zero-based answer index.
   * @returns The corresponding uppercase letter.
   */
  getLetter(index: number) {
    return String.fromCharCode(65 + index);
  }


  /**
   * Validates and publishes the survey while preventing duplicate submissions.
   *
   * @returns A promise that resolves when publishing has finished.
   */
  async submit() {
    this.surveyForm.markAllAsTouched();
    if (this.surveyForm.invalid || this.isSaving) return;
    this.startPublishing();
    try {
      await this.surveysData.createSurvey(this.buildSurveyInput());
      this.finishPublish();
    } catch {
      this.publishError = 'Survey could not be published. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }


  private startPublishing() {
    this.publishError = '';
    this.isSaving = true;
  }


  private createAnswer() {
    return this.formBuilder.group({
      answerText: ['', [Validators.required, trimmedMinLength(1)]],
    });
  }


  private createQuestion() {
    return this.formBuilder.group({
      questionText: ['', [Validators.required, trimmedMinLength(5)]],
      allowMultiple: [false],
      answers: this.formBuilder.array([this.createAnswer(), this.createAnswer()]),
    });
  }


  /**
   * Converts the reactive form values into the survey payload used by the service.
   *
   * @returns A normalized survey creation payload.
   */
  private buildSurveyInput(): NewSurveyInput {
    const raw = this.surveyForm.getRawValue();
    return {
      title: (raw.surveyName ?? '').trim(),
      deadline: raw.endDate || this.defaultDeadline(),
      category: raw.category ?? '',
      description: raw.description?.trim() ?? '',
      questions: raw.questions.map((question) => ({
        questionText: (question.questionText ?? '').trim(),
        allowMultiple: question.allowMultiple ?? false,
        answers: question.answers.map((answer) => (answer.answerText ?? '').trim()),
      })),
    };
  }


  /**
   * Provides tomorrow as the fallback deadline for surveys without a selected date.
   *
   * @returns Tomorrow formatted as YYYY-MM-DD.
   */
  private defaultDeadline() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }


  private finishPublish() {
    this.published.emit();
    this.close();
    this.showToast();
  }


  private showToast() {
    this.toastVisible = true;
    window.setTimeout(() => (this.toastVisible = false), 3000);
  }


  /**
   * Restores the form to its initial question and answer structure.
   */
  private resetForm() {
    while (this.questions.length > 1) this.questions.removeAt(this.questions.length - 1);
    const answers = this.getAnswers(0);
    while (answers.length > 2) answers.removeAt(answers.length - 1);
    this.surveyForm.reset();
    this.surveyForm.markAsUntouched();
    this.categoryOpen = false;
    this.publishError = '';
  }
}
