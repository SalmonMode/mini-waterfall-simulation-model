import { ScheduledCoreTicketCheckingWork } from "./scheduledCoreTicketCheckingWork";

export class ScheduledRedundantNewTicketCheckingWork extends ScheduledCoreTicketCheckingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'checkingMinutes', 'redundantCheckingTicketWorkMinutes'];
}
