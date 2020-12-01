import { CustomEventsByDayList } from './customEventsByDayList';
import { NothingEvent, ScheduledEvent } from './event';
import { NothingBlockDaySchedule } from './nothingBlock';
import { NothingBlockSchedule } from './nothingBlockSchedule';
import { StackLogEntry } from './stackLogEntry';
import { Ticket } from './ticket';
import { TicketFactory } from './ticketFactory';
import { Programmer, Tester } from './worker';
import { WorkIteration } from './workIteration';

interface WorkerMinuteSnapshot {
  meeting: number;
  contextSwitching: number;
  productiveTicketWork: number;
  redundantTicketWork: number;
  programming: number;
  fluffProgramming: number;
  nonFluffProgramming: number;
  codeReview: number;
  fluffCodeReview: number;
  nonFluffCodeReview: number;
  checking: number;
  fluffChecking: number;
  nonFluffChecking: number;
  productiveProgrammingTicketWorkMinutes: number;
  redundantProgrammingTicketWorkMinutes: number;
  productiveCodeReviewTicketWorkMinutes: number;
  redundantCodeReviewTicketWorkMinutes: number;
  productiveCheckingTicketWorkMinutes: number;
  redundantCheckingTicketWorkMinutes: number;
  regressionTesting: number;
  automation: number;
  nothing: number;
}

interface WorkerDataForDayTime {
  workers: WorkerMinuteSnapshot[];
  cumulativeMinutes: WorkerMinuteSnapshot;
  logEntry: StackLogEntry;
  prettyDayTime: string;
}

interface TesterNothingBlock {
  tester: Tester;
  nothingBlockSchedule: NothingBlockSchedule;
}

export class Simulation {
  readonly dayLengthInMinutes: number = 480;
  lunchTime: number;
  totalDays: number;
  totalSprintMinutes: number;
  totalSimulationMinutes: number;
  simulationEndDay: number;
  simulationEndTime: number;
  simulationEndDayTime: number;
  ticketFactory: TicketFactory;
  tickets: Ticket[] = [];
  sprintTickets: Ticket[] = [];
  qaStack: Ticket[] = [];
  needsAutomationStack: Ticket[] = [];
  automatedStack: Ticket[] = [];
  passBackStack: Ticket[] = [];
  doneStack: Ticket[] = [];
  unfinishedStack: Ticket[] = [];
  codeReviewStack: Ticket[] = [];
  stackTimelineHashMap: StackLogEntry[] = [];
  stackTimelineSets: StackLogEntry[] = [];
  private secretProjectedSprintCountUntilDeadlock!: number | null;
  programmers!: Programmer[];
  testers!: Tester[];
  workers!: (Programmer | Tester)[];
  currentDay: number = 0;
  currentTime: number = 0;
  currentDayTime: number = 0;
  previousDay: number | null = null;
  previousTime: number | null = null;
  previousDayTime: number | null = null;
  workerDataForDayTime: WorkerDataForDayTime[] = [];
  constructor(
    public sprintDayCount: number = 10,
    public regressionTestDayCount: number = 2,
    public dayStartTime: number = 10,
    public programmerCount: number = 5,
    public testerCount: number = 1,
    public maxInitialProgrammerWorkTimeInHours: number = 16,
    public maxFullRunTesterWorkTimeInHours: number = 8,
    public maxQaAutomationTime: number = 8,
    public averagePassBackCount: number = 1,
    public checkRefinement: number = 0.3,
    public customEventsByDay: CustomEventsByDayList[] | null = null,
  ) {
    this.lunchTime = (12 - this.dayStartTime) * 60;
    this.totalDays = this.sprintDayCount + this.regressionTestDayCount;
    this.totalSprintMinutes = sprintDayCount * this.dayLengthInMinutes;
    this.totalSimulationMinutes = this.totalSprintMinutes + regressionTestDayCount * this.dayLengthInMinutes;
    this.simulationEndDay = this.totalDays;
    this.simulationEndTime = this.dayLengthInMinutes;
    this.simulationEndDayTime = this.dayTimeFromDayAndTime(this.simulationEndDay, this.simulationEndTime);
    if (this.customEventsByDay === null) {
      // One array for each worker, each containing one array for each day of the sprint
      this.customEventsByDay = Array.from(Array(this.programmerCount + this.testerCount)).map(() =>
        Array.from(Array(this.totalDays)).map(() => []),
      );
    }
    this.prepareWorkers();
    this.ticketFactory = new TicketFactory(
      this.maxInitialProgrammerWorkTimeInHours,
      this.maxFullRunTesterWorkTimeInHours,
      this.maxQaAutomationTime,
      this.averagePassBackCount,
    );
  }
  get projectedSprintCountUntilDeadlock(): number | null {
    if (this.secretProjectedSprintCountUntilDeadlock === undefined) {
      throw Error('Simulation must simulate to establish a projected deadlock');
    }
    return this.secretProjectedSprintCountUntilDeadlock;
  }
  prepareWorkers() {
    const customEventsByDay = this.customEventsByDay!.slice();
    this.programmers = [];
    for (let i = 0; i < this.programmerCount; i++) {
      const prog = new Programmer(
        `${Programmer.name} #${i + 1}`,
        this.sprintDayCount,
        this.regressionTestDayCount,
        this.lunchTime,
        customEventsByDay.shift()!,
      );
      this.programmers.push(prog);
    }
    this.testers = [];
    for (let i = this.programmerCount; i < this.testerCount + this.programmerCount; i++) {
      const t = new Tester(
        `${Tester.name} #${i + 1 - this.programmerCount}`,
        this.sprintDayCount,
        this.regressionTestDayCount,
        this.lunchTime,
        customEventsByDay.shift()!,
      );
      this.testers.push(t);
    }
    this.workers = [...this.programmers, ...this.testers];
  }
  simulate() {
    let nextCheckInTime = this.getNextCheckInTime()!;
    this.currentDay = Math.floor(nextCheckInTime / this.dayLengthInMinutes);
    this.currentTime = nextCheckInTime % this.dayLengthInMinutes;
    this.currentDayTime = this.dayTimeFromDayAndTime(this.currentDay, this.currentTime);
    while (this.currentDayTime <= this.simulationEndDayTime && this.currentDayTime >= 0) {
      // process potentially completed work first
      this.processProgrammerCompletedWork();
      this.processTesterCompletedWork();
      // process handing out new work after all available tickets have been
      // determined
      this.handOutNewProgrammerWork();
      this.backfillUntilDayTimeTesterScheduleForTimeTheySpentDoingNothing(this.currentDayTime);
      this.handOutNewTesterWork();
      nextCheckInTime = this.getNextCheckInTime()!;
      if (nextCheckInTime === this.currentDayTime) {
        throw Error('DayTime would not progress');
      }
      this.previousDay = this.currentDay;
      this.previousTime = this.currentTime;
      this.previousDayTime = this.currentDayTime;
      this.currentDay = Math.floor(nextCheckInTime / this.dayLengthInMinutes);
      this.currentTime = nextCheckInTime % this.dayLengthInMinutes;
      this.currentDayTime = this.dayTimeFromDayAndTime(this.currentDay, this.currentTime);
      let logEndTime = this.currentDayTime;

      if (nextCheckInTime < 0) {
        // no more check-ins for this sprint, so set both values to -1 to exit the
        // loop. Add stack log entries from this time to the end of the sprint
        // because whatever the stacks are now will be what they are at the end of
        // the sprint.

        // set log end time to the last minute of the simulated time, so it
        // isn't a negative number
        logEndTime = this.simulationEndDayTime;
      }
      this.generateStackLogEntriesForDayTimeRange(this.previousDayTime, logEndTime);
    }
    this.unfinishedStack.concat([...this.qaStack, ...this.passBackStack]);
    this.mergeNothingMinutes();
    this.aggregateMinutesSpent();
    this.projectDeadlock();
  }
  mergeNothingMinutes() {
    /*
    It's possible for testers to have multiple NothingEvents in a line in their
    schedules, due to how they may have to wait for work to become available. This will
    merge those together into larger NothingEvents, which will make going back through
    to see what they may have time to automated next sprint much easier.

    This should only be called once the sprint has finished simulating, as it will
    assume there's no available time slots to worry about.
     */
    for (const tester of this.testers) {
      for (const daySchedule of tester.schedule.daySchedules) {
        let eventIndex = 0;
        while (eventIndex < daySchedule.items.length) {
          const currEvent = daySchedule.items[eventIndex];
          if (currEvent instanceof NothingEvent) {
            let nextEventIndex = 0;
            while (eventIndex + nextEventIndex < daySchedule.items.length) {
              const nextEventInSequence = daySchedule.items[eventIndex + nextEventIndex];
              nextEventIndex++;
              if (!(nextEventInSequence instanceof NothingEvent)) {
                break;
              }
            }
            if (nextEventIndex === 1) {
              // there was no sequence, so skip the replacement
              eventIndex++;
              continue;
            }
            const finalSequenceEvent = daySchedule.items[eventIndex + nextEventIndex - 1];
            const replacementEvent = new NothingEvent(
              currEvent.startTime,
              finalSequenceEvent.endTime - currEvent.startTime,
              currEvent.day,
            );
            daySchedule.items.splice(eventIndex, nextEventIndex, replacementEvent);
          }
          eventIndex++;
        }
      }
    }
  }
  getNothingBlocksForTesters(): TesterNothingBlock[] {
    const blocksForTesters = [];
    for (const tester of this.testers) {
      const nothingEvents = [];
      for (const daySchedule of tester.schedule.daySchedules) {
        for (const event of daySchedule.items) {
          if (event instanceof NothingEvent && event.duration > 30) {
            nothingEvents.push(event);
          }
        }
      }
      blocksForTesters.push({ tester, nothingBlockSchedule: new NothingBlockSchedule(nothingEvents) });
    }
    return blocksForTesters;
  }
  predictTesterPaceForNextSprint(): number {
    /*
    Find out if the testers would be able to catch up to the programmers in the next
    sprint, given the nothing time they had in this sprint.
     */
    const testerNothingBlocks = this.getNothingBlocksForTesters();
    const doneButUnautomatedTickets = this.doneStack.filter((ticket) => !this.automatedStack.includes(ticket));
    // const notDoableTickets: Ticket[] = [];
    // const partiallyDoableTickets: Ticket[] = [];
    // const doableTickets: Ticket[] = [];
    let unaccountedForTesterMinutes = 0;

    // for (const ticket of doneButUnautomatedTickets) {
    //   let attempted = false;
    //   for (const testerNothingBlock of testerNothingBlocks) {
    //     const schedule = testerNothingBlock.nothingBlockSchedule;
    //     if (schedule.earliestAvailableDayForWorkIndex < 0) {
    //       continue;
    //     }
    //     const tester = testerNothingBlock.tester;
    //     if (!tester.tickets.includes(ticket)) {
    //       continue;
    //     }
    //     attempted = true;
    //     if (ticket.programmerWorkIterations.length > ticket.testerWorkIterations.length || ticket.testerWorkIterations[0].started) {
    //       // first testerWorkIteration is relevant
    //       const iteration = ticket.testerWorkIterations[0];
    //       try {
    //         schedule.addWork(ticket, iteration);
    //       } catch (err) {
    //         if (!(err instanceof RangeError)) {
    //           throw err;
    //         }
    //         partiallyDoableTickets.push(ticket)
    //         break;
    //       }
    //     }
    //     // attempt automation
    //     const iteration = ticket.automationWorkIterations[0];
    //     try {
    //       schedule.addWork(ticket, iteration);
    //     } catch (err) {
    //       if (!(err instanceof RangeError)) {
    //         throw err;
    //       }
    //       partiallyDoableTickets.push(ticket);
    //       break;
    //     }
    //     doableTickets.push(ticket);
    //   }
    //   if (!attempted) {
    //     notDoableTickets.push(ticket);
    //   }
    // }
    // const unautomatedTickets = this.tickets.filter((ticket) => !this.automatedStack.includes(ticket));
    for (const ticket of doneButUnautomatedTickets) {
      // let attempted = false;
      for (const testerNothingBlock of testerNothingBlocks) {
        const schedule = testerNothingBlock.nothingBlockSchedule;
        if (schedule.earliestAvailableDayForWorkIndex < 0) {
          continue;
        }
        const tester = testerNothingBlock.tester;
        if (!tester.tickets.includes(ticket)) {
          continue;
        }
        // attempted = true;
        // must first catch up the check with the programming, and then consider the
        // percentage of progress made in programming, as this will be the percentage of
        // automation that would also have to be completed.
        const totalProgrammingTime: number = ticket.originalProgrammerWorkIterations.reduce( (acc: number, iter: WorkIteration) => {
          return acc + iter.originalTime;
        }, 0);
        const actualProgrammingTime: number = totalProgrammingTime - ticket.originalProgrammerWorkIterations.reduce( (acc: number, iter: WorkIteration) => {
          return acc + iter.time;
        }, 0);
        const progPercentage = actualProgrammingTime / totalProgrammingTime;
        // const checkingCatchUpTime = totalCheckingTime - actualCheckingTime;
        const relevantProgrammingIteration = ticket.originalProgrammerWorkIterations.reduce( (lastIter, nextIter) => {
          return nextIter.started ? nextIter : lastIter;
        })
        const percentProgFinished = relevantProgrammingIteration.time / relevantProgrammingIteration.originalTime;
        if (ticket.programmerWorkIterations.length > ticket.testerWorkIterations.length) {
          // Checking needs to catch up
          const relevantCheckingIteration = ticket.testerWorkIterations[0];
          const checkingCatchUpTime = relevantCheckingIteration.time * percentProgFinished;
          const catchUpIter = new WorkIteration(checkingCatchUpTime);
          try {
            schedule.addWork(ticket, catchUpIter);
          } catch (err) {
            if (!(err instanceof RangeError)) {
              throw err;
            }
            unaccountedForTesterMinutes += catchUpIter.time;
            unaccountedForTesterMinutes += Math.ceil(ticket.automationWorkIterations[0].time * progPercentage);
            break;
          }
        }

        // attempt automation
        // multiple by iteration.time instead of originalTime, in case progress has
        // already been made in automation.
        const iteration =  new WorkIteration(Math.ceil(ticket.automationWorkIterations[0].time * progPercentage));
        try {
          schedule.addWork(ticket, iteration);
        } catch (err) {
          if (!(err instanceof RangeError)) {
            throw err;
          }
          // partiallyDoableTickets.push(ticket);
          unaccountedForTesterMinutes += iteration.time;
          break;
        }
      }
    }
    const totalCheckingMinutes = this.workerDataForDayTime[this.workerDataForDayTime.length - 1].cumulativeMinutes.checking;
    const totalAutomationMinutes = this.workerDataForDayTime[this.workerDataForDayTime.length - 1].cumulativeMinutes.automation;
    const totalNeededMinutesForTesters = totalCheckingMinutes + totalAutomationMinutes + unaccountedForTesterMinutes;
    const initialGrowthRate = unaccountedForTesterMinutes / totalNeededMinutesForTesters;
    return initialGrowthRate;
  }
  projectDeadlock() {
    /*
    For each of the tickets in the done stack, consider how much time it took to do a
    complete successful check of the ones that weren't automated. Consider then how much
    this time would be refined (according to this.checkRefinement), and this would be
    the amount of additional time that needs to be allotted for regression checking.

    Consider then the percentage of available checking time that was spent doing
    complete check runs that wouldn't be automated. As the projection goes forward,
    sprint by sprint, the amount of new manual regression checking time will be
    subtracted from the remaining available check time, and the previously mentioned
    percentage will be used to estimate how much manual checking time would need to be
    factored in for how the regression checking period grows for the next sprint.

    In addition to this, when tickets aren't finished in a sprint and time was spent on
    checking iterations of them, the testers will be unable to automate them, so this
    checking time is lost and can't be saved through automation. It is essentially
    fluff, and the percentage of checking time spent on this will be used to estimate
    how much of the potential checking time would be lost each sprint. If all tickets
    that are started in a sprint get finished, then this will be 0. But if it's not 0,
    then it means the programmers are getting an opportunity to squeeze in additional
    work that only applies to subsequent sprints and so it means that there's work the
    testers can't get ahead of in the current sprint, so it will cost them time in the
    future.

    This will be projected forward, counting each sprint that could theoretically be
    done, until the remaining available time for checks is less than it would take to
    do a single checking iteration for a "small" ticket, which, for the purposes of this
    projection, will be considered to be 25% of this.maxFullRunTesterWorkTimeInHours.

    When that point is reached, it would be unreasonable to expect the testers to even
    have the opportunity to try and check something, and thus, progress will be in a
    deadlock.
     */
    if (this.doneStack.length === 0) {
      // Development was so inefficient that literally 0 tickets were finished in the
      // simulated sprint, which means there's not enough data to project into the
      // future to see when a deadlock would occur. This sets the projected sprint count
      // to Infinity to reflect that it would take so long to even get anything done in
      // the first place that it's not even worth considering.
      this.secretProjectedSprintCountUntilDeadlock = Infinity;
      return;
    }
    const initialGrowthRate = this.predictTesterPaceForNextSprint();
    if (initialGrowthRate === 0) {
      // configuration is theoretically sustainable, as it means all tickets that were
      // planned for a sprint were both completed and had the checking of them
      // automated, and any that weren't, had the potential to be in future sprints as
      // the testers had enough down time in sizable enough chunks to get it done.
      this.secretProjectedSprintCountUntilDeadlock = null;
      return;
    }
    const totalCheckingMinutes = this.workerDataForDayTime[this.workerDataForDayTime.length - 1].cumulativeMinutes.checking;
    const totalAutomationMinutes = this.workerDataForDayTime[this.workerDataForDayTime.length - 1].cumulativeMinutes.automation;
    const totalTesterWorkMinutes = totalCheckingMinutes + totalAutomationMinutes;

    let remainingWorkingMinutes = totalTesterWorkMinutes;
    let sprintsUntilDeadlock = 0;
    const estimatedMinimumCheckTimePerTicket = this.maxFullRunTesterWorkTimeInHours * 60 * 0.25;
    while (remainingWorkingMinutes > estimatedMinimumCheckTimePerTicket) {
      const totalNewManualCheckTime = Math.ceil(
        initialGrowthRate * remainingWorkingMinutes,
      );
      // const totalNewFluffCheckTime = Math.ceil(percentageOfCheckTimeSpentOnFluffChecking * remainingWorkingMinutes);
      const projectedRefinedNewRegressionCheckMinutes = (1 - this.checkRefinement) * totalNewManualCheckTime;

      remainingWorkingMinutes -= projectedRefinedNewRegressionCheckMinutes;
      // remainingWorkingMinutes -= totalNewFluffCheckTime;
      sprintsUntilDeadlock++;
    }
    this.secretProjectedSprintCountUntilDeadlock = sprintsUntilDeadlock;

    // const totalCheckingMinutes = this.workerDataForDayTime[this.workerDataForDayTime.length - 1].cumulativeMinutes
    //   .checking;
    // const totalSuccessfulCheckTime = this.doneStack.reduce(
    //   (totalTime, currentTicket) => totalTime + currentTicket.fullTesterWorkIterationTime,
    //   0,
    // );
    // const newManualCheckTimeEliminatedByAutomation = this.automatedStack.reduce(
    //   (totalTime, currentTicket) => totalTime + currentTicket.fullTesterWorkIterationTime,
    //   0,
    // );
    // // time spent checking tickets that wouldn't be finished this sprint
    // const fluffCheckingMinutes = this.workerDataForDayTime[this.workerDataForDayTime.length - 1].cumulativeMinutes
    //   .fluffChecking;
    // const percentageOfCheckTimeSpentOnFluffChecking = fluffCheckingMinutes / totalCheckingMinutes;
    // const newManualCheckTime = totalSuccessfulCheckTime - newManualCheckTimeEliminatedByAutomation;
    // if (newManualCheckTime <= 0 && fluffCheckingMinutes <= 0) {
    //   // configuration is theoretically sustainable, as it means all tickets that were
    //   // planned for a sprint were both completed and had the checking of them
    //   // automated.
    //   this.secretProjectedSprintCountUntilDeadlock = null;
    //   return;
    // }

    // const percentageOfCheckTimeSpentOnNewManualChecking = newManualCheckTime / totalCheckingMinutes;
    // let remainingCheckingMinutes = totalCheckingMinutes;
    // let sprintsUntilDeadlock = 0;
    // const estimatedMinimumCheckTimePerTicket = this.maxFullRunTesterWorkTimeInHours * 60 * 0.25;
    // while (remainingCheckingMinutes > estimatedMinimumCheckTimePerTicket) {
    //   const totalNewManualCheckTime = Math.ceil(
    //     percentageOfCheckTimeSpentOnNewManualChecking * remainingCheckingMinutes,
    //   );
    //   const totalNewFluffCheckTime = Math.ceil(percentageOfCheckTimeSpentOnFluffChecking * remainingCheckingMinutes);
    //   const projectedRefinedNewRegressionCheckMinutes = (1 - this.checkRefinement) * totalNewManualCheckTime;

    //   remainingCheckingMinutes -= projectedRefinedNewRegressionCheckMinutes;
    //   remainingCheckingMinutes -= totalNewFluffCheckTime;
    //   sprintsUntilDeadlock++;
    // }
    // this.secretProjectedSprintCountUntilDeadlock = sprintsUntilDeadlock;
  }
  dayTimeFromDayAndTime(day: number, time: number) {
    // given a day and a time, return the dayTime
    return day * this.dayLengthInMinutes + time;
  }
  generateStackLogEntriesForDayTimeRange(dayTimeRangeStart: number, dayTimeRangeEnd: number) {
    // take the stacks at the moment of this function being called, and create a
    // series of stack log entries for each minute in the given dayTime range
    const activeDevelopment = this.getTicketsCurrentlyInActiveDevelopment();
    const waitingForCodeReview = this.codeReviewStack.slice();
    const inCodeReview = this.getTicketsCurrentlyInCodeReview();
    const waitingForQa = this.qaStack.slice();
    const waitingForAutomation = this.needsAutomationStack.slice();
    const automated = this.automatedStack.slice();
    const inQa = this.getTicketsCurrentlyInQa();
    const beingAutomated = this.getTicketsCurrentlyBeingAutomated();
    const sentBack = this.passBackStack.slice();
    const done = this.doneStack.slice();
    const logEntry = new StackLogEntry(
      dayTimeRangeStart,
      dayTimeRangeEnd,
      activeDevelopment,
      waitingForCodeReview,
      inCodeReview,
      waitingForQa,
      inQa,
      beingAutomated,
      sentBack,
      done,
      waitingForAutomation,
      automated,
    );
    for (let i = dayTimeRangeStart; i < dayTimeRangeEnd; i++) {
      this.stackTimelineHashMap.push(logEntry);
    }
    this.stackTimelineSets.push(logEntry);
  }
  getTicketsCurrentlyInActiveDevelopment() {
    // Iterates over the programmers and grabs all of the tickets that they're
    // working on. Tickets being code reviewed are not considered for this, as they
    // are tracked elsewhere.
    return [
      ...this.programmers.reduce((tickets: Ticket[], programmer: Programmer) => {
        if (
          programmer.schedule.lastTicketWorkedOn &&
          programmer.schedule.lastTicketWorkedOn.programmerWorkIterations.length <
            programmer.schedule.lastTicketWorkedOn.programmerCodeReviewWorkIterations.length
        ) {
          tickets.push(programmer.schedule.lastTicketWorkedOn);
        }
        return tickets;
      }, []),
    ];
  }
  getTicketsCurrentlyInCodeReview() {
    return [
      ...this.programmers.reduce((tickets: Ticket[], programmer: Programmer) => {
        if (
          programmer.schedule.lastTicketWorkedOn &&
          programmer.schedule.lastTicketWorkedOn.programmerWorkIterations.length ===
            programmer.schedule.lastTicketWorkedOn.programmerCodeReviewWorkIterations.length
        ) {
          tickets.push(programmer.schedule.lastTicketWorkedOn);
        }
        return tickets;
      }, []),
    ];
  }
  getTicketsCurrentlyInQa() {
    return [
      ...this.testers.reduce((tickets: Ticket[], tester: Tester) => {
        if (tester.schedule.lastTicketWorkedOn) {
          tickets.push(tester.schedule.lastTicketWorkedOn);
        }
        return tickets;
      }, []),
    ];
  }
  getTicketsCurrentlyBeingAutomated() {
    return [
      ...this.testers.reduce((tickets: Ticket[], tester: Tester) => {
        if (
          tester.schedule.lastTicketWorkedOn &&
          tester.schedule.lastTicketWorkedOn.automationWorkIterations.length === 0
        ) {
          tickets.push(tester.schedule.lastTicketWorkedOn);
        }
        return tickets;
      }, []),
    ];
  }
  getNextCheckInTime(): number | null {
    const earliestWorker = this.getWorkerWithEarliestUpcomingCheckIn();
    if (
      earliestWorker instanceof Tester &&
      this.noAvailableWorkForTesters &&
      this.allProgrammersAreDoneForTheSprint &&
      this.remainingTestersHaveCheckInNow
    ) {
      // The worker with the earliest check-in was found to be a tester, but there's no
      // available work for them, they have nothing to turn in, and all the programmers
      // are done for the rest of the sprint so no new work will become available. Since
      // in this case, only a tester that was just now becoming available would be the
      // earliest worker. But since there's no new work for any of the testers to do, it
      // must mean that the simulation can be finished.
      this.backfillUntilDayTimeTesterScheduleForTimeTheySpentDoingNothing(this.totalSimulationMinutes);
      return -1;
    }
    if (earliestWorker.nextWorkIterationCompletionCheckIn! > this.currentDayTime) {
      return earliestWorker.nextWorkIterationCompletionCheckIn;
    } else {
      return earliestWorker.nextAvailabilityCheckIn;
    }
  }
  get noAvailableWorkForTesters(): boolean {
    // check for any tickets in either the qaStack or the needsAutomationStack that can
    // be claimed by any tester that is still available this sprint.
    const unavailableTesters = this.testers.filter((t) => t.nextCheckInTime < 0);
    const unclaimableTicketNumbers = unavailableTesters
      .reduce((acc: Ticket[], t) => acc.concat(t.tickets), [])
      .map((ticket) => ticket.ticketNumber);
    const availableTicketNumbers = [...this.qaStack, ...this.needsAutomationStack].map((ticket) => ticket.ticketNumber);
    return availableTicketNumbers.filter((num) => !unclaimableTicketNumbers.includes(num)).length === 0;
  }
  get allProgrammersAreDoneForTheSprint(): boolean {
    return this.programmers.every((p) => p.nextCheckInTime < 0);
  }
  get remainingTestersHaveCheckInNow(): boolean {
    return this.testers
      .map((t) => t.nextCheckInTime)
      .filter((t) => t > 0)
      .every((t) => t === this.currentDayTime);
  }
  getWorkerWithEarliestUpcomingCheckIn(): Tester | Programmer {
    // Skip ahead to the next relevant point in time. This will either be the
    // next time a worker finishes an iteration of work for a ticket, or the
    // next time a worker is available for work. These are different times
    // because a worker can finish the iteration of work for a ticket, but then
    // have a meeting before they can begin work on another ticket. This is
    // important because if they didn't wait until after the meeting to grab the
    // next available ticket for them, another, more important ticket could
    // become available for them (e.g. a ticket that had to be sent back because
    // the tester found a problem, or a programmer sent a higher priority ticket
    // to QA).
    //
    // The current day and time are needed to rule out potential check-in points
    // that have already passed. If they are in the past, they must have already
    // been handled, or, in the case of the tester, they are waiting for work to
    // become available.
    return this.workers.reduce((eWorker, nWorker) => {
      // eWorker: Probable worker with earliest check-in
      // nWorker: The next worker in the iteration.
      // both workers have a check-in time this sprint, so determine which is earlier,
      // provided both have relevant check-ins coming up.
      if (eWorker.nextAvailabilityCheckIn <= this.currentDayTime) {
        // Both of the eWorker's check-ins are in the past, or were just performed.
        // Even if the next nWorker has no check-ins coming up, there will
        // eventually be an nWorker that does, because it would be impossible for
        // all workers to have check-ins in the past if not all had a -1 check-in.
        return nWorker;
      } else if (nWorker.nextAvailabilityCheckIn <= this.currentDayTime) {
        // If eWorker check-ins are not entirely in the past, but nWorker's are,
        // then eWorker moves because it's the only relevant worker in this
        // comparison.
        return eWorker;
      }
      if (eWorker.nextAvailabilityCheckIn < eWorker.nextWorkIterationCompletionCheckIn!) {
        throw new Error('No.');
      }
      // Both have check-ins coming up. Find each of their earliest upcoming check-ins
      // and compare them to determine which worker moves forward.
      // at least one of eWorker's check-ins would have to be coming up
      let eWorkerRelevantCheckIn;
      if (eWorker.nextWorkIterationCompletionCheckIn! > this.currentDayTime) {
        // Worker has an upcoming work completion check-in. Work completion
        // check-ins must always come before, or be at the same time as availability
        // check-ins (or be null). If the completion check-in is earlier, then it must
        // be the one we want. If it's at the same time as the availability check-in,
        // then it doesn't matter which we use, so the logic is simpler if we defer to
        // the completion check-in.
        eWorkerRelevantCheckIn = eWorker.nextWorkIterationCompletionCheckIn!;
      } else {
        // The work completion check-in must have been in the past, leaving the
        // availability check-in as the only upcoming check-in for this worker.
        eWorkerRelevantCheckIn = eWorker.nextAvailabilityCheckIn;
      }
      let nWorkerRelevantCheckIn;
      if (nWorker.nextWorkIterationCompletionCheckIn! > this.currentDayTime) {
        // Worker has an upcoming work completion check-in. Work completion
        // check-ins must always come before, or be at the same time as availability
        // check-ins (or be null). If the completion check-in is earlier, then it must
        // be the one we want. If it's at the same time as the availability check-in,
        // then it doesn't matter which we use, so the logic is simpler if we defer to
        // the completion check-in.
        nWorkerRelevantCheckIn = nWorker.nextWorkIterationCompletionCheckIn!;
      } else {
        // The work completion check-in must have been in the past, leaving the
        // availability check-in as the only upcoming check-in for this worker.
        nWorkerRelevantCheckIn = nWorker.nextAvailabilityCheckIn;
      }
      return eWorkerRelevantCheckIn > nWorkerRelevantCheckIn ? nWorker : eWorker;
    });
  }
  processProgrammerCompletedWork() {
    for (const p of this.programmers) {
      if (p.nextWorkIterationCompletionCheckIn! !== this.currentDayTime) {
        continue;
      }
      const possiblyFinishedTicket = p.schedule.lastTicketWorkedOn;
      if (possiblyFinishedTicket === null) {
        throw Error('Worker had no last worked on ticket');
      }
      p.schedule.lastTicketWorkedOn = null;
      if (possiblyFinishedTicket.needsCodeReview && this.programmerCount > 1) {
        // Code review is only applicable if there's another programmer to review any
        // changes.
        this.codeReviewStack.push(possiblyFinishedTicket);
      } else {
        if (this.programmerCount === 1) {
          // There is no one to code review the programmers changes.
          possiblyFinishedTicket.programmerCodeReviewWorkIterations.shift();
          possiblyFinishedTicket.needsCodeReview = false;
        }
        this.qaStack.push(possiblyFinishedTicket);
      }
      p.nextWorkIterationCompletionCheckIn = null;
    }
  }
  processTesterCompletedWork() {
    for (const t of this.testers) {
      if (t.nextWorkIterationCompletionCheckIn === this.currentDayTime) {
        const possiblyFinishedTicket = t.schedule.lastTicketWorkedOn;
        if (possiblyFinishedTicket === null) {
          throw Error('Worker had no last worked on ticket');
        }
        t.schedule.lastTicketWorkedOn = null;
        if (possiblyFinishedTicket.testerWorkIterations.length > 0) {
          // tester must have found a problem, so send it back to programmers
          this.passBackStack.push(possiblyFinishedTicket);
          possiblyFinishedTicket.firstIteration = false;
        } else if (!possiblyFinishedTicket.needsAutomation) {
          // automation was just completed
          this.automatedStack.push(possiblyFinishedTicket);
        } else {
          // no work iterations left, which means the tester didn't find any
          // issues
          // possiblyFinishedTicket.needsAutomation = true;
          this.doneStack.push(possiblyFinishedTicket);
          this.needsAutomationStack.push(possiblyFinishedTicket);
          possiblyFinishedTicket.unfinished = false;
        }
        t.nextWorkIterationCompletionCheckIn = null;
      }
    }
  }
  handOutNewProgrammerWork() {
    // For every programmer, find the ones that are available for work.
    // For every one of those programmers, find the highest priority ticket in the
    // passBackStack that belongs to them (if any), and find the highest priority
    // ticket in the codeReviewStack that doesn't belong to them (if any). Of those
    // two tickets, determine which is the higher priority one, and have the
    // programmer work on that one. If they are the same priority, have the
    // programmer do the code review as that is holding back another programmer, and
    // it will take an hour or less to complete.
    //
    // If there are no existing tickets available for the programmer, then create a
    // new one to assign to them. This can be considered to be either already
    // planned work for the sprint, or work that was pulled into the sprint from the
    // backlog. Either way, a programmer should always have work available to do.
    for (const p of this.programmers) {
      if (p.nextAvailabilityCheckIn > 0 && p.nextAvailabilityCheckIn < this.currentDayTime) {
        throw new Error('Programmer is being left behind');
      } else if (p.nextAvailabilityCheckIn !== this.currentDayTime) {
        continue;
      }
      // can start new work
      let ticket = null;
      if (this.passBackStack.length > 0 || this.codeReviewStack.length > 0) {
        const highestPriorityPassBackTicketIndex = this.getHighestPriorityPassBackWorkIndexForProgrammer(p);
        const highestPriorityCodeReviewTicketIndex = this.getHighestPriorityCodeReviewWorkIndexForProgrammer(p);
        if (highestPriorityPassBackTicketIndex !== null && highestPriorityCodeReviewTicketIndex !== null) {
          if (
            this.passBackStack[highestPriorityPassBackTicketIndex].priority <
            this.codeReviewStack[highestPriorityCodeReviewTicketIndex].priority
          ) {
            ticket = this.passBackStack.splice(highestPriorityPassBackTicketIndex, 1)[0];
          } else {
            // code review should be done if it takes higher priority or it's of
            // equivalent priority (because it takes less time)
            ticket = this.codeReviewStack.splice(highestPriorityCodeReviewTicketIndex, 1)[0];
          }
        } else if (highestPriorityPassBackTicketIndex !== null) {
          ticket = this.passBackStack.splice(highestPriorityPassBackTicketIndex, 1)[0];
        } else if (highestPriorityCodeReviewTicketIndex !== null) {
          ticket = this.codeReviewStack.splice(highestPriorityCodeReviewTicketIndex, 1)[0];
        }
      }
      if (!ticket) {
        ticket = this.ticketFactory.generateTicket();
        p.addTicket(ticket);
        this.tickets.push(ticket);
        if (this.currentDay < this.sprintDayCount) {
          this.sprintTickets.push(ticket);
        }
      }
      try {
        const iterationComplete = p.schedule.addWork(ticket);
        if (iterationComplete !== false) {
          p.nextWorkIterationCompletionCheckIn = iterationComplete;
        }
      } catch (err) {
        if (err instanceof RangeError) {
          // ran out of time in the sprint
          p.nextWorkIterationCompletionCheckIn = -1;
          this.unfinishedStack.push(ticket);
        } else {
          throw err;
        }
      }
    }
  }
  getHighestPriorityPassBackWorkIndexForProgrammer(programmer: Programmer): number | null {
    const ownedTickets = programmer.tickets.map((ticket) => ticket.ticketNumber);
    // needs to get highest priority ticket that belongs to them
    return this.passBackStack.reduce(
      (highestPriorityOwnedTicketIndex: number | null, currentTicket: Ticket, currentTicketIndex: number) => {
        if (ownedTickets.includes(currentTicket.ticketNumber)) {
          if (!highestPriorityOwnedTicketIndex) {
            return currentTicketIndex;
          }
          if (currentTicket.priority < this.passBackStack[highestPriorityOwnedTicketIndex].priority) {
            return currentTicketIndex;
          }
        }
        return highestPriorityOwnedTicketIndex!;
      },
      null,
    );
  }
  getHighestPriorityCodeReviewWorkIndexForProgrammer(programmer: Programmer): number | null {
    const ownedTickets = programmer.tickets.map((ticket) => ticket.ticketNumber);

    // needs to get highest priority ticket that doesn't belongs to them
    return this.codeReviewStack.reduce(
      (highestPriorityOwnedTicketIndex: number | null, currentTicket: Ticket, currentTicketIndex: number) => {
        if (!ownedTickets.includes(currentTicket.ticketNumber)) {
          if (!highestPriorityOwnedTicketIndex) {
            return currentTicketIndex;
          }
          if (currentTicket.priority < this.codeReviewStack[highestPriorityOwnedTicketIndex].priority) {
            return currentTicketIndex;
          }
        }
        return highestPriorityOwnedTicketIndex;
      },
      null,
    );
  }
  getHighestPriorityAutomationIndex(): number | null {
    return this.needsAutomationStack.reduce(
      (highestPriorityTicketIndex: number | null, currentTicket: Ticket, currentTicketIndex: number) => {
        if (!highestPriorityTicketIndex) {
          return currentTicketIndex;
        }
        if (currentTicket.priority < this.needsAutomationStack[highestPriorityTicketIndex].priority) {
          return currentTicketIndex;
        }
        return highestPriorityTicketIndex!;
      },
      null,
    );
  }
  handOutNewTesterWork() {
    for (const t of this.testers) {
      if (t.nextAvailabilityCheckIn < 0) {
        // can't accept new work
        continue;
      }
      if (t.nextAvailabilityCheckIn < this.currentDayTime) {
        this.backfillUntilDayTimeTesterScheduleForTimeTheySpentDoingNothing(this.currentDayTime);
      }
      if (t.nextAvailabilityCheckIn === this.currentDayTime) {
        // can start new work
        let ticket = null;
        if (this.qaStack.length > 0) {
          const highestPriorityTicketIndex = this.getHighestPriorityCheckingWorkIndexForTester(t);
          if (highestPriorityTicketIndex !== null) {
            ticket = this.qaStack.splice(highestPriorityTicketIndex, 1)[0];
          }
        }
        if (!ticket && this.needsAutomationStack.length > 0) {
          // automation takes a lower priority than checking by hand
          const highestPriorityTicketIndex = this.getHighestPriorityAutomationIndex();
          if (highestPriorityTicketIndex !== null) {
            ticket = this.needsAutomationStack.splice(highestPriorityTicketIndex, 1)[0];
          }
        }
        if (!ticket) {
          // tester can't do anything at the moment
          continue;
        }
        t.addTicket(ticket);
        try {
          const iterationComplete = t.schedule.addWork(ticket);
          if (iterationComplete !== false) {
            t.nextWorkIterationCompletionCheckIn = iterationComplete;
          }
        } catch (err) {
          if (err instanceof RangeError) {
            // ran out of time in the sprint
            t.nextWorkIterationCompletionCheckIn = -1;
            this.unfinishedStack.push(ticket);
          } else {
            throw err;
          }
        }
      }
    }
  }
  backfillUntilDayTimeTesterScheduleForTimeTheySpentDoingNothing(targetDayTime: number) {
    // necessary to avoid logic issues towards the end of the sprint where next
    // available time is determined.
    const targetDay = Math.floor(targetDayTime / this.dayLengthInMinutes);
    const targetTime = Math.floor(targetDayTime % this.dayLengthInMinutes);
    for (const t of this.testers) {
      for (const daySchedule of t.schedule.daySchedules) {
        if (daySchedule.day > targetDay) {
          break;
        }
        while (daySchedule.availableTimeSlots.length > 0) {
          const timeSlot = daySchedule.availableTimeSlots[0];
          if (daySchedule.day === targetDay && timeSlot.startTime >= targetTime) {
            break;
          }
          const timeSlotStartDayTime = this.dayLengthInMinutes * daySchedule.day + timeSlot.startTime;
          const nothingDuration = Math.min(timeSlot.duration, targetDayTime - timeSlotStartDayTime);
          daySchedule.scheduleMeeting(new NothingEvent(timeSlot.startTime, nothingDuration, daySchedule.day));
        }
      }
    }
  }
  getHighestPriorityCheckingWorkIndexForTester(tester: Tester): number | null {
    const ownedTickets = tester.tickets.map((ticket) => ticket.ticketNumber);
    return this.qaStack.reduce(
      (highestPriorityTicketIndex: number | null, currentTicket: Ticket, currentTicketIndex: number) => {
        // if the ticket.firstIteration is true, then the ticket hasn't been claimed by
        // a tester yet, so it's up for grabs.
        if (ownedTickets.includes(currentTicket.ticketNumber) || currentTicket.firstIteration) {
          if (highestPriorityTicketIndex === null) {
            return currentTicketIndex;
          }
          if (currentTicket.priority < this.qaStack[highestPriorityTicketIndex].priority) {
            return currentTicketIndex;
          }
        }
        return highestPriorityTicketIndex;
      },
      null,
    );
  }
  aggregateMinutesSpent() {
    // Example for getting time spent context switching at minute 321
    // worker 0: this.workerDataForDayTime[321].workers[0].contextSwitching
    // all together: this.workerDataForDayTime[321].cumulativeMinutes.contextSwitching
    for (let i = 0; i < this.totalSimulationMinutes; i++) {
      const dataForWorkersAtThisDayTime: WorkerMinuteSnapshot[] = [];
      for (const worker of this.workers) {
        const minutes: WorkerMinuteSnapshot = {
          meeting: worker.getMeetingMinutesAtDayTime(i),
          contextSwitching: worker.getContextSwitchingMinutesAtDayTime(i),
          productiveTicketWork: worker.getProductiveTicketWorkMinutesAtDayTime(i),
          redundantTicketWork: worker.getRedundantTicketWorkMinutesAtDayTime(i),
          programming: worker.getProgrammingMinutesAtDayTime(i),
          fluffProgramming: worker.getFluffProgrammingMinutesAtDayTime(i),
          nonFluffProgramming: worker.getNonFluffProgrammingMinutesAtDayTime(i),
          codeReview: worker.getCodeReviewMinutesAtDayTime(i),
          fluffCodeReview: worker.getFluffCodeReviewMinutesAtDayTime(i),
          nonFluffCodeReview: worker.getNonFluffCodeReviewMinutesAtDayTime(i),
          // recovery: worker.getProductivityRecoveryMinutesAtDayTime(i),
          checking: worker.getCheckingMinutesAtDayTime(i),
          fluffChecking: worker.getFluffCheckingMinutesAtDayTime(i),
          nonFluffChecking: worker.getNonFluffCheckingMinutesAtDayTime(i),
          productiveProgrammingTicketWorkMinutes: worker.getProductiveProgrammingMinutesAtDayTime(i),
          redundantProgrammingTicketWorkMinutes: worker.getRedundantProgrammingMinutesAtDayTime(i),
          productiveCodeReviewTicketWorkMinutes: worker.getProductiveCodeReviewMinutesAtDayTime(i),
          redundantCodeReviewTicketWorkMinutes: worker.getRedundantCodeReviewMinutesAtDayTime(i),
          productiveCheckingTicketWorkMinutes: worker.getProductiveCheckingMinutesAtDayTime(i),
          redundantCheckingTicketWorkMinutes: worker.getRedundantCheckingMinutesAtDayTime(i),
          regressionTesting: worker.getRegressionTestingMinutesAtDayTime(i),
          automation: worker.getAutomationMinutesAtDayTime(i),
          nothing: worker.getNothingMinutesAtDayTime(i),
        };
        dataForWorkersAtThisDayTime.push(minutes);
      }
      const cumulativeMinutesForDayTime = dataForWorkersAtThisDayTime.reduce((accMinutes, workerMinutes) => {
        // must clone to avoid overwriting first WorkerMinuteSnapshot object
        const newAccMinutes: WorkerMinuteSnapshot = { ...accMinutes };
        for (const minuteName of Object.keys(workerMinutes)) {
          newAccMinutes[minuteName as keyof WorkerMinuteSnapshot] +=
            workerMinutes[minuteName as keyof WorkerMinuteSnapshot];
        }
        return newAccMinutes;
      });

      this.workerDataForDayTime.push({
        workers: dataForWorkersAtThisDayTime,
        cumulativeMinutes: cumulativeMinutesForDayTime,
        logEntry: this.stackTimelineHashMap[i],
        prettyDayTime: this.getPrettyFormattedDayTime(i),
      });
    }
  }
  getPrettyFormattedDayTime(dayTime: number) {
    const day: number = Math.floor(dayTime / this.dayLengthInMinutes) + 1;
    const hour: number = (Math.floor(((dayTime % this.dayLengthInMinutes) + 1) / 60) + this.dayStartTime) % 12 || 12;
    const minute: number = (dayTime + 1) % 60;
    return `Day ${day} ${hour}:${minute < 10 ? 0 : ''}${minute}`;
  }
}
