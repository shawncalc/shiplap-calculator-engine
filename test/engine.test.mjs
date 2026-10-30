import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateShiplap,
  purchasePlan,
  calculateDrywall,
  formatLength,
  splitImperial,
  US_BOARD_STYLES,
} from '../dist/index.js';

// ── Shiplap: 12 ft × 8 ft wall, 1x6 boards, nickel gap, 8 ft stock, 10% waste ──
const input = {
  wallLengthIn: 144,
  wallHeightIn: 96,
  boardWidthIn: 5.5,
  revealIn: 0.125,
  boardLengthIn: 96,
  wasteRatio: 0.1,
  openingsSqIn: 0,
};

const r = calculateShiplap(input);

test('shiplap: effective width is face minus reveal', () => {
  assert.equal(r.valid, true);
  assert.equal(r.effectiveWidthIn, 5.375);
});

test('shiplap: 18 courses on an 8 ft wall with 5.375 in coverage', () => {
  // 96 / 5.375 = 17.86 → 18 rows; final row = 96 − 17 × 5.375 = 4.625 in
  assert.equal(r.rows, 18);
  assert.ok(Math.abs(r.finalRowWidthIn - 4.625) < 1e-9);
  assert.equal(r.finalRowNeedsCut, true);
  assert.equal(r.suggestSplitRows, false);
});

test('shiplap: linear feet = rows × finished row length', () => {
  assert.equal(r.linearFeet, 216); // 18 × 144 in ÷ 12
});

test('shiplap: cut-aware board count reuses offcuts', () => {
  // Per row: 1 full 8 ft board + a 4 ft remainder. A 96 in board yields two
  // 48 in pieces, so 18 rows need 18 + ceil(18 / 2) = 27 boards before waste.
  assert.equal(r.boardsNeeded, 27);
  assert.equal(r.boards, 30); // 27 × 1.10 = 29.7 → 30
  assert.equal(r.boardsAddedByWaste, 3);
});

test('shiplap: pack rounding via purchasePlan', () => {
  assert.deepEqual(purchasePlan(30, 3), { packs: 10, boards: 30, spare: 0, packSize: 3 });
  assert.deepEqual(purchasePlan(31, 3), { packs: 11, boards: 33, spare: 2, packSize: 3 });
});

test('shiplap: opening deduction is clamped at 90% of the wall', () => {
  const o = calculateShiplap({ ...input, openingsSqIn: 13000 });
  assert.equal(o.openingsOverflow, true);
  assert.ok(o.openingsSqIn <= 13824 * 0.9 + 1e-6);
  assert.ok(o.boards < r.boards);
});

test('shiplap: nonsense input returns the empty state, not a fake wall', () => {
  const e = calculateShiplap({ ...input, wallLengthIn: 0 });
  assert.equal(e.valid, false);
  assert.equal(e.boards, 0);
});

// ── Drywall: 12 × 14 × 8 ft room, walls + ceiling, 1 door + 2 windows, 10% waste ──
const d = calculateDrywall({
  includeWalls: true,
  includeCeiling: true,
  lengthFt: 12,
  widthFt: 14,
  heightFt: 8,
  useArea: false,
  knownAreaSqFt: 0,
  doors: 1,
  windows: 2,
  largeOpeningsSqFt: 0,
  sheetId: '4x8',
  thicknessId: '1/2',
  wasteRatio: 0.1,
  outsideCorners: 0,
});

test('drywall: wall, ceiling and net areas', () => {
  // Walls: 2 × (12 + 14) × 8 = 416 sq ft. Ceiling: 12 × 14 = 168 sq ft.
  // Openings: 1 door (21) + 2 windows (30) = 51 sq ft.
  assert.equal(d.wallAreaSqFt, 416);
  assert.equal(d.ceilingAreaSqFt, 168);
  assert.equal(d.openingAreaSqFt, 51);
  assert.equal(d.netAreaSqFt, 533);
});

test('drywall: sheets round up after the waste allowance', () => {
  assert.equal(d.sheetsNoWaste, 17); // 533 / 32 = 16.66
  assert.equal(d.sheets, 19); // 16.66 × 1.1 = 18.32 → 19
  assert.equal(d.totalWeightLb, 19 * 32 * 1.78);
});

test('drywall: fasteners and finishing follow published coefficients', () => {
  // Walls 365 sq ft × 28/32 + ceiling 168 × 35/32 = 503.125 → 504 screws
  assert.equal(d.screws, 504);
  assert.equal(d.tapeFt, 198); // ceil(0.533 × 370)
  assert.equal(d.mudPails, 2); // 5.33 gal ÷ 4.5 gal pail
  assert.equal(d.cornerBeadSticks, 0);
});

test('drywall: 8 ft wall hangs in two exact courses', () => {
  assert.equal(d.heightAdvice, 'exact');
  assert.equal(d.topStripFt, 4);
});

test('drywall: too-small room returns the empty state', () => {
  const e = calculateDrywall({
    ...d,
    lengthFt: 0,
    includeCeiling: true,
    doors: 0,
    windows: 0,
  });
  assert.equal(e.valid, false);
});

// ── Units + presets ──
test('units: splitImperial and metric formatting', () => {
  assert.deepEqual(splitImperial(96), { major: 8, minor: 0 });
  assert.equal(formatLength(96, 'imperial'), '8 ft');
  assert.equal(formatLength(96, 'metric'), '2.44 m');
});

test('presets: 1x6 is dressed at 5.5 in, not the nominal 6 in', () => {
  const one = US_BOARD_STYLES.find((s) => s.id === '1x6');
  assert.equal(one.widthIn, 5.5);
});
