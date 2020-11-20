import { ScheduledTicketProgrammingWork } from "./scheduledTicketProgrammingWork";

export class ScheduledCoreTicketProgrammingWork extends ScheduledTicketProgrammingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'programmingMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
