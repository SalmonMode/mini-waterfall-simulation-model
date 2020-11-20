import { ScheduledCorePreviouslyInterruptedTicketCheckingWork } from './scheduledCorePreviouslyInterruptedTicketCheckingWork';

export class ScheduledRedundantPreviouslyInterruptedTicketCheckingWork extends ScheduledCorePreviouslyInterruptedTicketCheckingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'checkingMinutes', 'redundantCheckingTicketWorkMinutes'];
}
