export class AvailableTimeSlot {
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
