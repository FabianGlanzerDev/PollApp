import { DOCUMENT } from '@angular/common';
import { Component, Inject, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Survey } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from '../create-survey-component/create-survey-component';
import { Hero } from '../hero/hero';

/**
 * Available survey list views on the home page.
 */
type SurveyTab = 'active' | 'past';

@Component({
  selector: 'app-home-view-component',
  imports: [RouterLink, Hero, CreateSurveyComponent],
  templateUrl: './home-view-component.html',
  styleUrl: './home-view-component.scss',
})
/**
 * Coordinates the home page, survey tabs, category filters and create-survey dialog.
 */
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

  /**
   * Provides access to the page document for home-specific body styling.
   */
  constructor(@Inject(DOCUMENT) private readonly document: Document) { }


  /**
   * Applies the home page body class when the component is initialized.
   */
  ngOnInit() {
    this.document.body.classList.add('home-body');
  }


  /**
   * Removes the home page body class when leaving the component.
   */
  ngOnDestroy() {
    this.document.body.classList.remove('home-body');
  }


  /**
   * Returns up to three active surveys ending within the next 30 days.
   *
   * @returns The surveys with the nearest deadlines.
   */
  get endingSoonSurveys(): Survey[] {
    const limit = this.addDays(this.startOfToday(), 30).getTime();
    return this.activeSurveys
      .filter((survey) => this.deadlineTime(survey) <= limit)
      .slice(0, 3);
  }


  /**
   * Returns the surveys for the selected tab and category filter.
   *
   * @returns The currently visible survey list.
   */
  get displayedSurveys(): Survey[] {
    const source = this.activeTab === 'active' ? this.activeSurveys : this.pastSurveys;
    if (this.selectedCategory === 'All Surveys') return source;
    return source.filter((survey) => this.sameCategory(survey.category, this.selectedCategory));
  }


  /**
   * Returns active surveys ordered by their deadline.
   *
   * @returns Active surveys with the earliest deadline first.
   */
  get activeSurveys(): Survey[] {
    const today = this.startOfToday().getTime();
    return [...this.surveysData.surveys()]
      .filter((survey) => this.deadlineTime(survey) >= today)
      .sort((a, b) => this.deadlineTime(a) - this.deadlineTime(b));
  }


  /**
   * Returns expired surveys ordered from newest to oldest deadline.
   *
   * @returns Surveys whose deadline has already passed.
   */
  get pastSurveys(): Survey[] {
    const today = this.startOfToday().getTime();
    return [...this.surveysData.surveys()]
      .filter((survey) => this.deadlineTime(survey) < today)
      .sort((a, b) => this.deadlineTime(b) - this.deadlineTime(a));
  }


  /**
   * Switches between active and past surveys and resets the category filter.
   *
   * @param tab The survey tab that should become active.
   */
  setTab(tab: SurveyTab) {
    this.activeTab = tab;
    this.selectedCategory = 'All Surveys';
    this.dropdownOpen = false;
  }


  /**
   * Opens or closes the category dropdown without propagating the click.
   *
   * @param event The triggering mouse event.
   */
  toggleCategoryDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }


  /**
   * Applies a category filter and closes the dropdown.
   *
   * @param category The category to display.
   * @param event The triggering mouse event.
   */
  selectCategory(category: string, event: MouseEvent) {
    event.stopPropagation();
    this.selectedCategory = category;
    this.dropdownOpen = false;
  }


  /**
   * Closes the category dropdown.
   */
  closeCategoryDropdown() {
    this.dropdownOpen = false;
  }


  /**
   * Creates the human-readable deadline label shown on a survey card.
   *
   * @param survey The survey whose deadline should be formatted.
   * @returns A relative deadline label.
   */
  getDeadlineText(survey: Survey) {
    if (!survey.deadline) return 'No deadline';
    const days = Math.ceil((this.deadlineTime(survey) - Date.now()) / 86400000);
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    if (days === 1) return 'Ends in 1 day';
    return `Ends in ${days} days`;
  }


  /**
   * Opens the create-survey dialog from the home page.
   */
  openCreateSurvey() {
    this.createSurveyModal?.open();
  }


  /**
   * Reloads the survey collection after a new survey has been published.
   */
  refreshSurveys() {
    this.surveysData.getSurveys();
  }


  private deadlineTime(survey: Survey) {
    if (!survey.deadline) return Number.POSITIVE_INFINITY;
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
