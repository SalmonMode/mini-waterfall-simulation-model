import { Schedule } from "./schedule";
import { Ticket } from "../ticket";
import { ScheduledCoreTicketProgrammingWork, ScheduledRedundantNewTicketProgrammingWork, ScheduledCorePreviouslyInterruptedTicketProgrammingWork, ScheduledRedundantPreviouslyInterruptedTicketProgrammingWork } from "../event";

export class ProgrammerSchedule extends Schedule {
  scheduledCoreTicketWork = ScheduledCoreTicketProgrammingWork;
  scheduledRedundantNewTicketWork = ScheduledRedundantNewTicketProgrammingWork;
  scheduledCorePreviouslyInterruptedTicketWork = ScheduledCorePreviouslyInterruptedTicketProgrammingWork;
  scheduledRedundantPreviouslyInterruptedTicketWork = ScheduledRedundantPreviouslyInterruptedTicketProgrammingWork;
  getWorkIterationQueueFromTicket(ticket: Ticket) {
    if (ticket.needsCodeReview) {
      return ticket.programmerCodeReviewWorkIterations;
    }
    return ticket.programmerWorkIterations;
  }
}
