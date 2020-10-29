import { Ticket } from './ticket';

export class StackLogEntry {
  constructor(
    public dayTimeRangeStart: number,
    public dayTimeRangeEnd: number,
    public activeDevelopment: Ticket[],
    public waitingForCodeReview: Ticket[],
    public inCodeReview: Ticket[],
    public waitingForQa: Ticket[],
    public inQa: Ticket[],
    public beingAutomated: Ticket[],
    public sentBack: Ticket[],
    public done: Ticket[],
    public waitingForAutomation: Ticket[],
    public automated: Ticket[],
  ) {}
}
