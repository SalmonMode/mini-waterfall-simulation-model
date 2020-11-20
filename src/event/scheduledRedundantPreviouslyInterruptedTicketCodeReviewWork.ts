import { ScheduledCorePreviouslyInterruptedTicketCodeReviewWork } from "./scheduledCorePreviouslyInterruptedTicketCodeReviewWork";

export class ScheduledRedundantPreviouslyInterruptedTicketCodeReviewWork extends ScheduledCorePreviouslyInterruptedTicketCodeReviewWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'codeReviewMinutes', 'redundantCodeReviewTicketWorkMinutes'];
}
