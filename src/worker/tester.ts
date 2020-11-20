import { Worker } from './worker';
import { QaSchedule } from '../schedule';

export class Tester extends Worker {
  initializeSchedule() {
    this.schedule = new QaSchedule(
      this.sprintDayCount,
      this.regressionTestDayCount,
      this.lunchTime,
      this.customEventsByDay,
    );
  }
}
