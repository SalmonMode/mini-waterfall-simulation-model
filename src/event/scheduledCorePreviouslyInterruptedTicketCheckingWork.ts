import { ScheduledTicketCheckingWork } from "./scheduledTicketCheckingWork";

export class ScheduledCorePreviouslyInterruptedTicketCheckingWork extends ScheduledTicketCheckingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'checkingMinutes', 'productiveCheckingTicketWorkMinutes'];
}
