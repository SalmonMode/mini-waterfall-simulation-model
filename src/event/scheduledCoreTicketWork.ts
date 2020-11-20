import { ScheduledTicketWork } from './scheduledTicketWork';

export class ScheduledCoreTicketWork extends ScheduledTicketWork {
  // This is exactly like ScheduledTicketWork, except it can't be placed in between a
  // prior event's end and a Meeting (even Lunch), if that next Meeting starts 30
  // minutes or less after the prior event.
}
