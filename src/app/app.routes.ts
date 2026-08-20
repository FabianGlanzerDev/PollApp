import { Routes } from '@angular/router';
import { HomeViewComponent } from './components/home-view-component/home-view-component';
import { ShowSurveyComponent } from './components/show-survey-component/show-survey-component';

/**
 * Defines the application routes for the home view and individual surveys.
 */
export const routes: Routes = [
  {
    path: '',
    component: HomeViewComponent,
  },
  {
    path: 'activeSurvey/:id',
    component: ShowSurveyComponent,
  },
];
