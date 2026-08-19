/**
 * @fileoverview Creates a new survey
 * @module create-survey
 * @requires create-survey
 * @param Component is used to create a new survey
 * @param RouterLink is used to navigate to the home view
 * @param AbstractControl is used to create a new survey
 * @param DOCUMENT is used to access the document
 * @param CommonModule is used to import common modules
 * @param ReactiveFormsModule is used to import reactive forms
 * @param FormGroup is used to create a new form group
 * @param FormControl is used to create a new form control
 * @param Validators is used to validate the form
 * @param FormArray is used to create a new form array
 * @param Router is used to navigate to the home view
 * @param type FormQuestion is used to give a type to the form
 * @Component this is a decorator and is used to give the class some extra functions without changing the class
 * @selector this selector is used in the main component to start the connection between the main component and the create survey component
 * @standalone this says it is a stand alone component
 * @imports this imports the common module, reactive forms, router link
 * @templateUrl this is the url of the template, which is the html file
 * @styleUrls this is the url of the style, which is the css file
 */
import { Component, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AbstractControl } from '@angular/forms';
import { DOCUMENT, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray } from '@angular/forms';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
export type FormQuestion = {
  question: string;
  allowMultipleAnswers: boolean;
  answers: string[];
  id: number;
}

@Component({
  selector: 'app-create-survey-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-survey-component.html',
  styleUrls: ['./create-survey-component.scss'],
})
export class CreateSurveyComponent {
  /**
   * @supabase this is the supabase client and is used to connect to the database/for all CRUD Operations
   * @param categoryArray this is the array of categories, which is used to display the categories
   * @param document this is the document, which is used to access the document
   * @param surveyName this is the name of the survey, which is used to display the name of the survey
   * @param endDate this is the end date of the survey, which is used to display the end date of the survey
   * @param category this is the category of the survey, which is used to display the category of the survey
   * @param description this is the description of the survey, which is used to display the description of the survey
   * @param questions this is used to display the questions of the survey
   * @param letter this is the array of letters, which is used to display the letters of the questions and give each of them a letter
   * @param router this is the router, which is used to navigate to the home view
   * 
   * @constructor this is the constructor, which is used to initialize the class
   */
  supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey)
  categoryArray: string[] = ['health-Care', 'business', 'lifestyle', 'education', 'population', 'money', 'Environment', 'Work'];

  document: Document;
  surveyName: FormControl<string | null>;
  endDate: FormControl<string | null>;
  category: FormControl<string | null>;
  description: FormControl<string | null>;
  questions: FormArray<FormGroup>;
  letter: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  router: Router
  today = new Date();
  constructor(@Inject(DOCUMENT) document: Document, router: Router) {
    this.router = router
    this.document = document;
    this.surveyName = new FormControl<string | null>('', { validators: [Validators.required, Validators.minLength(3)] });
    this.endDate = new FormControl<string | null>('', { validators: [Validators.required] });
    this.category = new FormControl<string | null>('');
    this.description = new FormControl<string | null>('', { validators: [Validators.required, Validators.minLength(3)] });
    this.questions = new FormArray([this.createQuestion()],) as FormArray<FormGroup>;

  }

/**
 * @function ngOnInit is executed when the component is initialized
 * @returns void
 */
  ngOnInit() {
    this.document.body.classList.add('survey-body');
  }

  /**
   * @function ngOnDestroy is executed when the component is destroyed/when the user leaves this component
   * @returns void
   */
  ngOnDestroy() {
    this.document.body.classList.remove('survey-body');
  }

  /**
   * @function addQuestion is executed when the user wants to add a new question
   * @returns void
   */
  addQuestion() {
    this.questions.push(this.createQuestion());
  }

  /**
   * @funtion getAnswers this is a helper function that returns the answers of a specific question
   * @param questionIndex it holds the index of the question
   * @returns 
   */
  getAnswers(questionIndex: number): FormArray<FormControl<string | null>> {
    return this.questions.at(questionIndex).get('answers') as FormArray<FormControl<string | null>>;
  }

  /**
   * @function addAnswer is executed when the user wants to add one more answer to the block
   * @param questionIndex it holds th index of the question
   * @returns void
   */
  addAnswer(questionIndex: number) {
    this.getAnswers(questionIndex).push(this.createAnswer());
  }

  /**
   * 
   * @param questionIndex it holds the index of the question
   * @param answerIndex it holds the index of the specific answer
   * @returns void
   */
  deleteAnswer(questionIndex: number, answerIndex: number) {
    const answers = this.getAnswers(questionIndex);
    if (answerIndex >= 0 && answerIndex < answers.length) {
      answers.reset();
    }
  }

/**
 * @param isDropdownOpen it holds the state of the dropdown
 */
  isDropdownOpen = false;

  /**
   * @function toggleDropDown is executed when the user wants to open the dropdown
   * @returns void
   */
  toggleDropDown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  
  /**
   * 
   * @function submit is executed when the user wants to submit the form/survey
   * and is splittet into multiple functions Metadata, questions and answers
   * @returns void
   */
  async submit() {
    const validate: boolean = this.validateSurveyForm()  
    if (!validate) {
      return;
    }
    const survey = await this.uploadMainSurveyData()
    const formQuestions = this.questions.getRawValue() as FormQuestion[]; 
    const questionsData = await this.uploadQuestionsData(survey, formQuestions)  
    let data = questionsData as FormQuestion[]
    await this.uploadAnswersData(data, formQuestions)
    this.document.querySelector('.successMessage')?.classList.add('visible');
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000)
}

/**
 * @function validateSurveyForm is executed when the user wants to submit the form
 * and checks if the form is valid, no forgotten fields
 * @param surveyName it holds the name of the survey
 * @param category it holds the category of the survey
 * @param questions it holds the questions of the survey
 * @returns boolean
 */
validateSurveyForm(): boolean {
  if (this.surveyName.invalid ) {
    this.surveyName.markAsTouched();
    return false}
  if (this.category.invalid) {
    this.category.markAsTouched();
    return false}
  if (this.questions.invalid) {
    this.questions.controls.forEach((question) => {
      question.get('question')?.markAsTouched();
      let answers = question.get('answers') as FormArray<FormControl<string | null>>
      answers.controls.forEach((answer) => {
        answer.markAsTouched();
      })
    }); return false}
  return true}

  /**
   * 
   * @param noDateSurvey for the specific case, the user does not want to set a deadline
   */
noDateSurvey = new Date();

/**
 * @function uploadMainSurveyData is executed when the user wants to submit the form
 * and uploads the metadata of the survey
 * @param payload it holds the metadata
 * @param surveyError it holds the error, can be logged out if neccessary
 * @param survey it holds the survey Data
 * @param endDate it holds the deadline
 * @operator noDateSurvey it take the current date and sets the deadline to the next day
 * @returns survey
 */
async uploadMainSurveyData(){
    const payload = {
      title: this.surveyName.value,
      deadline: this.endDate.value ? this.endDate.value : new Date(this.noDateSurvey.setDate(this.noDateSurvey.getDate() + 1)),
      category: this.category.value,
      description: this.description.value,
    }
    const { data: survey, error: surveyError } = await this.supabase.
    from('surveyDetail')
      .insert(payload)
      .select()
      .single()
    
    if (surveyError) throw surveyError
    return survey
  }

  /**
   * @function uploadQuestionsData is executed when the user wants to submit the form
   * and uploads the questions, the survey id and the boolean for multiple answers
   * @param survey the id of the survey to look for the right questions
   * @param formQuestions it holds the questions itself, to upload them
   * @param questions it collects the result from the object
   * @returns questionsData
   */
  async uploadQuestionsData(survey: { id: number; }, formQuestions: FormQuestion[]){ 
      const questions = formQuestions.map(questions => ({
        survey: survey.id,
        question: questions.question,
        allowMultipleAnswers: questions.allowMultipleAnswers,
      }));
      const { data: questionsData, error } = await this.supabase.
        from('questionDetail')
        .insert(questions)
        .select()
      if (error) throw error
      return questionsData;
  }

  /**
   * @function uploadAnswersData is executed when the user wants to submit the form
   * and uploads the answers, the question id and the answer
   * @param data the id of the question to look for the right answers
   * @param formQuestions it holds the questions itself, to upload them
   * @returns void
   */
  async uploadAnswersData(data: FormQuestion[], formQuestions: FormQuestion[]) {
      const answers = formQuestions.flatMap((question, index: number) => {
        const questionId = data ? data[index].id : null;
        return question.answers.map((answer: string) => ({
          question: questionId,
          answer: answer
        }));
      });
      const answerData = await this.supabase.
        from('answerDetail')
        .insert(answers)
        .select()
  }

  /**
   * @function createAnswer creates a new answer, by creating a new FormControl
   * @returns FormControl mit Validator
   */
  createAnswer(): FormControl<string | null> {
    return new FormControl<string | null>('', { validators: [Validators.required, Validators.minLength(3)] });
  }
  
  /**
   * @function createQuestion creates a new question, by creating a new FormGroup
   * @returns FormGroup (package with question and answers and boolean for multiple answers)
   */
  createQuestion(): FormGroup {
    return new FormGroup({
      question: new FormControl<string>('', { validators: [Validators.required, Validators.minLength(3)] }),
      allowMultipleAnswers: new FormControl<boolean>(false),
      answers: new FormArray<FormControl<string | null>>([
        this.createAnswer(),
        this.createAnswer()
      ])
    });
  }

  /**
   * @function asFormControl changes the type of the control
   * @param control changes the type of the control to a FormControl
   * @returns control as FormControl
   */
  asFormControl(control: AbstractControl | null): FormControl {
    return control as FormControl;
  }

  /**
   * @function categorySelected is executed when the user wants to choose a category
   * @function toggleDropDown is executed when the User selects a category to close the dropdown afterwords
   * @param category holds the category the User has choosen
   * @returns void
   */
  categorySelected(category: string) {
    this.category.setValue(category);
    this.document.querySelectorAll('.dropdownButton')?.forEach((button: Element) =>
      button.innerHTML = `${category}<img src=\"assets/icons/arrow-drop-down.svg\">`

    );
    this.toggleDropDown();
  }

  /**
   * @function hideSuccessMessage is executed when the user wants to close the success message
   * @returns void
   */
  hideSuccessMessage(){
    this.document.querySelector('.successMessage')?.classList.remove('visible');
  }

  /**
   * @function stopThePropagation is used to stop the propagation of the click event
   * @param event click Event
   * @returns void
   */
  stopThePropagation(event: Event) {
    event.stopPropagation();
  }

  /**
   * @function toggleOnlyClose is executed when the user wants to close the dropdown, near the button or further away
   * @returns void
   */
  toggleOnlyClose() {
    this.isDropdownOpen = false;
  }

}
