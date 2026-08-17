/**
 * @fileoverview Shows a survey
 * @module show-survey
 * @imports Component, signal is used for the decorator and the signal
 * @imports Inject, inject is used to inject the services
 * @imports DOCUMENT is used to access the document
 * @imports RouterLink, ActivatedRoute is used to navigate to the home view or to create view
 * @imports Surveys is used to import the surveys service
 * @imports Answer, Survey is used to import the survey interface
 * @imports Question is used to import the question interface
 * @imports computedStatistics is used to import the computed statistics interface
 * @imports CompletedSurvey is used to import the completed survey interface
 * @imports createClient is used to create a new client and use api URL
 * @imports computed is used to create a new computed property
 * @imports Router is used to navigate to the home view
 * 
 * @decorator This is a decorator and is used to give the class some extra functions without changing the class
 * @selector This selector is used in the main component to start the connection between the main component and the show survey component
 * @imports This imports the router link
 * @templateUrl This is the url of the template, which is the html file
 * @styleUrls This is the url of the style, which is the css file
 */
import { Component, Host, Signal } from '@angular/core';
import { Inject, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Surveys } from '../../services/surveys';
import { Answer, Survey } from '../../interfaces/survey-interface';
import { Question } from '../../interfaces/survey-interface';
import { computedStatistics } from '../../interfaces/survey-interface';
import { CompletedSurvey } from '../../interfaces/survey-interface';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { computed } from '@angular/core';
import { Router } from '@angular/router';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-show-survey-component',
  imports: [RouterLink],
  templateUrl: './show-survey-component.html',
  styleUrl: './show-survey-component.scss',
})
export class ShowSurveyComponent {
  /**
   * @param surveysData is used to inject the surveys service
   * @param route is used to inject the Router
   * @param document is used to access the document
   * @param id is used to get the id of the survey
   * @param letter is used to give each question a letter
   * @param supabase is used to create a new client and use api URL
   * @param router is used to navigate to the home view
   */
  surveysData = inject(Surveys);
  route = inject(ActivatedRoute);
  document;
  id: number = 1;
  letter: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey)
  router: Router;
  deadlineDate!: number;
  todayInMilliseconds = new Date().getTime();
  /**
   * @function survey here we use the getter Method to get the survey, and we look for the id in the url
   * with the paramMap we look in get Question function, which is also a getter Method, about the right questions
   * @returns the survey with the matched id from the url
   */
  get survey(): Survey | undefined {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === null) {
      return undefined;
    }
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return undefined;
    }
    this.idForQuestions = id
    return this.surveysData.surveys().find((survey) => survey.id === id);
  }

  getDeadlineDate(deadline: string) {
    this.deadlineDate = new Date(deadline).getTime();
    return this.deadlineDate
  }



  /**
   * @constructor sets the connection to the document and the router
   * @param idForQuestions is used to get the id of the survey
   */
  idForQuestions: number = 1
  allreadyFilled: Survey[] = []
  alreadyFilledSurveyIds: number[] = []
  expired = false

  constructor(@Inject(DOCUMENT) document: Document, router: Router) {
    this.document = document;
    this.router = router
    this.checkIfEndedOrAlreadyFilled()

  }
  public innerWidth: number = window.innerWidth;
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
  }



  checkIfEndedOrAlreadyFilled() {
    const storedIdsRaw = JSON.parse(localStorage.getItem('surveyId') || '[]') as Array<number | string>;
    this.alreadyFilledSurveyIds = Array.isArray(storedIdsRaw)
      ? storedIdsRaw.map(Number).filter((id): id is number => !Number.isNaN(id))
      : [];

    this.allreadyFilled = this.surveysData.surveys()
      .filter((survey) => this.alreadyFilledSurveyIds.includes(survey.id));
      

    if (this.id && +(((this.getDeadlineDate(this.survey!.deadline) - this.todayInMilliseconds)/86400000) +0.5).toFixed(0) < 0) {
      this.expired = true
    }
  }

  toggleStatistics() {
    let statisticsButton = this.document.querySelector('.statisticsButton')
    let statisticsButtonLabel = this.document.querySelector('.statisticsButton label')
    let statisticsWrapper = this.document.querySelector('.statisticsWrapperRightSide')
    let wrapper = statisticsWrapper as HTMLElement
    const beforeTop = this.switchStates(statisticsButton, statisticsButtonLabel, statisticsWrapper, wrapper)
    requestAnimationFrame(() => {
      const afterTop = statisticsButton?.getBoundingClientRect().top;
      if(afterTop === undefined || beforeTop === undefined) return
      const delta = afterTop - beforeTop;
      window.scrollBy({
        top: delta + 100,
        behavior: 'instant'
      });
    }
  );
}
switchStates(statisticsButton: Element | null, statisticsButtonLabel: Element | null, statisticsWrapper: Element | null, wrapper: HTMLElement) {
  if (!statisticsButton || !statisticsButtonLabel || !statisticsWrapper) {
    return}
  const beforeTop = statisticsButton.getBoundingClientRect().top;
  if (statisticsButtonLabel.innerHTML === 'See results') {
     this.openResults(statisticsButton, statisticsButtonLabel, wrapper);
  } else {
    this.closeResults(statisticsButton, statisticsButtonLabel, wrapper);
  }
return beforeTop
}

openResults(statisticsButton: Element, statisticsButtonLabel: Element, wrapper: HTMLElement) {
    statisticsButtonLabel.innerHTML = 'Close results';
    statisticsButton.classList.add('statisticsButtonRotate');
    wrapper.style.display = 'block';
  return statisticsButton
  }
  
  closeResults(statisticsButton: Element, statisticsButtonLabel: Element, wrapper: HTMLElement) {
    statisticsButtonLabel.innerHTML = 'See results';
    statisticsButton.classList.remove('statisticsButtonRotate');
    wrapper.style.display = 'none';
    return statisticsButton
  }



  /**
   * @function questions here we use the getter Method to get the questions
   * @returns the questions
   */
  get questions() {
    return this.surveysData.questions()
  }

  /**
   * @param questionId is used to collect the id of the question
   */
  questionId: number[] = [];

  /**
   * @function ngOnInit is executed when the component is initialized, this secures the live statistics, questions and the right survey itself
   * @param survey we catch the id from the url, check the value, form it to a number
   * @function getStatisticsData is used to get the statistics from the database, with the survey id out of the url
   * @function setRelatedQuestions is used to get the questions from the database, with the survey id out of the url
   * @param questionId is used to get the id of the question, done by iterating over the questions signal and catch the id
   * @function getAnswers is used to get the answers from the database
   * @returns 
   */
  async ngOnInit() {
    this.innerWidth = window.innerWidth;
    this.document.body.classList.add('show-body');
    const survey = this.route.snapshot.paramMap.get('id');
    if (!survey) {
      return;
    }
    const id = Number(survey);
    if (Number.isNaN(id)) {
      return;
    }
    this.id = id;
    // this.collectLocalAndDatabaseStatistic()
    await this.surveysData.getStatisticsData(id) // alle Einträge zu einer survey id
    await this.surveysData.setRelatedQuestions(this.id) // holt sich die related questions anhand der id
    this.questionId = this.questions.map((question) => {
      return question.id
    })
    await this.getAnswers()
  }


  /**
   * @function getAnswers is used to get the answers from the database
   * by calling service method, iterating over the question id, compare, with the list
   * and using the destructuring to get the answers, then paste them into the question box
   * @returns void
   */
  async getAnswers() {
    let answerArray: Answer[] = []
    for (let id of this.questionId) {
      answerArray = await this.surveysData.getRelatedAnswers(id) as Answer[]
      this.surveysData.questions.update((questions) =>
        questions.map((question) =>
          question.id === id ? { ...question, answers: answerArray } : question
        )
      )
    }
  }

  /**
   * @function ngOnDestroy is executed when the component is destroyed, this secures the live statistics
   * when the user leaves this component/site, it removes the class from the body and clears the choosenAnswerArray
   * @returns void
   */
  ngOnDestroy() {
    this.document.body.classList.remove('show-body');
  }


  /**
   * @function preventMultipleAnswers is used to prevent the user to choose multiple answers, if not allowed
   * @param event catches the click event from the user
   * @param question provides the right question for the function to work with
   * @returns void
   */
  preventMultipleAnswers(event?: Event, question?: Question) {
    if (!question?.allowMultipleAnswers) {
      const checkboxes = (event?.target as HTMLElement).closest('.questionWrapper')?.querySelectorAll('input[type="checkbox"]');
      if (checkboxes) {
        checkboxes.forEach((checkbox) => {
          if (checkbox !== event?.target) {
            (checkbox as HTMLInputElement).checked = false;
          }
        });
      }
    } else { return }
  }

  /**
   * @param collectAnswerIds is used to collect the choosen answers from the user as the name says
   * @param event catches the click event from the user, by selecting an answer
   * @param question provides the right question for the function to work with
   * @param answerId provides the right answer id for the function to work with
   * @param target tracks the event itself, if choosen or unchoosen, not the amount(of type :checked) to prevent error message with multiple answers
   * @returns void
   */
  choosenAnswerArray: CompletedSurvey[] = []
  submission_id = crypto.randomUUID()

  collectAnswerIds(event: Event, question: Question, answerId?: Number | undefined) {
    const questionblock = (event.target as HTMLElement).closest('.questionWrapper');
    if (!questionblock) {
      return;
    }
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.handleclickedAnswers(question, answerId)
    } else {
      this.handleUnchoosenAnswers(question, answerId)
    }
  }


  /**
   * @function handleclickedAnswers is used to collect the choosen answers from the user
   * @param question provides the right question for the function to work with
   * @param answerId provides the right answer id for the function to work with
   * @returns void
   */
  handleclickedAnswers(question: Question, answerId?: Number | undefined) {
    if (!question.allowMultipleAnswers) {
      this.choosenAnswerArray = this.choosenAnswerArray.filter((item) => (item.question_id !== question.id));
      this.choosenAnswerArray.push({
        survey_id: this.id,
        question_id: question.id,
        answer_id: answerId,
        submission_id: this.submission_id
      })
    } else {
      this.choosenAnswerArray.push({
        survey_id: this.id,
        question_id: question.id,
        answer_id: answerId,
        submission_id: this.submission_id
      })
    }
  }

  /**
   * @function handleunChoosenAnswers is used to remove the choosen answers from the choosenAnswerArray
   * in order to handle the unchoosen answers
   * @param question provides the right question for the function to work with
   * @param answerId provides the right answer id for the function to work with
   */
  handleUnchoosenAnswers(question: Question, answerId?: Number | undefined) {
    if (!question.allowMultipleAnswers) {
      this.choosenAnswerArray.splice(this.choosenAnswerArray.findIndex((item) => item.question_id === question.id), 1);
    } else {
      this.choosenAnswerArray.splice(this.choosenAnswerArray.findIndex((item) => item.answer_id === answerId), 1);
    }

  }

  nothingFilledOutyet = false
  submittDelay() {
    if(this.choosenAnswerArray.length === 0) {
      this.nothingFilledOutyet = true
      return
    }
    this.document.querySelector('.successMessageSubmitt')?.classList.add('active')
    setTimeout(() => {
      this.submitCompletedSurvey()
    }, 4000)
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 4500)
  }

  submittConfirmed = false
  /**
   * @function submitCompletedSurvey is used to submit the completed survey to the database
   * it checks the id, iterates over the choosenAnswerArray and inserts the data into the database with the help of supabase and a for loop
   * after 4000ms it navigates the user to the home page
 * @returns void
 */
  async submitCompletedSurvey() {
    const surveyId = this.getCurrentId()
    let id = surveyId as never
    this.checkLocalStorageAndSetCurrentId(id)
    this.checkIfAllQuestionsAnsweredAndShowErrorInCase();
    for (let i = 0; i < this.choosenAnswerArray.length; i++) {
      const { data, error } = await this.supabase
      .from('choosenDetail')
        .insert(this.choosenAnswerArray[i]);
    }
  }

  /**
   * @function getCurrentId is used to get the survey id from the url
   * translates the string to a number
   * @returns surveyId
   */
  getCurrentId(){
    const surveyId = this.route.snapshot.paramMap.get('id'); //survey id holen
    if (!surveyId) {
      return undefined;
    }
    return Number(surveyId);
  }

  /**
   * @function checkLocalStorageAndSetCurrentId is used to check if the localstorage is empty and set the current id as
   * "this user has already filled out this survey"
   * @param id 
   * @returns void
   */
  checkLocalStorageAndSetCurrentId(id: string) {
    let localstorageArr: string[] = JSON.parse(localStorage.getItem('surveyId') || '[]');
    if (!Array.isArray(localstorageArr)) {
      localstorageArr = [];
    }
    localstorageArr.push(id)
    localStorage.setItem('surveyId', JSON.stringify(localstorageArr));
    
  }
  
  /**
   * @function checkIfAllQuestionsAnsweredAndShowErrorInCase is used to check if all questions have been answered and show an error message if not
   * and hide the error message after 4000ms
   * @returns void
   */
  checkIfAllQuestionsAnsweredAndShowErrorInCase(){
    const answeredQuestionIds = new Set(
      this.choosenAnswerArray.map(answer => answer.question_id)
    );
    let questionamount = this.questions.length
    let choosen = answeredQuestionIds.size
    Number(questionamount);
    if (choosen < questionamount) {
      this.document.querySelector('.errorMessageSubmitt')?.classList.add('active')
      setTimeout(() => {
        this.document.querySelector('.errorMessageSubmitt')?.classList.remove('active')
      }, 4000)
      return
    }
  }

  /**
   * @param computedStatistics is used to compute the statistics of the survey
   * @param xTimesSurveyFilled is used to compute the amount of times the survey was filled
   * @param idsOfAnswer is used to compute the ids of the answers, in the html file we ask the length of each id, in order to know how often has the answer been choosen
   * @param statisticsData is used to get the data from the database
   * @param uniqueSubmissionIds is used to compute the unique submission ids, which is the amount of times the survey was filled
   * @returns void
   */
  xTimesSurveyFilled: number = 0
  computedStatistics: Signal<computedStatistics> = computed(() => {
    const statisticsData = this.surveysData.statistics()
    const uniqueSubmissionIds = new Set(statisticsData.map((item) => item.submission_id)).size
    return {
      xTimesSurveyFilled: this.choosenAnswerArray.length > 0 ? uniqueSubmissionIds : uniqueSubmissionIds,
      idsOfAnswer: statisticsData.map((item) => item.answer_id)

    }
  }

  )

  /**
   * @function hideSuccessMessageSubmitt is used to hide the success message
   * @returns void
   */
  hideSuccessMessageSubmitt() {
    this.document.querySelector('.successMessageSubmitt')?.classList.remove('active');
  }

}
