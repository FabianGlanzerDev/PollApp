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
});
