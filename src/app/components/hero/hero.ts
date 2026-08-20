import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
/**
 * Displays the home hero section and emits requests to open the survey form.
 */
export class Hero {
  @Output() createSurvey = new EventEmitter<void>();


  /**
   * Emits an event that requests the create-survey dialog to open.
   */
  openCreateSurvey() {
    this.createSurvey.emit();
  }
}
