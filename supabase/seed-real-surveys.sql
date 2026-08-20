-- PollApp realistic survey seed
-- Run this once in the Supabase SQL Editor after setup.sql.
-- Dates are relative to the day this script is executed so active and past views stay testable.

do $$
declare
  survey_id bigint;
  question_id bigint;
begin
  if not exists (select 1 from public."surveyDetail" where title = 'Which frontend topic should we practice next?') then
    insert into public."surveyDetail" (title, description, deadline, category)
    values (
      'Which frontend topic should we practice next?',
      'Help choose the topic for the next coding practice session.',
      current_date + 7,
      'Education'
    ) returning id into survey_id;

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'Which topic should get the next deep-dive?', false)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'TypeScript'),
      (question_id, 'Angular'),
      (question_id, 'SCSS'),
      (question_id, 'APIs');

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'What should the session include?', true)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Live coding'),
      (question_id, 'Small exercises'),
      (question_id, 'Debugging examples'),
      (question_id, 'Code review');
  end if;

  if not exists (select 1 from public."surveyDetail" where title = 'How should our next coding session be organized?') then
    insert into public."surveyDetail" (title, description, deadline, category)
    values (
      'How should our next coding session be organized?',
      'Vote for the format that would make the next coding session most useful.',
      current_date + 20,
      'Work'
    ) returning id into survey_id;

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'Which format do you prefer?', false)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Pair programming'),
      (question_id, 'Solo coding tasks'),
      (question_id, 'Mentor walkthrough'),
      (question_id, 'Group challenge');

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'What helps you stay focused while coding?', true)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Clear tasks'),
      (question_id, 'Short breaks'),
      (question_id, 'Timeboxing'),
      (question_id, 'Quiet environment');
  end if;

  if not exists (select 1 from public."surveyDetail" where title = 'Which Developer Akademie project should we revisit?') then
    insert into public."surveyDetail" (title, description, deadline, category)
    values (
      'Which Developer Akademie project should we revisit?',
      'Choose a project that would be useful to revisit and improve.',
      current_date + 60,
      'Education'
    ) returning id into survey_id;

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'Which project should we revisit?', false)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Memory Game'),
      (question_id, 'Join'),
      (question_id, 'BestellApp'),
      (question_id, 'Pokédex');

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'What should we improve in that project?', true)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Responsive design'),
      (question_id, 'TypeScript structure'),
      (question_id, 'Accessibility'),
      (question_id, 'Performance');
  end if;

  if not exists (select 1 from public."surveyDetail" where title = 'Which TypeScript concept was hardest to learn?') then
    insert into public."surveyDetail" (title, description, deadline, category)
    values (
      'Which TypeScript concept was hardest to learn?',
      'A completed survey about the TypeScript topics that required the most practice.',
      current_date - 5,
      'Education'
    ) returning id into survey_id;

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'Which concept was the hardest at first?', false)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Types and interfaces'),
      (question_id, 'Generics'),
      (question_id, 'Async and await'),
      (question_id, 'Modules and imports');
  end if;

  if not exists (select 1 from public."surveyDetail" where title = 'How useful was the Memory Game project?') then
    insert into public."surveyDetail" (title, description, deadline, category)
    values (
      'How useful was the Memory Game project?',
      'A completed survey about what the Memory Game project helped improve.',
      current_date - 15,
      'Education'
    ) returning id into survey_id;

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'How useful was the project overall?', false)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'Very useful'),
      (question_id, 'Useful'),
      (question_id, 'Okay'),
      (question_id, 'Not very useful');

    insert into public."questionDetail" (survey, question, "allowMultipleAnswers")
    values (survey_id, 'What did the project improve most?', true)
    returning id into question_id;

    insert into public."answerDetail" (question, answer) values
      (question_id, 'TypeScript'),
      (question_id, 'Responsive design'),
      (question_id, 'Git workflow'),
      (question_id, 'Debugging');
  end if;
end
$$;
