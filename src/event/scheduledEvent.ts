export class ScheduledEvent {
  endTime: number;
  rawStartDayTime: number;
  rawEndDayTime: number;
  relevantMinutes: string[] = [];
  constructor(readonly startTime: number, readonly duration: number, public day: number, public title?: string) {
    this.startTime = startTime;
    this.duration = duration;
    this.endTime = startTime + duration;
    this.day = day;
    this.rawStartDayTime = this.day * 480 + this.startTime;
    this.rawEndDayTime = this.rawStartDayTime + this.duration;
    this.title = title || this.title;
  }
}
