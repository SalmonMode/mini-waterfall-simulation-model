import { AvailableTimeSlot } from './schedule/availableTimeSlot';
import { NothingEvent } from './event';
import { BaseDaySchedule } from './schedule/baseDaySchedule';

export class NothingBlockDaySchedule extends BaseDaySchedule {
  constructor(public day: number, nothingEvent: NothingEvent) {
    super(day);
    this.availableTimeSlots.push(new AvailableTimeSlot(null, 0, nothingEvent.endTime - nothingEvent.startTime))
  }
}
