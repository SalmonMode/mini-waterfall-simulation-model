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
    public ticketNumber: number,
    public priority: number,
    public programmerWorkIterations: WorkIteration[],
    public programmerCodeReviewWorkIterations: WorkIteration[],
    public testerWorkIterations: WorkIteration[],
    qaAutomationIteration: WorkIteration,
    public totalTimesToBeSentBack: number,
  ) {
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
