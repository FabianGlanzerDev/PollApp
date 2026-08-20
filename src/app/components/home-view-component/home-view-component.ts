/**
 * @imports Component, Inject, inject, computed, signal is used to import the necessary modules
 * @module home-view
 * @imports Surveys is used to import the surveys service
 * @imports RouterLink is used to import the router link
 * @imports DOCUMENT is used to import the document and use it
 * @imports Survey is used to import the survey interface
 * @component is a decorator and is used to give the class some extra functions without changing the class
 * @selector this selector is used in the main component to start the connection between the main component and the home view component
 * @imports this imports the router link
 * @templateUrl this is the url of the template, which is the html file
 * @styleUrls this is the url of the style, which is the css file
 */
import { Component, Inject, inject, computed, signal } from '@angular/core';
import { Surveys } from '../../services/surveys';
import { RouterLink } from '@angular/router';
import { Hero } from '../hero/hero';
import { DOCUMENT } from '@angular/common'
import { Survey } from '../../interfaces/survey-interface';


@Component({
  selector: 'app-home-view-component',
  imports: [RouterLink, Hero],
  templateUrl: './home-view-component.html',
  styleUrl: './home-view-component.scss',

})
export class HomeViewComponent {
  /**
   * @categoryArray is an array of strings that contains the categories of the surveys
   * @surveysData is a signal that contains the surveys
   * @document is to access the document
   * @today is the current date
   * @todayInMilliseconds is the current date in milliseconds
   * @deadlineToday is the deadline today
   * @deadlineDate is the deadline date
   * @in30Days is the deadline in 30 days
   * @deadline is only a variable to hold the deadline and is type number
   * @isWithinNext30Days is a boolean that is true if the deadline is within the next 30 days
   * @dropdownOpen is a boolean that is true if the dropdown is open
   * 
   * @constructor it is used to initialize the class
   * @param document it is used to access the document
   */
  categoryArray: string[] = ['all surveys', 'health-Care', 'business', 'lifestyle', 'education', 'population', 'money', 'Environment', 'Work'];
  surveysData = inject(Surveys);
  document;
  today = new Date();
  todayInMilliseconds = new Date().getTime();
  deadlineToday = new Date().getDay();
  deadlineDate!: number;
  in30Days = new Date();
  deadline!: number;
  isWithinNext30Days!: boolean;
  dropdownOpen = false
  constructor(@Inject(DOCUMENT) document: Document) {
    this.document = document
  }

  /**
   * @function ngOnInit is executed when the component is initialized/opened
   * @returns void
   */
  ngOnInit() {
    this.document.body.classList.add('home-body');

  }

  /**
   * @function ngOnDestroy is executed when the component is destroyed/when the user leaves this component
   * @returns void
   */
  ngOnDestroy() {
    this.document.body.classList.remove('home-body');
  }

  /**
   * @function filterSurveys is used to filter all survey, their deadline is within the next 30 days
   * @returns surveysData
   */
  filterSurveys() {
    this.in30Days.setDate(this.today.getDate() + 30);
    if (this.surveysData) {
      return this.surveysData.surveys().filter((survey) => {
        const deadline = new Date(survey.deadline);
        return deadline >= this.today && deadline <= this.in30Days;
      }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    }
    return this.surveysData;
  }

  /**
   * @function filterSurveyForBottomView is used to filter the surveys for the bottom view, only active surveys, sorted by deadline
   * uses variables to filter the surveys, by deadline, today, sets the hours to 0 and calculates the time difference
   * @returns []
   */
  filterSurveyForBottomView() {
    const todayStart = new Date(this.today);
    todayStart.setHours(0, 0, 0, 0);
    if (this.surveysData) {
      return this.surveysData.surveys().filter((survey) => {
        const [year, month, day] = survey.deadline.split('-').map(Number);
        const deadlineright = new Date(year, month - 1, day);
        const deadline = new Date(survey.deadline).getTime() >= todayStart.getTime();
        return deadlineright.getTime() >= todayStart.getTime();
      }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    }
    return [];
  }

  /**
   * @function getDeadlineDate is used to get the deadline date in milliseconds in order to sort and filter the surveys
   * @param deadline is the actual deadline as a date
   * @returns deadlineDate
   */
  getDeadlineDate(deadline: string) {
    this.deadlineDate = new Date(deadline).getTime();
    return this.deadlineDate
  }


  /**
   * @function toggleFilterOption is used to toggle the dropdown (open or close it)
   * @returns void
   */
  toggleFilterOption() {
    this.dropdownOpen = !this.dropdownOpen
    document.querySelector('.sortedBy img')?.classList.toggle('rotate');
  }
  /**
   * @function toggleOnlyClose is used to close the dropdown, but not open it
   * @returns void
   */
  toggleOnlyClose() {
      if(!this.dropdownOpen) return
      this.dropdownOpen = false
      document.querySelector('.sortedBy img')?.classList.toggle('rotate');
  }

  /**
   * @function filterThisCategory is used to filter the surveys by category
   * @param category is the category of the survey
   * @returns filteredSurveys (not the returned value, but the filtered surveys)
   */
  filteredSurveys: Survey[] = [];
  noSurveyFound: boolean = false
  filterThisCategory(category: string) {
    if (category === 'all surveys') {
      this.dropdownOpen = false;
      this.noSurveyFound = false;
      this.filteredSurveys = this.filterSurveyForBottomView()
    } else if (this.surveysData.surveys().filter((survey) => survey.category === category && this.getDeadlineDate(survey.deadline) >= this.todayInMilliseconds).length !== 0) {
      this.dropdownOpen = false;
      this.noSurveyFound = false;
      this.filteredSurveys = this.surveysData.surveys().filter((survey) => survey.category === category && this.getDeadlineDate(survey.deadline) >= this.todayInMilliseconds);
    } else if(this.surveysData.surveys().filter((survey) => survey.category === category && this.getDeadlineDate(survey.deadline) >= this.todayInMilliseconds).length === 0) {
      this.dropdownOpen = false;
      this.filteredSurveys = []
      this.noSurveyFound = true
      
    }
  };

  
  
  /**
   * @function filterActiveSurveys is used to filter the active surveys, survey deadline is within the next 30 days
   * @returns filteredSurveys
   */
  filterActiveSurveys(): Survey[] {
    let activeSurveys: Survey[] = this.surveysData.surveys().filter((survey) => {
      const deadline = new Date(survey.deadline);
      return deadline >= this.today;
    }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

    this.filteredSurveys = activeSurveys
    document.querySelectorAll('.activeSurvey')?.forEach((button: Element) => {
      let btn = button as HTMLButtonElement
      btn.style.backgroundColor = 'rgba(255, 183, 112, 1)'
    });
    document.querySelectorAll('.pastSurvey')?.forEach((button: Element) => {
      let btn = button as HTMLButtonElement
      btn.style.backgroundColor = 'rgba(255, 207, 161, 1)'
    });
    return this.filteredSurveys
  }

  /**
   * @function filterPastSurveys is used to filter the past surveys, the deadline is in the past
   * @param isDisabled is a boolean that is true if the button is disabled, this blocks the user from view this survey
   * @returns filteredSurveys
   */
  isDisabled = false
  filterPastSurveys() {
    let pastSurveys = this.surveysData.surveys().filter((survey) => {
      let exatToday = this.today.setHours(0, 0, 0, 0);
      const deadline = new Date(survey.deadline).getTime();
      return deadline < exatToday;
    })
    this.isDisabled = true;
    this.filteredSurveys = pastSurveys
    document.querySelectorAll('.pastSurvey')?.forEach((button: Element) => {
      let btn = button as HTMLButtonElement
      btn.style.backgroundColor = 'rgba(255, 183, 112, 1)'
    }
    );
    document.querySelectorAll('.activeSurvey')?.forEach((button: Element) => {
      let btn = button as HTMLButtonElement
      btn.style.backgroundColor = 'rgba(255, 207, 161, 1)'
    }
    );
  }

  /**
   * 
   * @param value number of deadline
   * @returns value
   */
  abs(value: number) {
    return Math.abs(value);
  }

  /**
   * @function stopThePropagation is used to stop the propagation of the click event
   * @param event click Event
   * @returns void
   */
  stopThePropagation(event: Event) {
    event.stopPropagation();
  }
 

}

