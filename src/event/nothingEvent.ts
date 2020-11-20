import { ScheduledEvent } from './scheduledEvent';

export class NothingEvent extends ScheduledEvent {
  // Nothing is done during this period of time. This is solely used to make logic
  // easier, and is placed in a schedule when it's determined that no work can be done
  // because it will take too long to switch contexts and get anything productive
  // done.
  relevantMinutes = ['nothingMinutes'];
  title = 'Nothing';
}
