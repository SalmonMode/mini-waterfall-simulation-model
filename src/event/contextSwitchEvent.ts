import { Ticket } from '../ticket';
import { ScheduledEvent } from './scheduledEvent';

export class ContextSwitchEvent extends ScheduledEvent {
  relevantMinutes = ['contextSwitchingMinutes'];
  title = 'Context Switching';
  constructor(
    public startTime: number,
    public duration: number,
    public ticket: Ticket,
    public day: number,
    public firstIteration: boolean = true,
    public lastIteration: boolean = true,
  ) {
    super(startTime, duration, day);
    this.ticket = ticket;
    this.firstIteration = firstIteration;
    this.lastIteration = lastIteration;
  }
}
