export class WorkIteration {
  public started: boolean;
  constructor(public time: number) {
    this.time = time;
    this.started = false;
  }
}
