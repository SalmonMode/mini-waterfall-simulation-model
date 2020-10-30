import { CustomEventsByDayList } from './CustomEventsByDayList';
import {
  ContextSwitchEvent,
  DailyStandup,
  LunchBreak,
  NothingEvent,
  RegressionTesting,
  ScheduledCorePreviouslyInterruptedTicketAutomationWork,
  ScheduledCorePreviouslyInterruptedTicketCheckingWork,
  ScheduledCorePreviouslyInterruptedTicketCodeReviewWork,
  ScheduledCorePreviouslyInterruptedTicketProgrammingWork,
  ScheduledCoreTicketAutomationWork,
  ScheduledCoreTicketCheckingWork,
  ScheduledCoreTicketCodeReviewWork,
  ScheduledCoreTicketProgrammingWork,
  ScheduledEvent,
  ScheduledRedundantNewTicketCheckingWork,
  ScheduledRedundantNewTicketCodeReviewWork,
  ScheduledRedundantNewTicketProgrammingWork,
  ScheduledRedundantPreviouslyInterruptedTicketCheckingWork,
  ScheduledRedundantPreviouslyInterruptedTicketCodeReviewWork,
  ScheduledRedundantPreviouslyInterruptedTicketProgrammingWork,
  SprintPlanning,
  SprintRetro,
} from './events';
import { Ticket } from './ticket';
import { WorkIteration } from './workIteration';

class AvailableTimeSlot {
  duration: number;
  constructor(public nextEventIndex: number | null, public startTime: number, public endTime: number) {
    this.duration = endTime - startTime;
  }
  get previousMeetingIndex(): number | null {
    if (this.nextEventIndex === null || this.nextEventIndex === 0) {
      return null;
    }
    return this.nextEventIndex - 1;
  }
}

class DaySchedule {
  items: ScheduledEvent[] = [];
  lastMeetingIndexBeforeAvailability: number | null = null;
  availableTimeSlots: AvailableTimeSlot[] = [new AvailableTimeSlot(null, 0, 480)];
  constructor(lunchTime: number, public day: number) {
    let lunch = new LunchBreak(lunchTime, 60, this.day);
    this.scheduleMeeting(lunch);
  }

  scheduleMeeting(event: ScheduledEvent) {
    // assumes events are set first and were set in order
    if (this.availableTimeSlots.length === 0) {
      throw Error('No available time to schedule events');
    }
    const newAvailableTimeSlots = [];
    // track the number of events added so that NothingEvents can also impact the
    // later AvailableTimeSlot's nextEventIndex attribute.
    let eventsAdded = 0;
    let matchingTimeSlotIndex = 0;
    for (let timeSlotIndex = 0; timeSlotIndex < this.availableTimeSlots.length; timeSlotIndex++) {
      const timeSlot = this.availableTimeSlots[timeSlotIndex];
      timeSlot.nextEventIndex = (timeSlot.nextEventIndex || 0) + eventsAdded;
      if (!eventsAdded && event.startTime >= timeSlot.startTime && event.endTime <= timeSlot.endTime) {
        // event fits here
        matchingTimeSlotIndex = timeSlotIndex;

        // Add possible NothingEvent to schedule items, or AvailableTimeSlot to schedule's available time slots.
        const startTimeDiff = event.startTime - timeSlot.startTime;
        if (startTimeDiff > 0) {
          if (startTimeDiff <= 30) {
            // just enough time to do nothing
            this.items.splice(
              timeSlot.nextEventIndex,
              0,
              new NothingEvent(timeSlot.startTime, startTimeDiff, this.day),
            );
            eventsAdded += 1;
          } else {
            newAvailableTimeSlots.push(
              new AvailableTimeSlot(timeSlot.nextEventIndex, timeSlot.startTime, event.startTime),
            );
          }
        }

        // add event to schedule items
        this.items.splice(timeSlot.nextEventIndex, 0, event);
        eventsAdded += 1;

        // Add possible NothingEvent to schedule items, or AvailableTimeSlot to schedule's available time slots.
        const endTimeDiff = timeSlot.endTime - event.endTime;
        if (endTimeDiff > 0) {
          const nextEventIndex = timeSlot.nextEventIndex + eventsAdded;
          if (endTimeDiff <= 30 && !(event instanceof ContextSwitchEvent)) {
            // just enough time to do nothing
            const newNothingEvent = new NothingEvent(event.endTime, endTimeDiff, this.day);
            if (timeSlot.nextEventIndex == null) {
              this.items.push(newNothingEvent);
            } else {
              this.items.splice(nextEventIndex, 0, newNothingEvent);
            }
          } else {
            // still room to do something (or the next thing being scheduled will be the ticket work)
            newAvailableTimeSlots.push(new AvailableTimeSlot(nextEventIndex, event.endTime, timeSlot.endTime));
          }
        }
      }
    }
    if (!eventsAdded) {
      // event conflicts
      throw Error('Event conflicts with another event');
    }
    // Merge in newly defined AvailableTimeSlots if applicable.
    this.availableTimeSlots.splice(matchingTimeSlotIndex, 1, ...newAvailableTimeSlots);
  }
}

export abstract class Schedule {
  daySchedules: DaySchedule[] = [];
  dayLengthInMinutes: number = 480;
  dayOfNextWorkIterationCompletion: number | null;
  timeOfNextWorkIterationCompletion: number | null;
  lastTicketWorkedOn: Ticket | null;
  constructor(
    public sprintDayCount: number,
    public regressionTestDayCount: number,
    lunchTime: number,
    public customEventsByDay?: CustomEventsByDayList,
  ) {
    // The "first" ${regressionTestDayCount} days of the sprint are actually
    // the last days of the previous sprint when the tester is doing the
    // regression tests, and it is assumed that the programmers are getting
    // a head start on next sprint, and are only working on tickets for that
    // next sprint. Their work is simulated for these days both to reflect
    // that programmers would normally be continuing work during this time,
    // but also so that the tester's schedule starts out on the first day of
    // the sprint with ticket work to do. Metrics will be gathered for all
    // days, even those from the last days of the previous sprint to reflect
    // the impact of this process from a holistic perspective.
    const totalSimulationDays = this.sprintDayCount + this.regressionTestDayCount;
    if (!this.customEventsByDay) {
      this.customEventsByDay = Array.from(Array(totalSimulationDays)).map(() => []);
    } else if (this.customEventsByDay.length !== totalSimulationDays) {
      throw new Error('Size of custom events list does not reflect total number of days in simulation');
    }
    for (let i = 0; i < this.sprintDayCount + this.regressionTestDayCount; i++) {
      const customEvents = this.customEventsByDay[i];
      let schedule = new DaySchedule(lunchTime, i);
      for (const event of customEvents) {
        schedule.scheduleMeeting(event);
      }
      if (i === regressionTestDayCount) {
        // first actual day of sprint, so sprint planning
        let remainingDuration = 120;
        while (remainingDuration > 0) {
          const availableDuration = schedule.availableTimeSlots[0].duration;
          let nextEventDuration = remainingDuration - availableDuration;
          if (nextEventDuration <= 0) {
            nextEventDuration = remainingDuration;
          }
          remainingDuration -= nextEventDuration;
          schedule.scheduleMeeting(new SprintPlanning(schedule.availableTimeSlots[0].startTime, nextEventDuration, i));
        }
      } else {
        schedule.scheduleMeeting(new DailyStandup(0, 15, i));
      }
      this.daySchedules.push(schedule);
    }
    const lastHourOfDay = this.dayLengthInMinutes - 60;
    this.daySchedules[regressionTestDayCount - 1].scheduleMeeting(
      new SprintRetro(lastHourOfDay, 60, regressionTestDayCount - 1),
    );
    this.daySchedules[this.daySchedules.length - 1].scheduleMeeting(
      new SprintRetro(lastHourOfDay, 60, this.daySchedules.length - 1),
    );
    this.dayOfNextWorkIterationCompletion = null;
    this.timeOfNextWorkIterationCompletion = null;
    this.lastTicketWorkedOn = null;
  }

  get earliestAvailableDayForWorkIndex(): number {
    for (let daySchedule of this.daySchedules) {
      if (daySchedule.availableTimeSlots.length > 0) {
        return daySchedule.day;
      }
    }
    return -1;
  }

  get earliestAvailableDayScheduleForWork(): DaySchedule | null {
    if (this.earliestAvailableDayForWorkIndex === -1) {
      return null;
    }
    return this.daySchedules[this.earliestAvailableDayForWorkIndex];
  }

  abstract getWorkIterationQueueFromTicket(ticket: Ticket): WorkIteration[];

  addWork(ticket: Ticket) {
    // assumes the meetings have already been defined and that work is being added
    // in the earliest available, viable time slot.
    this.lastTicketWorkedOn = ticket;
    let queue = this.getWorkIterationQueueFromTicket(ticket);
    let workIteration = queue.shift();
    if (!workIteration) {
      throw new Error('No work iterations available');
    }
    let needsCodeReview = !!ticket.needsCodeReview;
    let needsAutomation = !!ticket.needsAutomation;
    let firstIteration = ticket.firstIteration;
    let finalIteration = !queue.length;
    let lastWorkEvent;
    while (workIteration.time > 0) {
      // work has a potential of being completed on the currently considered day,
      // but if it isn't, this.earliestAvailableDayForWorkIndex will be updated to
      // the next day that the work for this ticket could possibly be completed on
      // and when this iterates through again, it will possibly be correct. This
      // will repeat until eventually it is correct because
      // this.earliestAvailableDayForWorkIndex will have been the day that the
      // last of the work for this work iteration would be scheduled.
      this.dayOfNextWorkIterationCompletion = this.earliestAvailableDayForWorkIndex;
      if (this.earliestAvailableDayForWorkIndex === -1) {
        throw RangeError('Not enough time left in the sprint to finish this ticket');
      }
      let schedule = this.earliestAvailableDayScheduleForWork!;
      let contextSwitchTime = Math.round(Math.random() * (30 - 10) + 10);
      let contextSwitchEvent = new ContextSwitchEvent(
        schedule.availableTimeSlots[0].startTime,
        contextSwitchTime,
        ticket,
        this.earliestAvailableDayForWorkIndex,
        firstIteration,
        finalIteration,
      );
      schedule.scheduleMeeting(contextSwitchEvent);
      let newWorkEvent;
      // distinguish between interrupted work, and non-interrupted work
      let scheduledWorkClass;
      if (needsCodeReview) {
        if (finalIteration) {
          // This is the last time this ticket will need to be code reviewed, so it
          // isn't redundant.
          scheduledWorkClass = workIteration.started
            ? ScheduledCorePreviouslyInterruptedTicketCodeReviewWork
            : ScheduledCoreTicketCodeReviewWork;
        } else {
          // This code review will have to be done again in the future, making it
          // redundant.
          scheduledWorkClass = workIteration.started
            ? ScheduledRedundantPreviouslyInterruptedTicketCodeReviewWork
            : ScheduledRedundantNewTicketCodeReviewWork;
        }
      } else if (needsAutomation) {
        scheduledWorkClass = workIteration.started
          ? ScheduledCorePreviouslyInterruptedTicketAutomationWork
          : ScheduledCoreTicketAutomationWork;
      } else {
        if (this instanceof QaSchedule) {
          if (finalIteration) {
            // this is the last time this ticket will need to be checked, as it will be
            // checked successfully, in full, meaning it isn't redundant.
            scheduledWorkClass = workIteration.started
              ? this.scheduledCorePreviouslyInterruptedTicketWork
              : this.scheduledCoreTicketWork;
          } else {
            // The tester will only get part way through their checks for this ticket
            // before something goes wrong and they have to send it back, meaning the
            // next time they check this ticket, they'll have to repeat everything they
            // already did, so this work is redundant (even if the tester never gets to
            // finish checking this ticket successfully this sprint).
            scheduledWorkClass = workIteration.started
              ? this.scheduledRedundantPreviouslyInterruptedTicketWork
              : this.scheduledRedundantNewTicketWork;
          }
        } else if (this instanceof ProgrammerSchedule) {
          if (firstIteration) {
            // this is the first time the programmer will have worked on the ticket, and
            // what they send to code review after this will be something they believe
            // is worthy of going to production, making this work not redundant.
            scheduledWorkClass = workIteration.started
              ? this.scheduledCorePreviouslyInterruptedTicketWork
              : this.scheduledCoreTicketWork;
          } else {
            // The programmer is fixing their initial work, which would've ideally been
            // working fine before sending it to code review, making this redundant
            // work.
            scheduledWorkClass = workIteration.started
              ? this.scheduledRedundantPreviouslyInterruptedTicketWork
              : this.scheduledRedundantNewTicketWork;
          }
        } else {
          // unknown circumstances
          throw Error('Unrecognized worker schedule');
        }
      }
      workIteration.started = true;
      if (schedule.availableTimeSlots[0].duration >= workIteration.time) {
        // enough time to complete the iteration
        newWorkEvent = new scheduledWorkClass(
          contextSwitchEvent.endTime,
          workIteration.time,
          ticket,
          contextSwitchEvent,
          this.earliestAvailableDayForWorkIndex,
          firstIteration,
          finalIteration,
        );
        this.timeOfNextWorkIterationCompletion = newWorkEvent.endTime;
      } else {
        // not enough time to complete the iteration
        newWorkEvent = new scheduledWorkClass(
          contextSwitchEvent.endTime,
          schedule.availableTimeSlots[0].duration,
          ticket,
          contextSwitchEvent,
          this.earliestAvailableDayForWorkIndex,
          firstIteration,
          finalIteration,
        );
      }
      workIteration.time -= newWorkEvent.duration;
      schedule.scheduleMeeting(newWorkEvent);
      lastWorkEvent = newWorkEvent;
    }
    // Because of how the logic works, the ticket's
    // 'needsCodeReview'/'needsAutomation' status may be misleading during a
    // simulation. The ticket's 'needsCodeReview'/'needsAutomation'
    // status is set to true immediately after the work iteration for that ticket was
    // scheduled, or set to false immediately after the work iteration for code
    // review/checking was scheduled. So if a programmer grabbed a ticket to code
    // review it changes at 001, and it would take them until 030 to finish, the work
    // would be scheduled when the simulation is at 001, and the 'needsCodeReview'
    // status of the ticket would be set to false, even though the simulation would
    // still be at 001. This works similarly for a tester doing checking.
    //
    // Because of this, be mindful of the point in the iteration of the
    // simulation loop that this information is being queried at. For logging
    // the stack, this is done at the beginning of the iteration before any new
    // scheduling of work occurs (to better indicate the boundaries of when the
    // stacks changed). So if a ticket that a programmer was working on at that
    // moment had 'needsCodeReview' set to false, it would mean that that
    // programmer was doing code review on that ticket, rather than writing the
    // code for it.
    if (this instanceof ProgrammerSchedule) {
      // If the Programmer just finished scheduling the changes for this ticket,
      // then the ticket will need to be code reviewed by another programmer. If
      // a programmer just code reviewed it, it should be set to false and then
      // passed to QA. If QA needs to send it back to the original programmer,
      // then it staying set to false will make sure that code review work isn't
      // scheduled by mistake.
      ticket.needsCodeReview = !needsCodeReview;
    }
    if (this instanceof QaSchedule && finalIteration) {
      // final check has just been completed
      ticket.needsAutomation = !needsAutomation;
    }
    if (lastWorkEvent) {
      return lastWorkEvent.day * 480 + lastWorkEvent.endTime;
    }
    return false;
  }
}

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
      let previousSprintDaySchedule = this.daySchedules[i];
      let currentSprintI = this.daySchedules.length - (regressionTestDayCount - i);
      let currentSprintDaySchedule = this.daySchedules[currentSprintI];
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
