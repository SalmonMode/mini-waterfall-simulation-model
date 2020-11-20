import { Ticket } from "../ticket";
import { ContextSwitchEvent } from "./contextSwitchEvent";
import { ScheduledEvent } from "./scheduledEvent";

export class ScheduledTicketWork extends ScheduledEvent {
  // ScheduledTicketWork is work for a ticket that either a programmer or tester is
  // doing. ScheduledTicketWork will always require up to 30 minutes after any prior
  // event in order to context switch. If 30 minutes or less would only be available
  // before the next event, then work on a new ticket won't be scheduled. But if work
  // was already being done on a ticket, an attempt to schedule some work will be made,
  // although it may be only enough to context switch before time runs out.
  constructor(
    public startTime: number,
    public duration: number,
    public ticket: Ticket,
    public contextSwitchEvent: ContextSwitchEvent,
    public day: number,
    public firstIteration: boolean = true,
    public lastIteration: boolean = true,
  ) {
    super(startTime, duration, day);
    this.ticket = ticket;
    this.contextSwitchEvent = contextSwitchEvent;
    this.firstIteration = firstIteration;
    this.lastIteration = lastIteration;
  }
}
