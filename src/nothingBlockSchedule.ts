import { Ticket } from './ticket';
import { WorkIteration } from './workIteration';
import {
  ContextSwitchEvent,
  NothingEvent,
  ScheduledEvent,
} from './event';
import { DaySchedule } from './';
import { BaseDaySchedule } from './schedule/baseDaySchedule';
import { NothingBlockDaySchedule } from './nothingBlock';

export class NothingBlockSchedule {
  daySchedules: BaseDaySchedule[] = [];
  constructor(
    public nothingBlocks: NothingEvent[],
  ) {
    for (let i = 0; i < this.nothingBlocks.length; i++) {
      const schedule = new NothingBlockDaySchedule(i, nothingBlocks[i]);
      this.daySchedules.push(schedule);
    }
  }

  get earliestAvailableDayForWorkIndex(): number {
    for (let i = 0; i < this.daySchedules.length; i++) {
      if (this.daySchedules[i].availableTimeSlots.length > 0) {
        return i;
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

  addWork(ticket: Ticket, workIteration: WorkIteration) {
    const firstIteration = ticket.firstIteration;
    const finalIteration = !ticket.testerWorkIterations.length;
    while (workIteration && workIteration.time > 0) {
      if (this.earliestAvailableDayForWorkIndex === -1) {
        throw RangeError('Not enough time left in the sprint to finish this ticket');
      }
      const schedule = this.earliestAvailableDayScheduleForWork!;
      const contextSwitchTime = Math.round(Math.random() * (30 - 10) + 10);
      const contextSwitchEvent = new ContextSwitchEvent(
        schedule.availableTimeSlots[0].startTime,
        contextSwitchTime,
        ticket,
        this.earliestAvailableDayForWorkIndex,
        firstIteration,
        finalIteration,
      );
      schedule.scheduleMeeting(contextSwitchEvent);
      let newWorkEvent;
      workIteration.started = true;
      if (schedule.availableTimeSlots[0].duration >= workIteration.time) {
        // enough time to complete the iteration
        newWorkEvent = new ScheduledEvent(
          contextSwitchEvent.endTime,
          workIteration.time,
          this.earliestAvailableDayForWorkIndex,
        );
      } else {
        // not enough time to complete the iteration
        newWorkEvent = new ScheduledEvent(
          contextSwitchEvent.endTime,
          schedule.availableTimeSlots[0].duration,
          this.earliestAvailableDayForWorkIndex,
        );
      }
      workIteration.time -= newWorkEvent.duration;
      schedule.scheduleMeeting(newWorkEvent);
    }
  }
}
