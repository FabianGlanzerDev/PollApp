-- PollApp final demo survey seed
-- Creates 3 active surveys and 3 past surveys with realistic result data.
-- Safe for the final demo: only the known sample surveys listed below are replaced.
-- Run this file in the Supabase SQL Editor after setup.sql.

delete from public."surveyDetail"
where title in (
  'Which frontend topic should we practice next?',
  'How should our next coding session be organized?',
  'Which Developer Akademie project should we revisit?',
  'Which TypeScript concept was hardest to learn?',
  'How useful was the Memory Game project?',
  'What should we build after PollApp?',
  'Which Angular topic should we practice next?',
  'What should improve our next project workflow?',
  'Which TypeScript topic helped most in practice?',
  'Which coding workflow worked best?'
);


do $$
declare
  survey_id bigint;
  question_id bigint;
  answer_a bigint;
  answer_b bigint;
  answer_c bigint;
  answer_d bigint;
begin
  -- ACTIVE 1
  insert into public."surveyDetail" (title, description, deadline, category)
  values (
    'What should we build after PollApp?',
    'Choose the project that would be most useful for the next coding challenge.',
    current_date + 6,
    'Education'
  ) returning id into survey_id;

  insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
  values (survey_id, 'Which project should come next?', false)
  returning id into question_id;

  insert into public."answerDetail" (question, answer)
  values (question_id, 'Task manager') returning id into answer_a;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Weather dashboard') returning id into answer_b;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Recipe app') returning id into answer_c;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Portfolio dashboard') returning id into answer_d;

  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_a, gen_random_uuid() from generate_series(1, 4);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_b, gen_random_uuid() from generate_series(1, 2);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_c, gen_random_uuid() from generate_series(1, 3);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_d, gen_random_uuid() from generate_series(1, 1);


  -- ACTIVE 2
  insert into public."surveyDetail" (title, description, deadline, category)
  values (
    'Which Angular topic should we practice next?',
    'Help choose the Angular topic for the next focused practice session.',
    current_date + 18,
    'Education'
  ) returning id into survey_id;

  insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
  values (survey_id, 'Which Angular topic needs the most practice?', false)
  returning id into question_id;

  insert into public."answerDetail" (question, answer)
  values (question_id, 'Signals') returning id into answer_a;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Routing') returning id into answer_b;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Reactive Forms') returning id into answer_c;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Services and dependency injection') returning id into answer_d;

  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_a, gen_random_uuid() from generate_series(1, 3);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_b, gen_random_uuid() from generate_series(1, 2);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_c, gen_random_uuid() from generate_series(1, 4);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_d, gen_random_uuid() from generate_series(1, 2);


  -- ACTIVE 3
  insert into public."surveyDetail" (title, description, deadline, category)
  values (
    'What should improve our next project workflow?',
    'Vote for the workflow improvement that would make the next project easier to manage.',
    current_date + 45,
    'Work'
  ) returning id into survey_id;

  insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
  values (survey_id, 'Which improvement would help the most?', false)
  returning id into question_id;

  insert into public."answerDetail" (question, answer)
  values (question_id, 'Smaller commits') returning id into answer_a;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'More testing') returning id into answer_b;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Better task planning') returning id into answer_c;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'More code reviews') returning id into answer_d;

  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_a, gen_random_uuid() from generate_series(1, 2);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_b, gen_random_uuid() from generate_series(1, 3);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_c, gen_random_uuid() from generate_series(1, 5);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_d, gen_random_uuid() from generate_series(1, 1);


  -- PAST 1
  insert into public."surveyDetail" (title, description, deadline, category)
  values (
    'Which TypeScript topic helped most in practice?',
    'Final results from a completed survey about the TypeScript topics that were most useful.',
    current_date - 14,
    'Education'
  ) returning id into survey_id;

  insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
  values (survey_id, 'Which topic helped you the most?', false)
  returning id into question_id;

  insert into public."answerDetail" (question, answer)
  values (question_id, 'Types and interfaces') returning id into answer_a;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Generics') returning id into answer_b;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Async and await') returning id into answer_c;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Modules and imports') returning id into answer_d;

  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_a, gen_random_uuid() from generate_series(1, 3);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_b, gen_random_uuid() from generate_series(1, 2);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_c, gen_random_uuid() from generate_series(1, 5);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_d, gen_random_uuid() from generate_series(1, 2);


  -- PAST 2
  insert into public."surveyDetail" (title, description, deadline, category)
  values (
    'How useful was the Memory Game project?',
    'Final feedback about what the Memory Game project contributed to the learning process.',
    current_date - 9,
    'Education'
  ) returning id into survey_id;

  insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
  values (survey_id, 'How useful was the project overall?', false)
  returning id into question_id;

  insert into public."answerDetail" (question, answer)
  values (question_id, 'Very useful') returning id into answer_a;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Useful') returning id into answer_b;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Okay') returning id into answer_c;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Not very useful') returning id into answer_d;

  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_a, gen_random_uuid() from generate_series(1, 6);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_b, gen_random_uuid() from generate_series(1, 3);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_c, gen_random_uuid() from generate_series(1, 1);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_d, gen_random_uuid() from generate_series(1, 1);


  -- PAST 3
  insert into public."surveyDetail" (title, description, deadline, category)
  values (
    'Which coding workflow worked best?',
    'Final results from a completed survey about everyday coding workflow.',
    current_date - 4,
    'Work'
  ) returning id into survey_id;

  insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
  values (survey_id, 'Which workflow was the most effective?', false)
  returning id into question_id;

  insert into public."answerDetail" (question, answer)
  values (question_id, 'Small commits') returning id into answer_a;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Feature branches') returning id into answer_b;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Test before commit') returning id into answer_c;
  insert into public."answerDetail" (question, answer)
  values (question_id, 'Code review before merge') returning id into answer_d;

  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_a, gen_random_uuid() from generate_series(1, 4);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_b, gen_random_uuid() from generate_series(1, 2);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_c, gen_random_uuid() from generate_series(1, 3);
  insert into public."choosenDetail" (survey_id, question_id, answer_id, submission_id)
  select survey_id, question_id, answer_d, gen_random_uuid() from generate_series(1, 2);
end
$$;
