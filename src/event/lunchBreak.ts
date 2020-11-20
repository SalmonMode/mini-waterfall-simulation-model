import { Meeting } from "./meeting";

export class LunchBreak extends Meeting {
  // Extends Meeting because meetings can be stacked back to back without having to
  // worry about context switching between them, and when leading up to a meeting, if
  // the prior ScheduledEvent ended less than or equal to 30 minutes before it, then new
  // work won't be started. These are all true for Lunch as well.
  title = 'Lunch';
}
