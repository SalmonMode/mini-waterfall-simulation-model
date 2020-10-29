import { Ticket } from './ticket';

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

export class Meeting extends ScheduledEvent {
  relevantMinutes = ['meetingMinutes'];
}

export class DailyStandup extends Meeting {
  title = 'Daily Standup';
}

export class SprintPlanning extends Meeting {
  title = 'Sprint Planning';
}

export class SprintRetro extends Meeting {
  title = 'Sprint Retro';
}

export class RegressionTesting extends ScheduledEvent {
  relevantMinutes = ['regressionTestingMinutes'];
  title = 'Regression Testing';
}

export class NothingEvent extends ScheduledEvent {
  // Nothing is done during this period of time. This is solely used to make logic
  // easier, and is placed in a schedule when it's determined that no work can be done
  // because it will take too long to switch contexts and get anything productive
  // done.
  relevantMinutes = ['nothingMinutes'];
  title = 'Nothing';
}

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

export class LunchBreak extends Meeting {
  // Extends Meeting because meetings can be stacked back to back without having to
  // worry about context switching between them, and when leading up to a meeting, if
  // the prior ScheduledEvent ended less than or equal to 30 minutes before it, then new
  // work won't be started. These are all true for Lunch as well.
  title = 'Lunch';
}

class LunchAndLearn extends LunchBreak {
  // Just like lunch, except treated like a meeting. Can replace any instance of
  // lunch, provided it doesn't conflict.
  title = 'Lunch & Learn';
}

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

class ScheduledCoreTicketWork extends ScheduledTicketWork {
  // This is exactly like ScheduledTicketWork, except it can't be placed in between a
  // prior event's end and a Meeting (even Lunch), if that next Meeting starts 30
  // minutes or less after the prior event.
}
export class ScheduledTicketProgrammingWork extends ScheduledTicketWork {
  title = 'Programming Work';
}
export class ScheduledTicketCheckingWork extends ScheduledTicketWork {
  title = 'Checking';
}
export class ScheduledTicketAutomationWork extends ScheduledTicketWork {
  title = 'Automation';
}
export class ScheduledTicketCodeReviewWork extends ScheduledTicketWork {
  title = 'Code Review';
}

export class ScheduledCoreTicketProgrammingWork extends ScheduledTicketProgrammingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'programmingMinutes', 'productiveProgrammingTicketWorkMinutes'];
}

export class ScheduledCoreTicketCheckingWork extends ScheduledTicketCheckingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'checkingMinutes', 'productiveCheckingTicketWorkMinutes'];
}
export class ScheduledCoreTicketAutomationWork extends ScheduledTicketAutomationWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'automationMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
export class ScheduledCoreTicketCodeReviewWork extends ScheduledTicketCodeReviewWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'codeReviewMinutes', 'productiveCodeReviewTicketWorkMinutes'];
}

export class ScheduledRedundantNewTicketProgrammingWork extends ScheduledCoreTicketProgrammingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'programmingMinutes', 'redundantProgrammingTicketWorkMinutes'];
}
export class ScheduledRedundantNewTicketCheckingWork extends ScheduledCoreTicketCheckingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'checkingMinutes', 'redundantCheckingTicketWorkMinutes'];
}
// Not real because testers would be responsible in this system for making sure their
// checks work completely before committing them (ideally).
// class ScheduledRedundantNewTicketAutomationWork extends ScheduledCoreTicketAutomationWork {}
export class ScheduledRedundantNewTicketCodeReviewWork extends ScheduledCoreTicketCodeReviewWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'codeReviewMinutes', 'redundantCodeReviewTicketWorkMinutes'];
}

export class ScheduledCorePreviouslyInterruptedTicketProgrammingWork extends ScheduledTicketProgrammingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'programmingMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
export class ScheduledCorePreviouslyInterruptedTicketCheckingWork extends ScheduledTicketCheckingWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'checkingMinutes', 'productiveCheckingTicketWorkMinutes'];
}
export class ScheduledCorePreviouslyInterruptedTicketAutomationWork extends ScheduledTicketAutomationWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'automationMinutes', 'productiveProgrammingTicketWorkMinutes'];
}
export class ScheduledCorePreviouslyInterruptedTicketCodeReviewWork extends ScheduledTicketCodeReviewWork {
  relevantMinutes = ['productiveTicketWorkMinutes', 'codeReviewMinutes', 'productiveCodeReviewTicketWorkMinutes'];
}

export class ScheduledRedundantPreviouslyInterruptedTicketProgrammingWork extends ScheduledCorePreviouslyInterruptedTicketProgrammingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'programmingMinutes', 'redundantProgrammingTicketWorkMinutes'];
}
export class ScheduledRedundantPreviouslyInterruptedTicketCheckingWork extends ScheduledCorePreviouslyInterruptedTicketCheckingWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'checkingMinutes', 'redundantCheckingTicketWorkMinutes'];
}
// Not real because testers would be responsible in this system for making sure their
// checks work completely before committing them (ideally).
// class ScheduledRedundantPreviouslyInterruptedTicketAutomationWork extends ScheduledCorePreviouslyInterruptedTicketAutomationWork {}
export class ScheduledRedundantPreviouslyInterruptedTicketCodeReviewWork extends ScheduledCorePreviouslyInterruptedTicketCodeReviewWork {
  relevantMinutes = ['redundantTicketWorkMinutes', 'codeReviewMinutes', 'redundantCodeReviewTicketWorkMinutes'];
}

const redundantEvents = [
  ScheduledRedundantNewTicketProgrammingWork,
  ScheduledRedundantNewTicketCheckingWork,
  ScheduledRedundantNewTicketCodeReviewWork,
  ScheduledRedundantPreviouslyInterruptedTicketProgrammingWork,
  ScheduledRedundantPreviouslyInterruptedTicketCheckingWork,
  ScheduledRedundantPreviouslyInterruptedTicketCodeReviewWork,
];

class ScheduledCorePreviouslyInterruptedTicketWork extends ScheduledTicketWork {
  // Represents follow-up work for a work iteration that was interrupted and context
  // had to be re-acquired.
}
