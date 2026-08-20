import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
/**
 * Displays the global PollApp header and tracks whether a survey detail route is active.
 */
export class Header {
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  readonly isSurveyDetail = computed(() => this.currentUrl().startsWith('/activeSurvey/'));

  /**
   * Subscribes to router events so the header can react to route changes.
   */
  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.currentUrl.set(event.urlAfterRedirects);
    });
  }
}
