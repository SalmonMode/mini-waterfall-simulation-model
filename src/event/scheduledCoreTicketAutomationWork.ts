import { ScheduledTicketAutomationWork } from "./scheduledTicketAutomationWork";

export class ScheduledCoreTicketAutomationWork extends ScheduledTicketAutomationWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'automationMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
