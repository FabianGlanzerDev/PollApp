import { DOCUMENT } from '@angular/common';
import { Component, Inject, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Survey } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from '../create-survey-component/create-survey-component';
import { Hero } from '../hero/hero';

type SurveyTab = 'active' | 'past';

@Component({
  selector: 'app-home-view-component',
  imports: [RouterLink, Hero, CreateSurveyComponent],
  templateUrl: './home-view-component.html',
  styleUrl: './home-view-component.scss',
})
export class HomeViewComponent {
  @ViewChild(CreateSurveyComponent) createSurveyModal?: CreateSurveyComponent;

  readonly categories = [
    'All Surveys',
    'Health Care',
    'Business',
    'Lifestyle',
    'Education',
    'Population',
    'Money',
    'Environment',
    'Work',
  ];

  readonly surveysData = inject(Surveys);
  activeTab: SurveyTab = 'active';
  selectedCategory = 'All Surveys';
  dropdownOpen = false;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}


  ngOnInit() {
    this.document.body.classList.add('home-body');
  }


  ngOnDestroy() {
    this.document.body.classList.remove('home-body');
  }


  get endingSoonSurveys(): Survey[] {
    const limit = this.addDays(this.startOfToday(), 30).getTime();
    return this.activeSurveys
      .filter((survey) => this.deadlineTime(survey) <= limit)
      .slice(0, 3);
  }


  get displayedSurveys(): Survey[] {
    const source = this.activeTab === 'active' ? this.activeSurveys : this.pastSurveys;
    if (this.selectedCategory === 'All Surveys') return source;
    return source.filter((survey) => this.sameCategory(survey.category, this.selectedCategory));
  }


  get activeSurveys(): Survey[] {
    const today = this.startOfToday().getTime();
    return [...this.surveysData.surveys()]
      .filter((survey) => this.deadlineTime(survey) >= today)
      .sort((a, b) => this.deadlineTime(a) - this.deadlineTime(b));
  }


  get pastSurveys(): Survey[] {
    const today = this.startOfToday().getTime();
    return [...this.surveysData.surveys()]
      .filter((survey) => this.deadlineTime(survey) < today)
      .sort((a, b) => this.deadlineTime(b) - this.deadlineTime(a));
  }


  setTab(tab: SurveyTab) {
    this.activeTab = tab;
    this.selectedCategory = 'All Surveys';
    this.dropdownOpen = false;
  }


  toggleCategoryDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }


  selectCategory(category: string, event: MouseEvent) {
    event.stopPropagation();
    this.selectedCategory = category;
    this.dropdownOpen = false;
  }


  closeCategoryDropdown() {
    this.dropdownOpen = false;
  }


  getDeadlineText(survey: Survey) {
    const days = Math.ceil((this.deadlineTime(survey) - Date.now()) / 86400000);
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    if (days === 1) return 'Ends in 1 day';
    return `Ends in ${days} days`;
  }


  openCreateSurvey() {
    this.createSurveyModal?.open();
  }


  refreshSurveys() {
    this.surveysData.getSurveys();
  }


  private deadlineTime(survey: Survey) {
    const [year, month, day] = survey.deadline.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }


  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }


  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }


  private sameCategory(left: string, right: string) {
    return left.trim().toLowerCase().replace('-', ' ') === right.trim().toLowerCase().replace('-', ' ');
  }
}
