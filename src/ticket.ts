import * as PD from 'probability-distributions';
import { WorkIteration } from './workIteration';

export class Ticket {
  public automationWorkIterations: WorkIteration[];
  public initialProgrammerWorkIterationTime: number;
  public initialProgrammerCodeReviewWorkIterationTime: number;
  public fullTesterWorkIterationTime: number;
  public initialTesterAutomationWorkIterationTime: number;
  public needsCodeReview: boolean;
  public needsAutomation: boolean;
  public fresh: boolean;
  public firstIteration: boolean = true;
  public unfinished: boolean = true;
  constructor(
    public number: number,
    public priority: number,
    public programmerWorkIterations: WorkIteration[],
    public programmerCodeReviewWorkIterations: WorkIteration[],
    public testerWorkIterations: WorkIteration[],
    qaAutomationIteration: WorkIteration,
    public totalTimesToBeSentBack: number,
  ) {
    // the ticket number used to uniquely identify it
    this.number = number;
    // the ticket's importance represented as a number. The lower the number, the
    // higher the priority
    this.priority = priority;
    // an array of amounts of uninterrupted time it will take the programmer to
    // complete an iteration of the ticket's implementation before sending it off to
    // QA
    this.programmerWorkIterations = programmerWorkIterations;
    this.programmerCodeReviewWorkIterations = programmerCodeReviewWorkIterations;
    // The amount of uninterrupted time it will take the tester to manually test the
    // ticket
    this.testerWorkIterations = testerWorkIterations;
    // The amount of uninterrupted time it will take the tester to write the
    // high-level automated tests for this ticket
    this.automationWorkIterations = [qaAutomationIteration];
    // The amount of times this ticket would have to be sent back to the programmer
    // before it would be completed.
    this.totalTimesToBeSentBack = totalTimesToBeSentBack;
    this.initialProgrammerWorkIterationTime = this.programmerWorkIterations[0].time;
    this.initialProgrammerCodeReviewWorkIterationTime = this.programmerCodeReviewWorkIterations[0].time;
    this.fullTesterWorkIterationTime = this.testerWorkIterations[this.testerWorkIterations.length - 1].time;
    this.initialTesterAutomationWorkIterationTime = this.automationWorkIterations[0].time;
    // After the programmer has done work on the ticket, it will need code review
    // before being passed off to QA. Only once that work is done (or at least
    // scheduled) is this set to true.
    this.needsCodeReview = false;
    this.needsAutomation = false;
    // Whether or not any work has begun on this ticket or not. Used to track
    // metrics relating to work that was done in repeated iterations of work for
    // tickets needed. For programmers, this means any work iteration that wasn't
    // the very first for the ticket. For testers, this means any iteration that
    // wasn't the last iteration.
    this.fresh = true;
  }
}

export class TicketFactory {
  // start the number off higher than 0 to make it more interesting
  private startingTicketNumber: number = 100;
  public maxCodeReviewTimeInHours: number;
  public ticketsMade: number;
  constructor(
    public maxInitialProgrammerWorkTimeInHours: number = 16,
    public maxFullRunTesterWorkTimeInHours: number = 8,
    public maxQaAutomationTime: number = 8,
    public averagePassBackCount: number = 1,
  ) {
    // maxInitialProgrammerWorkTimeInHours is the time it takes for the programmer to
    // write the initial implementation that they believe meets the ticket's criteria.
    //
    // maxFullRunTesterWorkTimeInHours is the time it would take the tester to
    // completely run through the tests they have for a ticket, assuming everything is
    // working.
    //
    // They are phrased and treated differently, because the programmer does everything
    // in one iteration, and then refines in later iterations, but the tester can't do
    // everything in one go if something is wrong, and can only do the full run in one
    // shot if everything is working. So the programmer's likely highest iteration time
    // will be on their first iteration, while the tester's likely highest iteration
    // time will be on their last iteration.
    this.maxInitialProgrammerWorkTimeInHours = maxInitialProgrammerWorkTimeInHours;
    this.maxFullRunTesterWorkTimeInHours = maxFullRunTesterWorkTimeInHours;
    this.maxQaAutomationTime = maxQaAutomationTime;
    this.averagePassBackCount = averagePassBackCount;
    this.maxCodeReviewTimeInHours = 0.5;
    this.ticketsMade = 0;
  }
  generateTicket() {
    const initialProgrammerWorkTime = this.generateInitialProgrammerWorkTime();
    const fullRunTesterWorkTime = this.generateFullRunTesterWorkTime();
    const fullRunCodeReviewWorkTime = this.generateCodeReviewWorkIterationTime();
    const programmerWorkIterations = [initialProgrammerWorkTime];
    const testerWorkIterations = [];
    const programmerCodeReviewWorkIterations = [];
    const passBackCount = this.generateTicketPassBackCount();
    programmerWorkIterations.push(...this.sampleFixWorkIterationTime(initialProgrammerWorkTime, passBackCount));
    programmerCodeReviewWorkIterations.push(
      ...this.sampleFixWorkIterationTime(fullRunCodeReviewWorkTime, passBackCount),
      fullRunCodeReviewWorkTime,
    );
    testerWorkIterations.push(
      ...this.sampleFixWorkIterationTime(fullRunTesterWorkTime, passBackCount),
      fullRunTesterWorkTime,
    );
    // QA Automation doesn't require iterations because the person doing it makes sure
    // it's working as expected while doing the work
    const qaAutomationIteration = this.generateQaAutomationWorkIteration();
    const priority = Math.round(Math.random() * 100);

    const ticket = new Ticket(
      this.startingTicketNumber + this.ticketsMade,
      priority,
      programmerWorkIterations,
      programmerCodeReviewWorkIterations,
      testerWorkIterations,
      qaAutomationIteration,
      passBackCount,
    );
    this.ticketsMade += 1;
    return ticket;
  }
  generateInitialProgrammerWorkTime() {
    return this.sampleInitialProgrammerWorkTime(1)[0];
  }
  sampleInitialProgrammerWorkTime(sampleCount: number) {
    if (sampleCount <= 0) {
      return [];
    }
    return this.sampleWorkIterationTime(this.maxInitialProgrammerWorkTimeInHours, sampleCount);
  }
  generateFullRunTesterWorkTime() {
    return this.sampleFullRunTesterWorkTime(1)[0];
  }
  sampleFullRunTesterWorkTime(sampleCount: number) {
    if (sampleCount <= 0) {
      return [];
    }
    return this.sampleWorkIterationTime(this.maxFullRunTesterWorkTimeInHours, sampleCount);
  }
  sampleWorkIterationTime(maxTimeInHours: number, sampleCount: number) {
    if (sampleCount <= 0) {
      return [];
    }
    const minimumWorkTimeInMinutes = 30;
    const sample = PD.rgamma(sampleCount, 3, 0.1).map((maxWorkTimeValue: number) => {
      const maxWorkTimePercentage = Math.min(maxWorkTimeValue / 100.0, 1);
      return new WorkIteration(Math.round(maxTimeInHours * maxWorkTimePercentage * 60) + minimumWorkTimeInMinutes);
    });
    return sample;
  }
  sampleFixWorkIterationTime(baseWorkIteration: WorkIteration, sampleCount: number) {
    // when a ticket is sent back to the programmer from QA, a fix is likely to take
    // less time than the initial work, but it's still possible for it to take more
    // time. This gamma probability distribution is used to determine the percentage of
    // the initial work time that it will take to fix the issue the tester found. It has
    // a significant lean towards 0% (with a 10 minute minimum), but also makes it
    // possible for the percentage to exceed 100%, meaning it could take longer to
    // create a potential fix than the initial implementation, and this reflects finding
    // a serious issue with the implementation and possibly overall design of the code.
    //
    // For testers, it's similar. But any increases over the base work time can be
    // chalked up to the tester trying to determine what exactly is wrong, or possibly
    // struggling to get the system to work if it's particularly problematic.
    //
    // It's sometimes the same for code review, but this simulation makes the assumption
    // that it is the same for code review as it is for testers checking.
    if (sampleCount <= 0) {
      return [];
    }
    const minimumWorkTimeInMinutes = 30;
    const sample = PD.rgamma(sampleCount, 1, 5).map((fixWorkTimeValue: number) => {
      const fixWorkTimePercentage = Math.min(fixWorkTimeValue / 100.0, 1);
      return new WorkIteration(
        Math.round(baseWorkIteration.time * fixWorkTimePercentage * 60) + minimumWorkTimeInMinutes,
      );
    });
    return sample;
  }
  generateCodeReviewWorkIterationTime(maxTimeInHours = 0.5) {
    return this.sampleCodeReviewWorkIterationTime(1)[0];
  }
  sampleCodeReviewWorkIterationTime(sampleCount: number) {
    // Very similar to sampleWorkIterationTime, except this doesn't have a minimum of
    // at least 30 minutes of work.
    if (sampleCount <= 0) {
      return [];
    }
    const sample = PD.rgamma(sampleCount, 3, 0.1).map((maxWorkTimeValue: number) => {
      const maxWorkTimePercentage = Math.min(maxWorkTimeValue / 100.0, 1);
      return new WorkIteration(Math.round(this.maxCodeReviewTimeInHours * maxWorkTimePercentage * 60));
    });
    return sample;
  }

  generateQaAutomationWorkIteration() {
    return this.sampleQaAutomationIterationTime(1)[0];
  }
  sampleQaAutomationIterationTime(sampleCount: number) {
    // The probability curve is flipped around for this, as QA automation is often
    // beholden to the current implementation that the programmers put in place. So not
    // only would they have to figure out what the programmers left them to work with,
    // but they would also have to engineer likely complex solutions for things like
    // explicit waits. Debugging while they develop can also take much longer as they
    // are likely writing the tests at a higher level, where things are, by
    // definition, more complex.
    //
    // In other words, while other tasks are more likely to trend towards the lower
    // end of their respective possible durations, QA automation is more likely to
    // trend towards the higher end, as it is incredibly unlikely that a QA automation
    // task would take less time.
    if (sampleCount <= 0) {
      return [];
    }
    const minimumWorkTimeInMinutes = 30;
    const sample = PD.rgamma(sampleCount, 3, 0.1).map((workTimeValue: number) => {
      const workTimePercentage = Math.max((workTimeValue / 100.0 - 1.0) * -1, 0);
      return new WorkIteration(
        Math.round(this.maxQaAutomationTime * workTimePercentage * 60) + minimumWorkTimeInMinutes,
      );
    });
    return sample;
  }
  generateTicketPassBackCount() {
    return this.sampleTicketPassBackCount(1)[0];
  }
  sampleTicketPassBackCount(sampleCount: number) {
    if (sampleCount <= 0) {
      return [];
    }
    // return Math.floor(PD.rchisq(1, 1, 5)[0]);
    return PD.rpois(sampleCount, this.averagePassBackCount);
  }
}
