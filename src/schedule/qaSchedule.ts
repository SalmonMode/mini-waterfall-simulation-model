import { Schedule } from './schedule';
import { Ticket } from '../ticket';
import { CustomEventsByDayList } from '../customEventsByDayList';
import {
  ScheduledCoreTicketCheckingWork,
  ScheduledRedundantNewTicketCheckingWork,
  ScheduledCorePreviouslyInterruptedTicketCheckingWork,
  ScheduledRedundantPreviouslyInterruptedTicketCheckingWork,
  RegressionTesting,
} from '../event';

export class QaSchedule extends Schedule {
  scheduledCoreTicketWork = ScheduledCoreTicketCheckingWork;
  scheduledRedundantNewTicketWork = ScheduledRedundantNewTicketCheckingWork;
  scheduledCorePreviouslyInterruptedTicketWork = ScheduledCorePreviouslyInterruptedTicketCheckingWork;
  scheduledRedundantPreviouslyInterruptedTicketWork = ScheduledRedundantPreviouslyInterruptedTicketCheckingWork;
  constructor(
    public sprintDayCount: number,
    public regressionTestDayCount: number,
    lunchTime: number,
    public customEventsByDay?: CustomEventsByDayList,
  ) {
    super(sprintDayCount, regressionTestDayCount, lunchTime, customEventsByDay);
    for (let i = 0; i < regressionTestDayCount; i++) {
      const previousSprintDaySchedule = this.daySchedules[i];
      const currentSprintI = this.daySchedules.length - (regressionTestDayCount - i);
      const currentSprintDaySchedule = this.daySchedules[currentSprintI];
      // regression tests from previous sprint
      while (previousSprintDaySchedule.availableTimeSlots.length > 0) {
        const timeSlot = previousSprintDaySchedule.availableTimeSlots[0];
        previousSprintDaySchedule.scheduleMeeting(new RegressionTesting(timeSlot.startTime, timeSlot.duration, i));
      }
      while (currentSprintDaySchedule.availableTimeSlots.length > 0) {
        const timeSlot = currentSprintDaySchedule.availableTimeSlots[0];
        currentSprintDaySchedule.scheduleMeeting(
          new RegressionTesting(timeSlot.startTime, timeSlot.duration, i + this.sprintDayCount),
        );
      }
    }
  }
  getWorkIterationQueueFromTicket(ticket: Ticket) {
    if (ticket.needsAutomation) {
      return ticket.automationWorkIterations;
    }
    return ticket.testerWorkIterations;
  }
}
