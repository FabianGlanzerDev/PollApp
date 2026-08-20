import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  @Output() createSurvey = new EventEmitter<void>();


  openCreateSurvey() {
    this.createSurvey.emit();
  }
}
