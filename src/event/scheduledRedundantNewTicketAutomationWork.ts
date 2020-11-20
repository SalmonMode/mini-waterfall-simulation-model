// Not real because testers would be responsible in this system for making sure their

import { ScheduledCoreTicketAutomationWork } from './scheduledCoreTicketAutomationWork';

// checks work completely before committing them (ideally).
export class ScheduledRedundantNewTicketAutomationWork extends ScheduledCoreTicketAutomationWork {}
