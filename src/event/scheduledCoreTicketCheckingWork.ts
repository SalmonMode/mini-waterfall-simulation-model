import { ScheduledTicketCheckingWork } from './scheduledTicketCheckingWork';

export class ScheduledCoreTicketCheckingWork extends ScheduledTicketCheckingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'checkingMinutes', 'productiveCheckingTicketWorkMinutes'];
}
