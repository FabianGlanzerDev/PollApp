import { Routes } from '@angular/router';
import { HomeViewComponent } from './components/home-view-component/home-view-component';
import { ShowSurveyComponent } from './components/show-survey-component/show-survey-component';

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
