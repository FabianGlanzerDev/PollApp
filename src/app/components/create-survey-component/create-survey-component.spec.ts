import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Surveys } from '../../services/surveys';
import { CreateSurveyComponent } from './create-survey-component';

describe('CreateSurveyComponent', () => {
  let component: CreateSurveyComponent;
  let fixture: ComponentFixture<CreateSurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSurveyComponent],
      providers: [
        { provide: Surveys, useValue: { createSurvey: vi.fn().mockResolvedValue({ id: 1 }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSurveyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an invalid required form', () => {
    expect(component.surveyForm.invalid).toBe(true);
  });

  it('should allow publishing without an optional end date', () => {
    component.surveyForm.controls.surveyName.setValue('Team Survey');
    component.surveyForm.controls.category.setValue('Work');
    const question = component.questions.at(0);
    question.controls.questionText.setValue('Which option should we choose?');
    component.getAnswers(0).at(0).get('answerText')?.setValue('Option A');
    component.getAnswers(0).at(1).get('answerText')?.setValue('Option B');
    expect(component.surveyForm.valid).toBe(true);
    expect(component.surveyForm.controls.endDate.value).toBe('');
  });

});
