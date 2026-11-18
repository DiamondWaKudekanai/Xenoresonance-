export type AttackInput = 'T' | 'S' | 'X'; // T = Weak (1 AP / 10 Fuel), S = Medium (2 AP / 20 Fuel), X = Strong (3 AP / 30 Fuel)

export type ZoneId = 'lahan' | 'mountain' | 'hangar';

export type PortraitMood = 'Normal' | 'Angry' | 'Shocked' | 'Id-Awakened';

export interface DeathblowDef {
  id: string;
  name: string;
  japaneseTitle: string;
  sequence: AttackInput[];
  numericPattern: number[]; // [1,3], [1,1,3], [2,1,3], [2,2,3]
  apCost: number;
  multiplier: number;
  element: 'Physical' | 'Lightning' | 'Wind' | 'Fire' | 'Id-Void';
  color: string;
  description: string;
  gearName: string;
  gearLevelReq: 1 | 2 | 3 | 4;
}

export interface EtherSkill {
  id: string;
  name: string;
  epCost: number;
  targetType: 'enemy' | 'ally' | 'all-enemies';
  power: number;
  isHeal?: boolean;
  isBuff?: boolean;
  element: 'Fire' | 'Wind' | 'Earth' | 'Water' | 'Light';
  description: string;
}

export interface GearSpec {
  id: string;
  name: string;
  title: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  maxFrameHp: number;
  frameHp: number;
  maxFuel: number;
  fuel: number;
  attackLevel: number; // 0, 1, 2, 3, 4 (4 = Infinity / Hyper Mode)
  boosterActive: boolean;
  armor: number;
  etherAmp: number;
  weightTons: number;
}

export interface PartyMemberState {
  id: 'fei' | 'elly' | 'citan';
  name: string;
  archetypeTitle: string;
  level: number;
  hp: number;
  maxHp: number;
  ep: number;
  maxEp: number;
  maxAp: number; // 3 to 7 AP per turn
  comboBank: number; // 0 to 28 AP stored (COMBO unlocked at >= 12)
  atk: number;
  def: number;
  ether: number;
  agility: number;
  atb: number; // 0 to 100
  inGear: boolean;
  isDefending: boolean;
  idAwakened: boolean;
  gear: GearSpec;
  deathblowProgress: Record<string, number>;
  etherSkills: EtherSkill[];
}

export interface EnemyCombatant {
  id: string;
  name: string;
  title: string;
  isGearSize: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  agility: number;
  atb: number;
  color: string;
  accentColor: string;
  xOffset: number;
  zOffset: number;
  telegraphing?: string | null;
}

export const DEATHBLOWS: DeathblowDef[] = [
  {
    id: 'raijin',
    name: 'Raijin',
    japaneseTitle: 'Lightning Kick',
    sequence: ['T', 'X'],
    numericPattern: [1, 3],
    apCost: 4,
    multiplier: 2.15,
    element: 'Lightning',
    color: '#38bdf8',
    description: 'High-voltage somersault heel drop charged with Chi.',
    gearName: 'Raigeki (Lv1)',
    gearLevelReq: 1,
  },
  {
    id: 'senretsu',
    name: 'Senretsu',
    japaneseTitle: 'Flurry Strikes',
    sequence: ['T', 'T', 'X'],
    numericPattern: [1, 1, 3],
    apCost: 5,
    multiplier: 2.7,
    element: 'Physical',
    color: '#fbbf24',
    description: 'Eight-palm supersonic barrage shattering enemy guard.',
    gearName: 'Reppu (Lv1)',
    gearLevelReq: 1,
  },
  {
    id: 'tenbu',
    name: 'Tenbu',
    japaneseTitle: 'Heavenly Dance',
    sequence: ['S', 'T', 'X'],
    numericPattern: [2, 1, 3],
    apCost: 6,
    multiplier: 3.35,
    element: 'Wind',
    color: '#34d399',
    description: 'Aerial vortex spin culminating in a sky-rending palm thrust.',
    gearName: 'Ryusei (Lv2)',
    gearLevelReq: 2,
  },
  {
    id: 'kishin',
    name: 'Kishin',
    japaneseTitle: 'Demon God Fist',
    sequence: ['S', 'S', 'X'],
    numericPattern: [2, 2, 3],
    apCost: 7,
    multiplier: 4.5,
    element: 'Id-Void',
    color: '#f43f5e',
    description: 'Forbidden crimson Zohar resonance wave unleashing latent Id.',
    gearName: 'Kishin-Id (Lv3/∞)',
    gearLevelReq: 3,
  },
];

export function getAttackApCost(input: AttackInput): number {
  switch (input) {
    case 'T':
      return 1;
    case 'S':
      return 2;
    case 'X':
      return 3;
  }
}

export function getGearFuelCost(input: AttackInput): number {
  switch (input) {
    case 'T':
      return 10;
    case 'S':
      return 20;
    case 'X':
      return 30;
  }
}

export function getSequenceApCost(sequence: AttackInput[]): number {
  return sequence.reduce((sum, item) => sum + getAttackApCost(item), 0);
}

export function canAppendInput(
  currentSequence: AttackInput[],
  nextInput: AttackInput,
  maxAp: number,
  inGear: boolean,
  currentFuel: number
): boolean {
  if (inGear) {
    // In Gear mode: standard attack is 1 input, or 2 inputs if triggering a Gear Deathblow
    if (currentSequence.length >= 2) return false;
    const currentFuelCost = currentSequence.reduce((sum, i) => sum + getGearFuelCost(i), 0);
    return currentFuelCost + getGearFuelCost(nextInput) <= currentFuel;
  }
  const currentCost = getSequenceApCost(currentSequence);
  const nextCost = getAttackApCost(nextInput);
  return currentCost + nextCost <= maxAp;
}

export function detectDeathblow(
  sequence: AttackInput[],
  inGear = false,
  gearAttackLevel = 0
): DeathblowDef | null {
  if (sequence.length < 2) return null;

  if (inGear) {
    if (gearAttackLevel < 1) return null;
    if (gearAttackLevel >= 3) return DEATHBLOWS[3]; // Kishin-Id
    if (gearAttackLevel === 2) return DEATHBLOWS[2]; // Ryusei
    return sequence[0] === 'S' ? DEATHBLOWS[1] : DEATHBLOWS[0]; // Reppu or Raigeki
  }

  // Match exact tail of sequence against known Deathblows (longest match first)
  const sorted = [...DEATHBLOWS].sort((a, b) => b.sequence.length - a.sequence.length);
  for (const db of sorted) {
    if (sequence.length >= db.sequence.length) {
      const tail = sequence.slice(sequence.length - db.sequence.length);
      const matches = tail.every((inp, idx) => inp === db.sequence[idx]);
      if (matches) {
        return db;
      }
    }
  }

  return null;
}

export interface ActionQueueStep {
  label: string;
  inputTier: AttackInput;
  damage: number;
  isCrit: boolean;
  isDeathblow: boolean;
  color: string;
  hitstopMs: number;
  pauseAfterMs: number;
  cameraZoom: boolean;
  flashScreen: boolean;
}

export interface TurnExecutionResult {
  totalDamage: number;
  hits: ActionQueueStep[];
  triggeredDeathblow: DeathblowDef | null;
  apSpent: number;
  apBanked: number;
  newComboBank: number;
  fuelSpent: number;
  newFuel: number;
  newGearAttackLevel: number;
  updatedProgress: Record<string, number>;
}

/**
 * Builds the sequential frame-by-frame Action Queue for a confirmed `inputBuffer`.
 * - On-Foot: If the trailing inputs match a Deathblow ([1,3], [1,1,3], [2,1,3], [2,2,3]),
 *   the FINAL strike in the buffer is replaced by the special Deathblow animation & multiplier.
 * - In Gear: A 1-input attack consumes 10/20/30 Fuel and increments `attackLevel` (0 -> 3 -> 4/Infinity).
 *   If `attackLevel >= 1` and a 2nd input is buffered, the 2nd hit triggers the Gear Deathblow of that
 *   level and resets `attackLevel` to 0.
 */
export function resolveAttackChain(
  actor: PartyMemberState,
  target: EnemyCombatant,
  sequence: AttackInput[],
  deterministicRoll?: number
): TurnExecutionResult {
  const roll = deterministicRoll ?? Math.random();
  const hits: ActionQueueStep[] = [];
  const updatedProgress = { ...actor.deathblowProgress };

  if (actor.inGear) {
    let fuelSpent = 0;
    let attackLevel = actor.gear.attackLevel;
    const triggered = detectDeathblow(sequence, true, attackLevel);

    for (let i = 0; i < sequence.length; i++) {
      const inp = sequence[i];
      fuelSpent += getGearFuelCost(inp);
      const isLast = i === sequence.length - 1;

      if (isLast && triggered) {
        const idBonus = actor.idAwakened || attackLevel >= 4 ? 1.5 : 1.0;
        const finisherRaw =
          (actor.atk * 3.15 * triggered.multiplier * idBonus - target.def * 0.35) *
          (0.96 + roll * 0.08);
        const finisherDmg = Math.round(Math.max(110, finisherRaw));
        hits.push({
          label: `GEAR DEATHBLOW: ${triggered.gearName}`,
          inputTier: 'X',
          damage: finisherDmg,
          isCrit: true,
          isDeathblow: true,
          color: triggered.color,
          hitstopMs: 80,
          pauseAfterMs: 180,
          cameraZoom: true,
          flashScreen: true,
        });
      } else {
        const baseScale = inp === 'T' ? 1.15 : inp === 'S' ? 1.55 : 2.05;
        const idMult = actor.idAwakened || attackLevel >= 4 ? 1.55 : 1.0;
        const raw = Math.max(
          22,
          (actor.atk * 2.6 * baseScale * idMult - target.def * 0.45) * (0.95 + roll * 0.1)
        );
        const isCrit = roll > 0.78 || attackLevel >= 4;
        const dmg = Math.round(raw * (isCrit ? 1.35 : 1.0));
        hits.push({
          label:
            inp === 'T'
              ? 'Actuator Strike (10F)'
              : inp === 'S'
              ? 'Heavy Frame Blow (20F)'
              : 'Full-Output Smash (30F)',
          inputTier: inp,
          damage: dmg,
          isCrit,
          isDeathblow: false,
          color: '#38bdf8',
          hitstopMs: 80,
          pauseAfterMs: 180,
          cameraZoom: false,
          flashScreen: false,
        });
      }
    }

    if (triggered) {
      // Gear Deathblow resets attackLevel to 0
      attackLevel = 0;
    } else if (sequence.length > 0) {
      // Standard Gear attack increments attackLevel (0 -> 1 -> 2 -> 3 -> 4/Infinity)
      attackLevel = Math.min(4, attackLevel + 1);
    }

    const totalDamage = hits.reduce((sum, h) => sum + h.damage, 0);
    const newFuel = Math.max(0, actor.gear.fuel - fuelSpent);

    return {
      totalDamage,
      hits,
      triggeredDeathblow: triggered,
      apSpent: 0,
      apBanked: 0,
      newComboBank: actor.comboBank,
      fuelSpent,
      newFuel,
      newGearAttackLevel: attackLevel,
      updatedProgress,
    };
  }

  // ON-FOOT SEQUENTIAL ACTION QUEUE RESOLUTION
  const apSpent = getSequenceApCost(sequence);
  const apBanked = Math.max(0, actor.maxAp - apSpent);
  const newComboBank = Math.min(28, actor.comboBank + apBanked);
  const triggered = detectDeathblow(sequence, false, 0);
  const scaleVsGear = target.isGearSize ? 0.6 : 1.0;

  for (let i = 0; i < sequence.length; i++) {
    const inp = sequence[i];
    const isLast = i === sequence.length - 1;

    // If the trailing sequence matches a Deathblow, replace the final strike with the Deathblow animation & multiplier!
    if (isLast && triggered) {
      const idMult = actor.idAwakened ? 1.55 : 1.0;
      const dbRaw =
        (actor.atk * triggered.multiplier * idMult - target.def * 0.3) *
        scaleVsGear *
        (0.96 + roll * 0.08);
      const dbDmg = Math.round(Math.max(54, dbRaw));
      hits.push({
        label: `DEATHBLOW: ${triggered.name} (${triggered.japaneseTitle})`,
        inputTier: 'X',
        damage: dbDmg,
        isCrit: true,
        isDeathblow: true,
        color: triggered.color,
        hitstopMs: 80,
        pauseAfterMs: 180,
        cameraZoom: true,
        flashScreen: true,
      });
    } else {
      const mult = inp === 'T' ? 0.88 : inp === 'S' ? 1.38 : 1.92;
      const idMult = actor.idAwakened ? 1.5 : 1.0;
      const raw = Math.max(
        10,
        (actor.atk * mult * idMult - target.def * 0.4) * scaleVsGear * (0.94 + roll * 0.12)
      );
      const isCrit = roll > 0.82;
      const dmg = Math.round(raw * (isCrit ? 1.4 : 1.0));
      hits.push({
        label:
          inp === 'T'
            ? 'Weak Strike [1 AP]'
            : inp === 'S'
            ? 'Medium Strike [2 AP]'
            : 'Strong Strike [3 AP]',
        inputTier: inp,
        damage: dmg,
        isCrit,
        isDeathblow: false,
        color: '#e2e8f0',
        hitstopMs: 80,
        pauseAfterMs: 180,
        cameraZoom: false,
        flashScreen: false,
      });
    }
  }

  for (const db of DEATHBLOWS) {
    const currentProg = updatedProgress[db.id] ?? 0;
    const bump = triggered?.id === db.id ? 18 : sequence.length >= 2 ? 6 : 2;
    updatedProgress[db.id] = Math.min(100, currentProg + bump);
  }

  const totalDamage = hits.reduce((sum, h) => sum + h.damage, 0);

  return {
    totalDamage,
    hits,
    triggeredDeathblow: triggered,
    apSpent,
    apBanked,
    newComboBank,
    fuelSpent: 0,
    newFuel: actor.gear.fuel,
    newGearAttackLevel: actor.gear.attackLevel,
    updatedProgress,
  };
}

/**
 * Builds up to 4 chained Deathblows in a single turn when `comboBank >= 12`
 */
export function resolveComboBankChain(
  actor: PartyMemberState,
  target: EnemyCombatant,
  deathblowIds?: string[]
): {
  steps: ActionQueueStep[];
  totalDamage: number;
  apConsumed: number;
  remainingComboBank: number;
} {
  let availableAp = actor.comboBank + actor.maxAp;
  const chosenIds =
    deathblowIds && deathblowIds.length > 0
      ? deathblowIds.slice(0, 4)
      : ['raijin', 'senretsu', 'tenbu', 'kishin'];

  const steps: ActionQueueStep[] = [];
  let apConsumed = 0;

  for (let i = 0; i < chosenIds.length && steps.length < 4; i++) {
    const db = DEATHBLOWS.find((d) => d.id === chosenIds[i]) || DEATHBLOWS[0];
    if (availableAp >= db.apCost || steps.length < 3) {
      const cost = Math.min(availableAp, db.apCost);
      availableAp = Math.max(0, availableAp - cost);
      apConsumed += cost;

      const chainBonus = 1 + steps.length * 0.18;
      const dmg = Math.round(
        Math.max(58, (actor.atk * db.multiplier * chainBonus - target.def * 0.25))
      );
      steps.push({
        label: `COMBO #${steps.length + 1}: ${db.name} (${db.japaneseTitle})`,
        inputTier: 'X',
        damage: dmg,
        isCrit: true,
        isDeathblow: true,
        color: db.color,
        hitstopMs: 80,
        pauseAfterMs: 180,
        cameraZoom: true,
        flashScreen: true,
      });
    }
  }

  return {
    steps,
    totalDamage: steps.reduce((s, h) => s + h.damage, 0),
    apConsumed,
    remainingComboBank: availableAp,
  };
}

/**
 * Il comando `Charge` salta il turno, imposta lo stato difensivo e rigenera `30 + (attackLevel * 25)` Fuel
 */
export function calculateChargeFuelRecovery(gear: GearSpec): number {
  const restored = 30 + gear.attackLevel * 25;
  return Math.min(gear.maxFuel - gear.fuel, restored);
}

export function stepAtbGauge(
  currentAtb: number,
  agility: number,
  dtSeconds: number,
  boosterActive = false
): number {
  const boostMult = boosterActive ? 2.0 : 1.0;
  const ratePerSec = (14 + agility * 1.45) * boostMult;
  return Math.min(100, currentAtb + ratePerSec * dtSeconds);
}

export interface PlatformBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
}

export const ZONE_PLATFORMS: Record<ZoneId, PlatformBox[]> = {
  lahan: [
    { id: 'fountain-base', minX: -2.6, maxX: 2.6, minZ: -2.6, maxZ: 2.6, topY: 0.45 },
    { id: 'terrace-1', minX: 5.5, maxX: 11.5, minZ: -9.5, maxZ: -3.5, topY: 0.9 },
    { id: 'terrace-2', minX: 7.0, maxX: 11.0, minZ: -8.5, maxZ: -4.5, topY: 1.8 },
    { id: 'porch-west', minX: -11.5, maxX: -6.5, minZ: -5.0, maxZ: 1.0, topY: 0.5 },
  ],
  mountain: [
    { id: 'step-1', minX: -4.5, maxX: 4.5, minZ: 3.0, maxZ: 7.5, topY: 0.8 },
    { id: 'step-2', minX: -4.0, maxX: 4.0, minZ: -2.0, maxZ: 2.5, topY: 1.65 },
    { id: 'step-3', minX: -4.5, maxX: 4.5, minZ: -7.5, maxZ: -2.5, topY: 2.5 },
    { id: 'zohar-overlook', minX: -6.0, maxX: 6.0, minZ: -14.0, maxZ: -8.0, topY: 3.3 },
  ],
  hangar: [
    { id: 'catwalk-south', minX: -3.5, maxX: 3.5, minZ: 4.0, maxZ: 12.0, topY: 0.4 },
    { id: 'zohar-dais', minX: -5.5, maxX: 5.5, minZ: -6.5, maxZ: 3.5, topY: 1.1 },
    { id: 'zohar-altar', minX: -3.0, maxX: 3.0, minZ: -11.5, maxZ: -6.5, topY: 1.9 },
  ],
};

export function getGroundHeightAt(
  zone: ZoneId,
  x: number,
  z: number,
  currentY = 0
): number {
  const platforms = ZONE_PLATFORMS[zone] || [];
  let highestReachable = 0;
  for (const p of platforms) {
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      if (currentY + 1.25 >= p.topY && p.topY > highestReachable) {
        highestReachable = p.topY;
      }
    }
  }
  return highestReachable;
}
