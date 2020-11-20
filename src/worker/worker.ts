import { Ticket, QaSchedule, ProgrammerSchedule, CustomEventsByDayList, ScheduledTicketWork } from "..";
import { WorkerMinutes } from "./workerMinutes";

export abstract class Worker implements WorkerMinutes {
  tickets: Ticket[] = [];
  nextWorkIterationCompletionCheckIn: number | null = null;
  // These arrays track the minutes in the dayTime format (e.g. 1455 for day 4 at
  // 10AM), which will be useful for determining how much time was spent on
  // a particular event type up to a certain dayTime, because the index of that
  // dayTime (plus 1) will be the total amount of minutes spent doing that kind of
  // event up until that dayTime. An optimized binary search (possibly changing
  // for each event type for better performance) can be used to efficiently find
  // a given dayTime, using techniques such as setting the given dayTime as the
  // search's upper bound index (after subtracting the time for regression tests,
  // as those minutes from the previous sprint aren't tracked).
  //
  // If the searched for time doesn't match a minute that was tracked (e.g. a
  // dayTime of 1678 was searched for to find meeting minutes, but on meetings
  // were happening at that time), then the search algorithm can just round down
  // to the closest minute that it can find, which makes searching still cheap.
  //
  // This simulation requires the regression test period from the previous sprint
  // to also be simulated (as it reflects real scenarios and creates a basis of
  // available work so QA can start on tickets on the first day of the observed
  // sprint), and those minutes are counted to show how this process affects
  // things from a holistic perspective.
  contextSwitchingMinutes: number[] = [];
  meetingMinutes: number[] = [];
  productiveTicketWorkMinutes: number[] = [];
  redundantTicketWorkMinutes: number[] = [];
  programmingMinutes: number[] = [];
  fluffProgrammingMinutes: number[] = [];
  nonFluffProgrammingMinutes: number[] = [];
  productiveProgrammingTicketWorkMinutes: number[] = [];
  redundantProgrammingTicketWorkMinutes: number[] = [];
  codeReviewMinutes: number[] = [];
  fluffCodeReviewMinutes: number[] = [];
  nonFluffCodeReviewMinutes: number[] = [];
  productiveCodeReviewTicketWorkMinutes: number[] = [];
  redundantCodeReviewTicketWorkMinutes: number[] = [];
  // TODO: This array tracks minutes that were spent recovering from an interruption,
  // other than Lunch, and an end of day that was reached without going through a
  // meeting. So if the day ended with SprintRetro, and the worker was in the
  // middle of a work iteration, the ContextSwitchEvent before they began work on
  // that work iteration would count towards this, as would a meeting in the
  // middle of the day. This may not be immediately relevant, but may come in
  // handy if other meetings are implemented.
  productivityRecoveryMinutes: number[] = [];
  checkingMinutes: number[] = [];
  fluffCheckingMinutes: number[] = [];
  nonFluffCheckingMinutes: number[] = [];
  productiveCheckingTicketWorkMinutes: number[] = [];
  redundantCheckingTicketWorkMinutes: number[] = [];
  regressionTestingMinutes: number[] = [];
  automationMinutes: number[] = [];
  // Time spent doing nothing because there was no time to get started on anything
  // before a meeting, lunch, or the end of the day came up.
  nothingMinutes: number[] = [];
  minutesGenerated: boolean = false;
  schedule!: QaSchedule | ProgrammerSchedule;
  constructor(
    public name: string,
    public sprintDayCount: number,
    public regressionTestDayCount: number,
    public lunchTime: number,
    public customEventsByDay: CustomEventsByDayList,
  ) {
    this.initializeSchedule();
  }
  abstract initializeSchedule(): void;
  processEventMinutes() {
    // Called at the end of the simulation, as the events will all be added and this
    // can most efficiently iterate over them to determine the minutes and load them
    // into the minute arrays.
    for (const day of this.schedule.daySchedules) {
      for (const event of day.items) {
        // generates range of numbers representing the duration of the event for
        // the time range it took place. A 1 is added in the mapping to reflect
        // how the information would be queried for. A meeting can start at
        // dayTime 0, but if that dayTime is queried for, the response should be
        // 0 minutes. The index of the timestamp plus 1 represents the number of
        // minutes of the cumulative duration of events of that type.
        const eventMinutes = Array.from(Array(event.duration).keys()).map((i) => i + event.rawStartDayTime + 1);
        for (const category of event.relevantMinutes) {
          this[category as keyof WorkerMinutes]!.push(...eventMinutes);
        }
        if (event.relevantMinutes.includes('programmingMinutes')) {
          if ((event as ScheduledTicketWork).ticket.unfinished) {
            this.fluffProgrammingMinutes.push(...eventMinutes);
          } else {
            this.nonFluffProgrammingMinutes.push(...eventMinutes);
          }
        }
        if (event.relevantMinutes.includes('codeReviewMinutes')) {
          if ((event as ScheduledTicketWork).ticket.unfinished) {
            this.fluffCodeReviewMinutes.push(...eventMinutes);
          } else {
            this.nonFluffCodeReviewMinutes.push(...eventMinutes);
          }
        }
        if (event.relevantMinutes.includes('checkingMinutes')) {
          if ((event as ScheduledTicketWork).ticket.unfinished) {
            this.fluffCheckingMinutes.push(...eventMinutes);
          } else {
            this.nonFluffCheckingMinutes.push(...eventMinutes);
          }
        }
      }
    }
    this.minutesGenerated = true;
  }
  getMeetingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.meetingMinutes, dayTime);
  }
  getContextSwitchingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.contextSwitchingMinutes, dayTime);
  }
  getProductiveTicketWorkMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.productiveTicketWorkMinutes, dayTime);
  }
  getRedundantTicketWorkMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.redundantTicketWorkMinutes, dayTime);
  }
  getCodeReviewMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.codeReviewMinutes, dayTime);
  }
  getFluffCodeReviewMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.fluffCodeReviewMinutes, dayTime);
  }
  getNonFluffCodeReviewMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.nonFluffCodeReviewMinutes, dayTime);
  }
  getProductiveCodeReviewMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.productiveCodeReviewTicketWorkMinutes, dayTime);
  }
  getRedundantCodeReviewMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.redundantCodeReviewTicketWorkMinutes, dayTime);
  }
  getProgrammingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.programmingMinutes, dayTime);
  }
  getFluffProgrammingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.fluffProgrammingMinutes, dayTime);
  }
  getNonFluffProgrammingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.nonFluffProgrammingMinutes, dayTime);
  }
  getProductiveProgrammingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.productiveProgrammingTicketWorkMinutes, dayTime);
  }
  getRedundantProgrammingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.redundantProgrammingTicketWorkMinutes, dayTime);
  }
  getCheckingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.checkingMinutes, dayTime);
  }
  getFluffCheckingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.fluffCheckingMinutes, dayTime);
  }
  getNonFluffCheckingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.nonFluffCheckingMinutes, dayTime);
  }
  getProductiveCheckingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.productiveCheckingTicketWorkMinutes, dayTime);
  }
  getRedundantCheckingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.redundantCheckingTicketWorkMinutes, dayTime);
  }
  getProductivityRecoveryMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.productivityRecoveryMinutes, dayTime);
  }
  getRegressionTestingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.regressionTestingMinutes, dayTime);
  }
  getAutomationMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.automationMinutes, dayTime);
  }
  getNothingMinutesAtDayTime(dayTime: number) {
    return this.getMinutesOfTypeAtDayTime(this.nothingMinutes, dayTime);
  }
  getMinutesOfTypeAtDayTime(minutesArr: number[], dayTime: number) {
    // binary search
    //
    // Finds the index of the dayTime, or the index representing a dayTime that's
    // the closest to the desired dayTime without going over. The index of that
    // dayTime represents the number of minutes spent on that particular type up to
    // that point in time.
    if (!this.minutesGenerated) {
      this.processEventMinutes();
    }
    if (minutesArr.length === 0) {
      return 0;
    }

    let ceilingIndex = Math.min(dayTime, minutesArr.length) - 1;
    // ceilingValue represents the dayTime at that index
    const ceilingValue = minutesArr[ceilingIndex];
    if (ceilingValue <= dayTime) {
      // rule out the initial ceiling value to make the while loop more efficient.
      // If it's ruled out here, the loop can assume that at some point, the
      // ceilingIndex will have been a currentIndex in a previous iteration.
      return ceilingIndex + 1;
    }

    let floorIndex = 0;
    const floorValue = minutesArr[floorIndex];
    if (floorValue > dayTime) {
      // Requested dayTime must have been before any times were stored
      return 0;
    } else if (floorValue === dayTime) {
      // Requested dayTime must have been the first dayTime stored
      return 1;
    }
    while (true) {
      const currentIndex = Math.round((floorIndex + ceilingIndex) / 2);
      const foundTime = minutesArr[currentIndex];
      if (foundTime === dayTime) {
        return currentIndex + 1;
      }
      if (foundTime < dayTime) {
        if (ceilingIndex - currentIndex === 1) {
          // either the currentIndex or the ceilingIndex points at the
          // appropriate minute count, and the ceilingIndex was either ruled
          // out before the loop, or in a previous iteration.
          return currentIndex + 1;
        }
        // shift right to the next iteration
        floorIndex = currentIndex;
        continue;
      }
      // foundTime must be greater than the dayTime, but the dayTime must also be
      // greater than the floorValue
      if (currentIndex - floorIndex === 1) {
        // the floorIndex is the only index representing the closest minute to
        // the dayTime without going over
        return floorIndex + 1;
      }
      // shift left to the next iteration
      ceilingIndex = currentIndex;
      continue;
    }
  }
  addTicket(ticket: Ticket) {
    if (!this.tickets.includes(ticket)) {
      this.tickets.push(ticket);
    }
  }
  get nextCheckInTime() {
    // The next time this worker should be checked in on, either because they would
    // have just finished working on an iteration of a ticket, or they would have
    // time available to work then.
    const iterationCompleteCheckIn = this.nextWorkIterationCompletionCheckIn;
    const availabilityCheckIn = this.nextAvailabilityCheckIn;
    if (iterationCompleteCheckIn === null) {
      // work hasn't been added yet, so there isn't a need to check for completed
      // work, and this can defer to the availability
      return availabilityCheckIn;
    }
    // there is a chance that earliest day/time may be -1, but that would mean
    // that there's no time left in the sprint, so there'd be no reason to check
    // in on this worker. As a result, this evaluating to a negative number is
    // expected as it can be used in other contexts.
    return Math.min(iterationCompleteCheckIn, availabilityCheckIn);
  }

  get nextAvailabilityCheckIn() {
    // The return value is in minutes, but each day prior is multiplied by 480 (the
    // number of minutes in a day) and then added to the minutes. So if the next
    // check-in time should be on the 5th day (which is actually the 4th because of
    // zero indexing) at the 332 minute, that would be (4 * 480) + 332.
    //
    // If needed, the day can be found again by dividing by 480 and then rounding
    // down.
    const earliestDayIndex = this.schedule.earliestAvailableDayForWorkIndex;
    if (earliestDayIndex < 0) {
      return -1;
    }
    const earliestTime = this.schedule.daySchedules[earliestDayIndex].availableTimeSlots[0].startTime;
    return earliestTime + earliestDayIndex * 480;
  }
}
