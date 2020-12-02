import { AvailableTimeSlot } from './availableTimeSlot';
import { LunchBreak } from '../event';
import { BaseDaySchedule } from './baseDaySchedule';

export class DaySchedule extends BaseDaySchedule {
  constructor(lunchTime: number, public day: number) {
    super(day);
    this.availableTimeSlots.push(new AvailableTimeSlot(null, 0, 480));
    const lunch = new LunchBreak(lunchTime, 60, this.day);
    this.scheduleMeeting(lunch);
  }
}
