export interface WorkerMinutes {
  contextSwitchingMinutes: number[];
  meetingMinutes: number[];
  productiveTicketWorkMinutes: number[];
  redundantTicketWorkMinutes: number[];
  programmingMinutes: number[];
  fluffProgrammingMinutes: number[];
  nonFluffProgrammingMinutes: number[];
  productiveProgrammingTicketWorkMinutes: number[];
  redundantProgrammingTicketWorkMinutes: number[];
  codeReviewMinutes: number[];
  fluffCodeReviewMinutes: number[];
  nonFluffCodeReviewMinutes: number[];
  productiveCodeReviewTicketWorkMinutes: number[];
  redundantCodeReviewTicketWorkMinutes: number[];
  // TODO: This array tracks minutes that were spent recovering from an interruption,
  // other than Lunch, and an end of day that was reached without going through a
  // meeting. So if the day ended with SprintRetro, and the worker was in the
  // middle of a work iteration, the ContextSwitchEvent before they began work on
  // that work iteration would count towards this, as would a meeting in the
  // middle of the day. This may not be immediately relevant, but may come in
  // handy if other meetings are implemented.
  productivityRecoveryMinutes: number[];
  checkingMinutes: number[];
  fluffCheckingMinutes: number[];
  nonFluffCheckingMinutes: number[];
  productiveCheckingTicketWorkMinutes: number[];
  redundantCheckingTicketWorkMinutes: number[];
  regressionTestingMinutes: number[];
  automationMinutes: number[];
  // Time spent doing nothing because there was no time to get started on anything
  // before a meeting, lunch, or the end of the day came up.
  nothingMinutes: number[];
}
