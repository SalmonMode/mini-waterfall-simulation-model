import { AvailableTimeSlot } from './schedule/availableTimeSlot';
import { ScheduledEvent, NothingEvent, ContextSwitchEvent } from './event';
import { BaseDaySchedule } from './schedule/baseDaySchedule';

export class NothingBlockDaySchedule extends BaseDaySchedule {
  constructor(public day: number, nothingEvent: NothingEvent) {
    super(day);
    this.availableTimeSlots.push(new AvailableTimeSlot(null, 0, nothingEvent.endTime - nothingEvent.startTime))
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
      if (!eventsAdded && event.startTime >= timeSlot.startTime && event.endTime <= timeSlot.endTime) {
        // event fits here
        matchingTimeSlotIndex = timeSlotIndex;

        // Add possible NothingEvent to schedule items, or AvailableTimeSlot to schedule's available time slots.
        const startTimeDiff = event.startTime - timeSlot.startTime;
        if (startTimeDiff > 0) {
          if (startTimeDiff <= 30) {
            // just enough time to do nothing
            const newNothingEvent = new NothingEvent(timeSlot.startTime, startTimeDiff, this.day);
            if (timeSlot.nextEventIndex === null) {
              this.items.push(newNothingEvent);
            } else {
              this.items.splice(timeSlot.nextEventIndex, 0, newNothingEvent);
            }
            eventsAdded += 1;
          } else {
            let newTimeSlotNextEventIndex: number;
            if (timeSlot.nextEventIndex === null) {
              newTimeSlotNextEventIndex = this.items.length;
            } else {
              newTimeSlotNextEventIndex = timeSlot.nextEventIndex;
            }
            newAvailableTimeSlots.push(
              new AvailableTimeSlot(newTimeSlotNextEventIndex, timeSlot.startTime, event.startTime),
            );
          }
        }

        // add event to schedule items
        if (timeSlot.nextEventIndex === null) {
          this.items.push(event);
        } else {
          this.items.splice(timeSlot.nextEventIndex + eventsAdded, 0, event);
        }
        eventsAdded += 1;

        // Add possible NothingEvent to schedule items, or AvailableTimeSlot to schedule's available time slots.
        const endTimeDiff = timeSlot.endTime - event.endTime;
        if (endTimeDiff > 0) {
          if (endTimeDiff <= 30 && !(event instanceof ContextSwitchEvent)) {
            // just enough time to do nothing
            const newNothingEvent = new NothingEvent(event.endTime, endTimeDiff, this.day);
            if (timeSlot.nextEventIndex === null) {
              this.items.push(newNothingEvent);
            } else {
              this.items.splice(timeSlot.nextEventIndex + eventsAdded, 0, newNothingEvent);
            }
            eventsAdded += 1;
          } else {
            // still room to do something (or the next thing being scheduled will be the ticket work)
            let newTimeSlotNextEventIndex: null | number;
            if (timeSlot.nextEventIndex === null) {
              newTimeSlotNextEventIndex = null;
            } else {
              newTimeSlotNextEventIndex = timeSlot.nextEventIndex + eventsAdded;
            }
            newAvailableTimeSlots.push(
              new AvailableTimeSlot(newTimeSlotNextEventIndex, event.endTime, timeSlot.endTime),
            );
          }
        }
      }
    }
    if (!eventsAdded) {
      // event conflicts
      throw Error('Event conflicts with another event');
    }
    // update remaining time slots so they're `nextEventIndex` properties are increased
    // as necessary, based on the number of events added.
    for (let i = matchingTimeSlotIndex + 1; i < this.availableTimeSlots.length; i++) {
      const timeSlot = this.availableTimeSlots[i];
      if (timeSlot.nextEventIndex !== null) {
        timeSlot.nextEventIndex += eventsAdded;
      }
    }
    // Merge in newly defined AvailableTimeSlots if applicable.
    this.availableTimeSlots.splice(matchingTimeSlotIndex, 1, ...newAvailableTimeSlots);
  }
}
