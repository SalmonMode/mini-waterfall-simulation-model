import { ScheduledCoreTicketProgrammingWork } from './scheduledCoreTicketProgrammingWork';

export class ScheduledRedundantNewTicketProgrammingWork extends ScheduledCoreTicketProgrammingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'programmingMinutes', 'redundantProgrammingTicketWorkMinutes'];
}
