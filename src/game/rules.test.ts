import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAttackApCost,
  getGearFuelCost,
  getSequenceApCost,
  canAppendInput,
  detectDeathblow,
  resolveAttackChain,
  resolveComboBankChain,
  calculateChargeFuelRecovery,
  stepAtbGauge,
  getGroundHeightAt,
  PartyMemberState,
  EnemyCombatant,
} from './rules';
import {
  applyChromaKeyAndDespill,
  ExternalAssetsRegistry,
  FEI_CROPS,
  getSpriteDimensions,
  isGearArchetype,
  PORTRAIT_CROPS,
  PROP_CROPS,
} from './sprites';

const mockFei: PartyMemberState = {
  id: 'fei',
  name: 'Fei Fong Wong',
  archetypeTitle: 'Martial Artist of Lahan',
  level: 12,
  hp: 420,
  maxHp: 420,
  ep: 60,
  maxEp: 60,
  maxAp: 7,
  comboBank: 14,
  atk: 48,
  def: 32,
  ether: 38,
  agility: 14,
  atb: 100,
  inGear: false,
  isDefending: false,
  idAwakened: false,
  gear: {
    id: 'weltall',
    name: 'WELTALL',
    title: 'Original Calamity Gear',
    primaryColor: '#1e3a8a',
    secondaryColor: '#94a3b8',
    glowColor: '#ef4444',
    maxFrameHp: 2800,
    frameHp: 2800,
    maxFuel: 1000,
    fuel: 800,
    attackLevel: 1,
    boosterActive: false,
    armor: 110,
    etherAmp: 120,
    weightTons: 41.5,
  },
  deathblowProgress: {
    raijin: 80,
    senretsu: 65,
    tenbu: 50,
    kishin: 35,
  },
  etherSkills: [],
};

const mockEnemy: EnemyCombatant = {
  id: 'gebler-trooper',
  name: 'Gebler Assault Trooper',
  title: 'Solaris Vanguard',
  isGearSize: false,
  hp: 600,
  maxHp: 600,
  atk: 35,
  def: 20,
  agility: 10,
  atb: 40,
  color: '#dc2626',
  accentColor: '#fbbf24',
  xOffset: 2.5,
  zOffset: 0,
};

test('AP and Gear Fuel costs match Xenogears exact button tiers', () => {
  assert.equal(getAttackApCost('T'), 1);
  assert.equal(getAttackApCost('S'), 2);
  assert.equal(getAttackApCost('X'), 3);

  assert.equal(getGearFuelCost('T'), 10);
  assert.equal(getGearFuelCost('S'), 20);
  assert.equal(getGearFuelCost('X'), 30);

  assert.equal(getSequenceApCost(['S', 'S', 'X']), 7);
});

test('canAppendInput enforces 7 AP cap on foot and Fuel cap in Gear', () => {
  assert.equal(canAppendInput(['S', 'S'], 'X', 7, false, 800), true);
  assert.equal(canAppendInput(['S', 'S', 'X'], 'T', 7, false, 800), false);
  assert.equal(canAppendInput(['T'], 'X', 7, true, 35), false);
  assert.equal(canAppendInput(['T'], 'X', 7, true, 40), true);
});

test('detectDeathblow identifies all four iconic Hissatsu combinations', () => {
  assert.equal(detectDeathblow(['T', 'X'])?.id, 'raijin');
  assert.equal(detectDeathblow(['T', 'T', 'X'])?.id, 'senretsu');
  assert.equal(detectDeathblow(['S', 'T', 'X'])?.id, 'tenbu');
  assert.equal(detectDeathblow(['S', 'S', 'X'])?.id, 'kishin');
  assert.equal(detectDeathblow(['T', 'T']), null);
});

test('resolveAttackChain replaces the final strike with the Deathblow finisher and banks unused AP', () => {
  const res = resolveAttackChain(mockFei, mockEnemy, ['T', 'X'], 0.5);
  assert.equal(res.apSpent, 4);
  assert.equal(res.apBanked, 3);
  assert.equal(res.newComboBank, 17);
  assert.equal(res.triggeredDeathblow?.id, 'raijin');
  assert.equal(res.hits.length, 2);
  assert.equal(res.hits[0].isDeathblow, false);
  assert.equal(res.hits[1].isDeathblow, true);
  assert.equal(res.hits[1].hitstopMs, 80);
  assert.equal(res.hits[1].pauseAfterMs, 180);
});

test('resolveAttackChain in Gear mode increments Attack Level on 1 hit and resets to 0 on 2-hit Gear Deathblow', () => {
  const gearFeiLv0: PartyMemberState = {
    ...mockFei,
    inGear: true,
    gear: { ...mockFei.gear, attackLevel: 0, fuel: 500 },
  };
  const step1 = resolveAttackChain(gearFeiLv0, mockEnemy, ['S'], 0.5);
  assert.equal(step1.fuelSpent, 20);
  assert.equal(step1.newFuel, 480);
  assert.equal(step1.newGearAttackLevel, 1);

  const gearFeiLv1: PartyMemberState = {
    ...mockFei,
    inGear: true,
    gear: { ...mockFei.gear, attackLevel: 1, fuel: 480 },
  };
  const step2 = resolveAttackChain(gearFeiLv1, mockEnemy, ['T', 'X'], 0.5);
  assert.equal(step2.triggeredDeathblow?.id, 'raijin');
  assert.equal(step2.newGearAttackLevel, 0);
});

test('Charge command restores 30 + (attackLevel * 25) Fuel', () => {
  const gearLv2 = { ...mockFei.gear, fuel: 500, attackLevel: 2 };
  const recovered = calculateChargeFuelRecovery(gearLv2);
  assert.equal(recovered, 80);
});

test('resolveComboBankChain chains up to 4 consecutive Deathblows when comboBank >= 12', () => {
  const comboRes = resolveComboBankChain(mockFei, mockEnemy);
  assert.ok(comboRes.steps.length >= 3 && comboRes.steps.length <= 4);
  assert.ok(comboRes.totalDamage > 150);
});

test('Booster doubles ATB gauge fill speed', () => {
  const normalAtb = stepAtbGauge(0, 12, 1.0, false);
  const boostedAtb = stepAtbGauge(0, 12, 1.0, true);
  assert.equal(boostedAtb, normalAtb * 2);
});

test('getGroundHeightAt resolves Babel-style vertical platform elevations', () => {
  assert.equal(getGroundHeightAt('lahan', 0, 0, 0), 0.45);
  assert.equal(getGroundHeightAt('mountain', 0, 5, 0), 0.8);
});

test('SpriteGenerator dimensions are 160x240 for human characters and 256x256 for Gears with 8-sheet ExternalAssetsRegistry', () => {
  assert.deepEqual(getSpriteDimensions('fei'), { width: 160, height: 240 });
  assert.deepEqual(getSpriteDimensions('elly'), { width: 160, height: 240 });
  assert.deepEqual(getSpriteDimensions('citan'), { width: 160, height: 240 });
  assert.deepEqual(getSpriteDimensions('weltall'), { width: 256, height: 256 });
  assert.deepEqual(getSpriteDimensions('vierge'), { width: 256, height: 256 });
  assert.deepEqual(getSpriteDimensions('heimdal'), { width: 256, height: 256 });
  assert.equal(isGearArchetype('weltall'), true);
  assert.equal(isGearArchetype('fei'), false);
  assert.equal(Object.keys(ExternalAssetsRegistry).length, 8);
  assert.equal(ExternalAssetsRegistry.fei_sheet, '/assets/fei_sheet.png');
  assert.equal(ExternalAssetsRegistry.props_sheet, '/assets/props_sheet.png');
});

test('applyChromaKeyAndDespill removes #FF00FF magenta background and preserves CropBox coordinates across FEI_CROPS, PROP_CROPS, and PORTRAIT_CROPS', () => {
  assert.equal(FEI_CROPS.walk.length, 8);
  assert.equal(Object.keys(PROP_CROPS).length, 10);
  assert.equal(Object.keys(PORTRAIT_CROPS).length, 8);

  const data = new Uint8ClampedArray(3 * 3 * 4);
  for (let i = 0; i < 9; i++) {
    const p = i * 4;
    if (i === 4) {
      data[p] = 150;
      data[p + 1] = 25;
      data[p + 2] = 30;
      data[p + 3] = 255;
    } else {
      data[p] = 255;
      data[p + 1] = 0;
      data[p + 2] = 255;
      data[p + 3] = 255;
    }
  }
  const mockImgData = { width: 3, height: 3, data } as unknown as ImageData;
  applyChromaKeyAndDespill(mockImgData);
  assert.equal(mockImgData.data[3], 0);
  assert.equal(mockImgData.data[4 * 4 + 3], 255);
});

