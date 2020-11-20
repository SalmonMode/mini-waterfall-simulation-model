import { ScheduledCorePreviouslyInterruptedTicketProgrammingWork } from "./scheduledCorePreviouslyInterruptedTicketProgrammingWork";

export class ScheduledRedundantPreviouslyInterruptedTicketProgrammingWork extends ScheduledCorePreviouslyInterruptedTicketProgrammingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'programmingMinutes', 'redundantProgrammingTicketWorkMinutes'];
}
