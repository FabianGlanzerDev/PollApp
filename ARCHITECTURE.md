# PollApp Architecture

PollApp is a standalone Angular application with two routes and one reusable creation modal.

## Routes

- `/` – home screen with ending-soon, active and past surveys
- `/activeSurvey/:id` – survey detail, voting and live results

Creating a survey is intentionally **not** a route. `CreateSurveyComponent` is opened as a modal from the home page and the survey detail page, matching the project checklist.

## Main Components

- `Header` – global PollApp logo/navigation
- `Hero` – home hero section and New Survey trigger
- `HomeViewComponent` – sorting, Active/Past tabs and category filtering
- `CreateSurveyComponent` – reactive survey form and validation
- `ShowSurveyComponent` – survey detail, voting, completion state and result display

## Data Layer

`Surveys` is the central orchestration service for survey state and Realtime subscriptions. `SurveySupabaseRepository` contains the Supabase reads and writes, while `SurveyLocalStorage` contains the browser fallback used when Supabase is not configured.

`survey-result-preview.ts` calculates the temporary result preview shown immediately when a participant selects an answer. The final vote is still persisted only after `Complete survey` is pressed.

## Backend

The database schema and Realtime setup are defined in `supabase/setup.sql`. Optional sample data for development is available in `supabase/seed-real-surveys.sql`.
