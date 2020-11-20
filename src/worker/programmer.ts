import { Worker } from "./worker";
import { ProgrammerSchedule } from "../schedule";

export class Programmer extends Worker {
  initializeSchedule() {
    this.schedule = new ProgrammerSchedule(
      this.sprintDayCount,
      this.regressionTestDayCount,
      this.lunchTime,
      this.customEventsByDay,
    );
  }
}
