import { ScheduledCoreTicketCodeReviewWork } from "./scheduledCoreTicketCodeReviewWork";

export class ScheduledRedundantNewTicketCodeReviewWork extends ScheduledCoreTicketCodeReviewWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'codeReviewMinutes', 'redundantCodeReviewTicketWorkMinutes'];
}
