import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Surveys } from '../../services/surveys';
import { HomeViewComponent } from './home-view-component';

describe('HomeViewComponent', () => {
  let component: HomeViewComponent;
  let fixture: ComponentFixture<HomeViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeViewComponent],
      providers: [
        provideRouter([]),
        { provide: Surveys, useValue: { surveys: signal([]), getSurveys: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should label surveys without a deadline', () => {
    const survey = { id: 1, title: 'Open Survey', description: '', deadline: null, category: 'Work' };
    expect(component.getDeadlineText(survey)).toBe('No deadline');
  });

});
