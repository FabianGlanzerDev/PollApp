import { Survey } from '../interfaces/survey-interface';

/**
 * Creates an ISO date relative to the current day.
 *
 * @param offset Number of days to add or subtract.
 * @returns Date formatted as YYYY-MM-DD.
 */
const dateFromToday = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

/**
 * Demo surveys used when no Supabase project is configured.
 */
export const DEMO_SURVEYS: Survey[] = [
  {
    id: 101,
    title: 'Which team event should we plan next?',
    description: 'Choose the activity you would most like to do together.',
    deadline: dateFromToday(2),
    category: 'Lifestyle',
  },
  {
    id: 102,
    title: 'Where should the next workshop take place?',
    description: 'Help us choose the location for our next workshop.',
    deadline: dateFromToday(6),
    category: 'Education',
  },
  {
    id: 103,
    title: 'Which workplace benefit matters most?',
    description: 'Vote for the benefit that would improve your workday most.',
    deadline: dateFromToday(14),
    category: 'Work',
  },
  {
    id: 104,
    title: 'How was the summer event?',
    description: 'A finished survey used to test the Past Survey view.',
    deadline: dateFromToday(-5),
    category: 'Lifestyle',
  },
  {
    id: 105,
    title: 'Which learning format worked best?',
    description: 'A finished education survey used for filter testing.',
    deadline: dateFromToday(-20),
    category: 'Education',
  },
];
