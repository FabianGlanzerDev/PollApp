import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Surveys } from '../../services/surveys';
import { ShowSurveyComponent } from './show-survey-component';

describe('ShowSurveyComponent', () => {
  let component: ShowSurveyComponent;
  let fixture: ComponentFixture<ShowSurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowSurveyComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '0' }) } } },
        {
          provide: Surveys,
          useValue: {
            surveys: signal([]),
            questions: signal([]),
            statistics: signal([]),
            loadSurveyContent: vi.fn(),
            getStatisticsData: vi.fn(),
            submitVotes: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowSurveyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
