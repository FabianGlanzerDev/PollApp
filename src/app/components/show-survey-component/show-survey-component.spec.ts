import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Answer, Question, SurveyVote } from '../../interfaces/survey-interface';
import { Surveys } from '../../services/surveys';
import { ShowSurveyComponent } from './show-survey-component';

describe('ShowSurveyComponent', () => {
  let component: ShowSurveyComponent;
  let fixture: ComponentFixture<ShowSurveyComponent>;

  const answers: Answer[] = [
    { id: 1, answer: 'Task manager', question: 1 },
    { id: 2, answer: 'Weather dashboard', question: 1 },
    { id: 3, answer: 'Recipe app', question: 1 },
    { id: 4, answer: 'Portfolio dashboard', question: 1 },
  ];

  const question: Question = {
    id: 1,
    question: 'Which project should come next?',
    allowMultipleAnswers: false,
    answers,
    survey: 1,
  };

  const statistics: SurveyVote[] = [
    ...makeVotes(1, 4),
    ...makeVotes(2, 2, 4),
    ...makeVotes(3, 3, 6),
    ...makeVotes(4, 1, 9),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowSurveyComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
        {
          provide: Surveys,
          useValue: {
            surveys: signal([
              { id: 1, title: 'Project survey', description: '', deadline: '2099-12-31', category: 'Education' },
            ]),
            questions: signal([question]),
            statistics: signal(statistics),
            loadSurveyContent: vi.fn().mockResolvedValue([question]),
            getStatisticsData: vi.fn().mockResolvedValue(statistics),
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

  it('should preview result changes immediately after selecting an answer', () => {
    expect(component.answerPercentage(4)).toBe(10);
    expect(component.participantCount()).toBe(10);

    component.updateAnswer(question, 4, true);

    expect(component.answerPercentage(4)).toBe(18);
    expect(component.participantCount()).toBe(11);
  });
});



/**
 * Creates deterministic vote records used by the live-preview test.
 *
 * @param answerId Id assigned to the generated votes.
 * @param count Number of votes to generate.
 * @param startIndex Offset used to keep submission ids unique.
 * @returns An array of SurveyVote records for the test fixture.
 */
function makeVotes(answerId: number, count: number, startIndex = 0): SurveyVote[] {
  return Array.from({ length: count }, (_, index) => ({
    survey_id: 1,
    question_id: 1,
    answer_id: answerId,
    submission_id: `submission-${startIndex + index}`,
    created_at: '2026-08-21T00:00:00.000Z',
  }));
}
