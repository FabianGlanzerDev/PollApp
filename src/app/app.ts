import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { HomeViewComponent } from './components/home-view-component/home-view-component';
import { Surveys } from './services/surveys';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('poll_app');
}
