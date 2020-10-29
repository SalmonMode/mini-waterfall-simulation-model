export * from './CustomEventsByDayList';
export * from './events';
export * from './schedule';
export * from './simulation';
export * from './stackLogEntry';
export * from './ticket';
export * from './worker';
export * from './workIteration';
import { Simulation } from './simulation';

const sim = new Simulation();
sim.simulate();
console.log(sim.projectedSprintCountUntilDeadlock);
