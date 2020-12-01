export class WorkIteration {
  public started: boolean;
  public originalTime: number;
  constructor(public time: number) {
    this.time = time;
    this.started = false;
    this.originalTime = time;
  }
}
