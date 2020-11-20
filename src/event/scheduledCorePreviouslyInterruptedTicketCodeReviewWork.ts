import { ScheduledTicketCodeReviewWork } from "./scheduledTicketCodeReviewWork";

export class ScheduledCorePreviouslyInterruptedTicketCodeReviewWork extends ScheduledTicketCodeReviewWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'codeReviewMinutes', 'productiveCodeReviewTicketWorkMinutes'];
}
