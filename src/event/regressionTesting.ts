import { ScheduledEvent } from "./scheduledEvent";

export class RegressionTesting extends ScheduledEvent {
  relevantMinutes = ['regressionTestingMinutes'];
  title = 'Regression Testing';
}
