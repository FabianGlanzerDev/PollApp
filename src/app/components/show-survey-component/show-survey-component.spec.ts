import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowSurveyComponent } from './show-survey-component';

describe('ShowSurveyComponent', () => {
  let component: ShowSurveyComponent;
  let fixture: ComponentFixture<ShowSurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowSurveyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowSurveyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
