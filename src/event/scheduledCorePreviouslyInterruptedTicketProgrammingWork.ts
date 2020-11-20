import { ScheduledTicketProgrammingWork } from './scheduledTicketProgrammingWork';

export class ScheduledCorePreviouslyInterruptedTicketProgrammingWork extends ScheduledTicketProgrammingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'programmingMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
