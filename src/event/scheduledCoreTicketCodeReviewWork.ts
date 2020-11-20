import { ScheduledTicketCodeReviewWork } from './scheduledTicketCodeReviewWork';

export class ScheduledCoreTicketCodeReviewWork extends ScheduledTicketCodeReviewWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'codeReviewMinutes', 'productiveCodeReviewTicketWorkMinutes'];
}
