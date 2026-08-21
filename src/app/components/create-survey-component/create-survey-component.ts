import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NewSurveyInput } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';

const SURVEY_NAME_MIN_LENGTH = 5;
const QUESTION_MIN_LENGTH = 5;
const ANSWER_MIN_LENGTH = 1;
const MAX_QUESTIONS = 4;
const MAX_ANSWERS = 6;
const MIN_ANSWERS = 2;
const INITIAL_QUESTION_COUNT = 1;
const FIRST_INDEX = 0;
const ISO_DATE_LENGTH = 10;
const TOAST_DURATION_MS = 3000;
const FIRST_ANSWER_CHARACTER = 'A';



/**
 * Typed form group used for one answer option.
 */
export type AnswerForm = FormGroup<{
  answerText: FormControl<string | null>;
}>;



/**
 * Typed form group used for one survey question.
 */
export type QuestionForm = FormGroup<{
  questionText: FormControl<string | null>;
  allowMultiple: FormControl<boolean | null>;
  answers: FormArray<AnswerForm>;
}>;



/**
 * Creates a validator that checks the trimmed text length.
 *
 * @param minLength Minimum number of non-whitespace characters.
 * @returns A ValidatorFn that reports trimmedMinLength when the value is too short.
 */
const trimmedMinLength = (minLength: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    return value.length >= minLength ? null : { trimmedMinLength: true };
  };
};



/**
 * Rejects dates that are earlier than the current day.
 *
 * @param control Form control containing the selected date.
 * @returns A ValidationErrors object for past dates, otherwise null.
 */
const notPastDate = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(control.value) < today ? { pastDate: true } : null;
};



/**
 * Manages the create-survey dialog, validation and dynamic questions and answers.
 */
@Component({
  selector: 'app-create-survey-component',
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey-component.html',
  styleUrl: './create-survey-component.scss',
})
export class CreateSurveyComponent {
  @ViewChild('surveyDialog') dialog?: ElementRef<HTMLDialogElement>;
  @Output() published = new EventEmitter<void>();

  private readonly document = inject(DOCUMENT);
  private readonly formBuilder = inject(FormBuilder);
  private readonly surveysData = inject(Surveys);

  readonly categories = ['Health Care', 'Business', 'Lifestyle', 'Education', 'Population', 'Money', 'Environment', 'Work'];
  readonly minEndDate = new Date().toISOString().slice(FIRST_INDEX, ISO_DATE_LENGTH);
  categoryOpen = false;
  toastVisible = false;
  isSaving = false;
  publishError = '';

  surveyForm = this.formBuilder.group({
    surveyName: ['', [Validators.required, trimmedMinLength(SURVEY_NAME_MIN_LENGTH)]],
    endDate: ['', notPastDate],
    description: [''],
    category: ['', Validators.required],
    questions: this.formBuilder.array([this.createQuestion()]),
  });



  /**
   * Provides the question controls stored in the survey form.
   *
   * @returns A FormArray containing the survey question groups.
   */
  get questions(): FormArray<QuestionForm> {
    return this.surveyForm.controls.questions;
  }



  /**
   * Opens the survey dialog and prevents background scrolling.
   */
  open(): void {
    this.dialog?.nativeElement.showModal();
    this.document.body.style.overflow = 'hidden';
  }



  /**
   * Closes the create-survey dialog.
   */
  close(): void {
    this.dialog?.nativeElement.close();
  }



  /**
   * Resets the form and restores page scrolling after the dialog closes.
   */
  onDialogClose(): void {
    this.resetForm();
    this.document.body.style.removeProperty('overflow');
  }



  /**
   * Closes the dialog when the user clicks directly on its backdrop.
   *
   * @param event The click event raised by the dialog.
   */
  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog?.nativeElement) this.close();
  }



  /**
   * Toggles the category picker and marks the control as touched when closing it.
   */
  toggleCategory(): void {
    this.categoryOpen = !this.categoryOpen;
    if (!this.categoryOpen) this.surveyForm.controls.category.markAsTouched();
  }



  /**
   * Selects a category and closes the category picker.
   *
   * @param category The category selected by the user.
   */
  selectCategory(category: string): void {
    this.surveyForm.controls.category.setValue(category);
    this.surveyForm.controls.category.markAsTouched();
    this.categoryOpen = false;
  }



  /**
   * Returns the answer form array for a question.
   *
   * @param questionIndex Index of the question in the form.
   * @returns A FormArray containing the answer groups for the selected question.
   */
  getAnswers(questionIndex: number): FormArray<AnswerForm> {
    return this.questions.at(questionIndex).controls.answers;
  }



  /**
   * Adds another question while the configured question limit is not reached.
   */
  addQuestion(): void {
    if (this.questions.length < MAX_QUESTIONS) this.questions.push(this.createQuestion());
  }



  /**
   * Removes a question or resets the mandatory first question.
   *
   * @param questionIndex Index of the question to remove.
   */
  removeQuestion(questionIndex: number): void {
    if (questionIndex === FIRST_INDEX) this.questions.at(FIRST_INDEX).reset();
    else this.questions.removeAt(questionIndex);
  }



  /**
   * Adds an answer option to a question while the answer limit is not reached.
   *
   * @param questionIndex Index of the target question.
   */
  addAnswer(questionIndex: number): void {
    const answers = this.getAnswers(questionIndex);
    if (answers.length < MAX_ANSWERS) answers.push(this.createAnswer());
  }



  /**
   * Removes an answer option while preserving the minimum required answers.
   *
   * @param questionIndex Index of the target question.
   * @param answerIndex Index of the answer to remove.
   */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.getAnswers(questionIndex);
    if (questionIndex === FIRST_INDEX && answerIndex < MIN_ANSWERS) answers.at(answerIndex).reset();
    else if (answers.length > MIN_ANSWERS) answers.removeAt(answerIndex);
  }



  /**
   * Converts a zero-based answer index to its alphabetical label.
   *
   * @param index Zero-based answer index.
   * @returns A string containing the corresponding uppercase answer letter.
   */
  getLetter(index: number): string {
    const firstCharacterCode = FIRST_ANSWER_CHARACTER.charCodeAt(FIRST_INDEX);
    return String.fromCharCode(firstCharacterCode + index);
  }



  /**
   * Validates and publishes the survey while preventing duplicate submissions.
   *
   * @returns A Promise that resolves when the publishing attempt has finished.
   */
  async submit(): Promise<void> {
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



  /**
   * Clears old errors and marks the current publish operation as active.
   */
  private startPublishing(): void {
    this.publishError = '';
    this.isSaving = true;
  }



  /**
   * Creates a required answer control for a question.
   *
   * @returns An AnswerForm containing one validated answer text control.
   */
  private createAnswer(): AnswerForm {
    return this.formBuilder.group({
      answerText: ['', [Validators.required, trimmedMinLength(ANSWER_MIN_LENGTH)]],
    });
  }



  /**
   * Creates the initial controls required for one survey question.
   *
   * @returns A QuestionForm containing text, voting mode and answer controls.
   */
  private createQuestion(): QuestionForm {
    return this.formBuilder.group({
      questionText: ['', [Validators.required, trimmedMinLength(QUESTION_MIN_LENGTH)]],
      allowMultiple: [false],
      answers: this.formBuilder.array([this.createAnswer(), this.createAnswer()]),
    });
  }



  /**
   * Converts the reactive form values into the survey payload used by the service.
   *
   * @returns A NewSurveyInput containing normalized survey and question values.
   */
  private buildSurveyInput(): NewSurveyInput {
    const raw = this.surveyForm.getRawValue();
    return {
      title: (raw.surveyName ?? '').trim(),
      deadline: raw.endDate || null,
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
   * Announces the published survey, closes the dialog and shows the success toast.
   */
  private finishPublish(): void {
    this.published.emit();
    this.close();
    this.showToast();
  }



  /**
   * Displays the publish confirmation for the configured duration.
   */
  private showToast(): void {
    this.toastVisible = true;
    window.setTimeout(() => (this.toastVisible = false), TOAST_DURATION_MS);
  }



  /**
   * Restores the form to its initial question and answer structure.
   */
  private resetForm(): void {
    while (this.questions.length > INITIAL_QUESTION_COUNT) this.questions.removeAt(this.questions.length - 1);
    const answers = this.getAnswers(FIRST_INDEX);
    while (answers.length > MIN_ANSWERS) answers.removeAt(answers.length - 1);
    this.surveyForm.reset();
    this.surveyForm.markAsUntouched();
    this.categoryOpen = false;
    this.publishError = '';
  }
}
