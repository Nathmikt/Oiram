import { PatrolBehavior } from './PatrolBehavior.js';
import { AggressivePatrolBehavior } from './AggressivePatrolBehavior.js';
import { HoppingBehavior } from './HoppingBehavior.js';
import { AquaticBehavior } from './AquaticBehavior.js';
import { FlyingPatrolBehavior } from './FlyingPatrolBehavior.js';
import { GroundPatrol } from './GroundPatrol.js';
import { StationaryShoot } from './StationaryShoot.js';
import { FlyingChase } from './FlyingChase.js';

const BEHAVIORS = {
  PatrolBehavior,
  AggressivePatrolBehavior,
  HoppingBehavior,
  AquaticBehavior,
  FlyingPatrolBehavior,
  GroundPatrol,
  StationaryShoot,
  FlyingChase
};

export function getBehavior(behaviorName) {
  const BehaviorClass = BEHAVIORS[behaviorName] || PatrolBehavior;
  return new BehaviorClass();
}
