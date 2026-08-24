export const EnemyRegistry = {
  "walker": {
    name: "Walker",
    width: 28, height: 28, speed: 60, hp: 3, damage: 15,
    color: "#a1a1aa", shape: "square",
    behavior: "PatrolBehavior", isAquatic: false, ignoresGravity: false
  },
  "aggro_walker": {
    name: "Aggro Walker",
    width: 32, height: 28, speed: 70, hp: 4, damage: 20, aggroSpeed: 120, aggroRange: 250,
    color: "#ef4444", shape: "spiked_square",
    behavior: "AggressivePatrolBehavior", isAquatic: false, ignoresGravity: false
  },
  "jumper": {
    name: "Jumper",
    width: 24, height: 32, speed: 80, hp: 2, damage: 15, jumpForce: 350, jumpCooldown: 1.5,
    color: "#22c55e", shape: "tall_rect",
    behavior: "HoppingBehavior", isAquatic: false, ignoresGravity: false
  },
  "swimmer": {
    name: "Swimmer",
    width: 32, height: 20, speed: 90, hp: 3, damage: 10,
    color: "#0ea5e9", shape: "oval",
    behavior: "AquaticBehavior", isAquatic: true, ignoresGravity: false
  },
  "flier": {
    name: "Flier",
    width: 24, height: 24, speed: 80, hp: 1, damage: 10,
    color: "#eab308", shape: "circle",
    behavior: "FlyingPatrolBehavior", isAquatic: false, ignoresGravity: true
  }
};

// Aliases for backward compatibility
EnemyRegistry["crawler"] = EnemyRegistry["walker"];
EnemyRegistry["spitter"] = EnemyRegistry["aggro_walker"];
EnemyRegistry["flyer"] = EnemyRegistry["flier"];
EnemyRegistry["aggressive_red_slime"] = EnemyRegistry["aggro_walker"];
EnemyRegistry["red_slime"] = EnemyRegistry["aggro_walker"];

export const ENEMY_TYPES = EnemyRegistry;
