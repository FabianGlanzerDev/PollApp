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

const trimmedMinLength = (minLength: number) => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    return value.length >= minLength ? null : { trimmedMinLength: true };
  };
};

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

  surveyForm = this.formBuilder.group({
    surveyName: ['', [Validators.required, trimmedMinLength(5)]],
    endDate: ['', notPastDate],
    description: [''],
    category: ['', Validators.required],
    questions: this.formBuilder.array([this.createQuestion()]),
  });


  get questions() {
    return this.surveyForm.controls.questions;
  }


  open() {
    this.dialog?.nativeElement.showModal();
    this.document.body.style.overflow = 'hidden';
  }


  close() {
    this.dialog?.nativeElement.close();
  }


  onDialogClose() {
    this.resetForm();
    this.document.body.style.removeProperty('overflow');
  }


  closeFromBackdrop(event: MouseEvent) {
    if (event.target === this.dialog?.nativeElement) this.close();
  }


  toggleCategory() {
    this.categoryOpen = !this.categoryOpen;
    if (!this.categoryOpen) this.surveyForm.controls.category.markAsTouched();
  }


  selectCategory(category: string) {
    this.surveyForm.controls.category.setValue(category);
    this.categoryOpen = false;
  }


  getAnswers(questionIndex: number) {
    return this.questions.at(questionIndex).controls.answers as FormArray;
  }


  addQuestion() {
    if (this.questions.length < 4) this.questions.push(this.createQuestion());
  }


  removeQuestion(questionIndex: number) {
    if (questionIndex === 0) this.questions.at(0).reset();
    else this.questions.removeAt(questionIndex);
  }


  addAnswer(questionIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (answers.length < 6) answers.push(this.createAnswer());
  }


  removeAnswer(questionIndex: number, answerIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (questionIndex === 0 && answerIndex < 2) answers.at(answerIndex).reset();
    else if (answers.length > 2) answers.removeAt(answerIndex);
  }


  getLetter(index: number) {
    return String.fromCharCode(65 + index);
  }


  async submit() {
    this.surveyForm.markAllAsTouched();
    if (this.surveyForm.invalid || this.isSaving) return;
    this.isSaving = true;
    try {
      await this.surveysData.createSurvey(this.buildSurveyInput());
      this.finishPublish();
    } finally {
      this.isSaving = false;
    }
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


  private resetForm() {
    while (this.questions.length > 1) this.questions.removeAt(this.questions.length - 1);
    const answers = this.getAnswers(0);
    while (answers.length > 2) answers.removeAt(answers.length - 1);
    this.surveyForm.reset();
    this.surveyForm.markAsUntouched();
    this.categoryOpen = false;
  }
}
