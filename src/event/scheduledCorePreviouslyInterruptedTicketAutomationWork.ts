import { ScheduledTicketAutomationWork } from "./scheduledTicketAutomationWork";

export class ScheduledCorePreviouslyInterruptedTicketAutomationWork extends ScheduledTicketAutomationWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'automationMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
