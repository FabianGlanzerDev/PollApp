# PollApp

PollApp is an Angular application for creating, filtering and participating in surveys. Survey data and votes are stored in Supabase and result changes are synchronized in real time.

## Features

- Create surveys in a modal
- Add questions and answer options dynamically
- Required-field validation
- Active and past survey views
- Category filtering
- Ending-soon surveys sorted by deadline
- Single-choice and multiple-choice questions
- Live voting results with participant counts and percentages
- Supabase persistence for surveys, questions, answers and votes
- Supabase Realtime updates without reloading the page
- Completed surveys remain viewable but cannot be submitted again

## Tech Stack

- Angular 21
- TypeScript
- SCSS
- Supabase
- RxJS

## Requirements

- Node.js
- npm
- A Supabase project

## Installation

Install the dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm start
```

The application opens automatically in the browser. By default Angular uses:

```text
http://localhost:4200/angular-projekts/poll_app/
```

## Supabase Setup

The database setup is located in:

```text
supabase/setup.sql
```

Run this SQL file once in the Supabase SQL Editor to create the required tables and Realtime configuration.

The application expects the Supabase connection values in:

```text
src/environments/environment.ts
```

Example:

```ts
export const environment = {
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
};
```

Only a Supabase publishable/anon key belongs in the frontend. Secret or service-role keys must not be stored in the Angular application.

## Project Structure

```text
src/
├── app/
│   ├── components/
│   ├── interfaces/
│   └── services/
├── assets/
├── environments/
└── styles/
supabase/
├── setup.sql
└── seed-real-surveys.sql
```

## Build

Create a production build with:

```bash
npm run build
```

The generated files are written to the `dist/` directory.

## Tests

Run the Angular tests with:

```bash
npm test
```

## Architecture

See `ARCHITECTURE.md` for the current component and data-flow overview.

## Deployment

The production base path is configured in `angular.json` as:

```text
/angular-projekts/poll_app/
```

`public/.htaccess` provides the Apache fallback to `index.html` so routed survey URLs can also be reloaded directly after deployment.
