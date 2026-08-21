import { DOCUMENT } from '@angular/common';
import { Component, Inject, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Survey } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from '../create-survey-component/create-survey-component';
import { Hero } from '../hero/hero';

const ALL_SURVEYS_CATEGORY = 'All Surveys';
const ENDING_SOON_DAYS = 30;
const ENDING_SOON_LIMIT = 3;
const MILLISECONDS_PER_DAY = 86_400_000;



/**
 * Available survey list views on the home page.
 */
export type SurveyTab = 'active' | 'past';



/**
 * Coordinates the home page, survey tabs, category filters and create-survey dialog.
 */
@Component({
  selector: 'app-home-view-component',
  imports: [RouterLink, Hero, CreateSurveyComponent],
  templateUrl: './home-view-component.html',
  styleUrl: './home-view-component.scss',
})
export class HomeViewComponent {
  @ViewChild(CreateSurveyComponent) createSurveyModal?: CreateSurveyComponent;

  readonly categories = [
    ALL_SURVEYS_CATEGORY,
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
  selectedCategory = ALL_SURVEYS_CATEGORY;
  dropdownOpen = false;



  /**
   * Provides access to the page document for home-specific body styling.
   *
   * @param document Current browser document provided by Angular.
   */
  constructor(@Inject(DOCUMENT) private readonly document: Document) { }



  /**
   * Applies the home page body class when the component is initialized.
   */
  ngOnInit(): void {
    this.document.body.classList.add('home-body');
  }



  /**
   * Removes the home page body class when leaving the component.
   */
  ngOnDestroy(): void {
    this.document.body.classList.remove('home-body');
  }



  /**
   * Returns active surveys ending within the configured ending-soon window.
   *
   * @returns An array of Survey objects with the nearest deadlines first.
   */
  get endingSoonSurveys(): Survey[] {
    const limit = this.addDays(this.startOfToday(), ENDING_SOON_DAYS).getTime();
    return this.activeSurveys
      .filter((survey) => this.deadlineTime(survey) <= limit)
      .slice(0, ENDING_SOON_LIMIT);
  }



  /**
   * Returns surveys for the selected tab and category filter.
   *
   * @returns An array containing the currently visible Survey objects.
   */
  get displayedSurveys(): Survey[] {
    const source = this.activeTab === 'active' ? this.activeSurveys : this.pastSurveys;
    if (this.selectedCategory === ALL_SURVEYS_CATEGORY) return source;
    return source.filter((survey) => this.sameCategory(survey.category, this.selectedCategory));
  }



  /**
   * Returns active surveys ordered by their deadline.
   *
   * @returns An array of active Survey objects with the earliest deadline first.
   */
  get activeSurveys(): Survey[] {
    const today = this.startOfToday().getTime();
    return [...this.surveysData.surveys()]
      .filter((survey) => this.deadlineTime(survey) >= today)
      .sort((left, right) => this.deadlineTime(left) - this.deadlineTime(right));
  }



  /**
   * Returns expired surveys ordered from newest to oldest deadline.
   *
   * @returns An array of Survey objects whose deadlines have already passed.
   */
  get pastSurveys(): Survey[] {
    const today = this.startOfToday().getTime();
    return [...this.surveysData.surveys()]
      .filter((survey) => this.deadlineTime(survey) < today)
      .sort((left, right) => this.deadlineTime(right) - this.deadlineTime(left));
  }



  /**
   * Switches between active and past surveys and resets the category filter.
   *
   * @param tab SurveyTab value that should become active.
   */
  setTab(tab: SurveyTab): void {
    this.activeTab = tab;
    this.selectedCategory = ALL_SURVEYS_CATEGORY;
    this.dropdownOpen = false;
  }



  /**
   * Opens or closes the category dropdown without propagating the click.
   *
   * @param event Mouse event raised by the category control.
   */
  toggleCategoryDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }



  /**
   * Applies a category filter and closes the dropdown.
   *
   * @param category Category name to display.
   * @param event Mouse event raised by the category option.
   */
  selectCategory(category: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedCategory = category;
    this.dropdownOpen = false;
  }



  /**
   * Closes the category dropdown.
   */
  closeCategoryDropdown(): void {
    this.dropdownOpen = false;
  }



  /**
   * Creates the human-readable deadline label shown on a survey card.
   *
   * @param survey Survey whose deadline should be formatted.
   * @returns A string containing the relative deadline label.
   */
  getDeadlineText(survey: Survey): string {
    if (!survey.deadline) return 'No deadline';
    const days = Math.ceil((this.deadlineTime(survey) - Date.now()) / MILLISECONDS_PER_DAY);
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    if (days === 1) return 'Ends in 1 day';
    return `Ends in ${days} days`;
  }



  /**
   * Opens the create-survey dialog from the home page.
   */
  openCreateSurvey(): void {
    this.createSurveyModal?.open();
  }



  /**
   * Reloads the survey collection after a new survey has been published.
   */
  refreshSurveys(): void {
    this.surveysData.getSurveys();
  }



  /**
   * Converts a survey deadline to a sortable timestamp.
   *
   * @param survey Survey whose deadline should be converted.
   * @returns A number containing the deadline timestamp or positive infinity without a deadline.
   */
  private deadlineTime(survey: Survey): number {
    if (!survey.deadline) return Number.POSITIVE_INFINITY;
    const [year, month, day] = survey.deadline.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }



  /**
   * Creates a Date representing the start of the current day.
   *
   * @returns A Date normalized to local midnight.
   */
  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }



  /**
   * Adds a number of calendar days to a date without mutating the input.
   *
   * @param date Starting Date.
   * @param days Number of days to add.
   * @returns A new Date containing the shifted value.
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }



  /**
   * Compares category names using the normalization used by the survey data.
   *
   * @param left First category value.
   * @param right Second category value.
   * @returns A boolean that is true when both normalized categories match.
   */
  private sameCategory(left: string, right: string): boolean {
    return left.trim().toLowerCase().replace('-', ' ') === right.trim().toLowerCase().replace('-', ' ');
  }
}
