/**
 * Shiplap calculation engine.
 *
 * All inputs are inches (canonical unit). Everything is pure + synchronous so
 * the UI can recompute on every keystroke.
 *
 * Formulas (kept deliberately simple and documented so the numbers can be
 * audited by a human):
 *
 *   effective board width = face width − reveal overlap
 *   net wall area         = wall length × wall height − window/door area
 *   board rows            = ceil(wall height ÷ effective board width)
 *   linear feet           = board rows × finished row length
 *   boards (no waste)     = cut-aware count: full boards + reuse of offcuts
 *   boards (with waste)   = ceil(boards × (1 + waste factor))
 *
 * "Face width" is the *actual* dressed width of the board (1x6 = 5-1/2 in),
 * not the nominal name on the shelf tag. Nominal sizes under-count the rows
 * by roughly 9% and are the classic reason DIYers come home one row short.
 */

import { clamp, INCHES_PER_FOOT } from './units.js';

const EPSILON = 1e-6;

/** Never deduct more than this share of the wall, even if the user types nonsense. */
const MAX_OPENING_SHARE = 0.9;

export interface ShiplapInput {
  wallLengthIn: number;
  wallHeightIn: number;
  boardWidthIn: number;
  revealIn: number;
  boardLengthIn: number;
  wasteRatio: number;
  openingsSqIn: number;
}

export interface ShiplapResult {
  /** False when the wall has no usable size — the UI shows a placeholder. */
  valid: boolean;
  /** Board face width minus the reveal overlap — what one board actually covers. */
  effectiveWidthIn: number;
  grossAreaSqIn: number;
  /** Opening area actually deducted (clamped). */
  openingsSqIn: number;
  netAreaSqIn: number;
  /** Number of horizontal courses. */
  rows: number;
  /** Face height left over for the top row. */
  finalRowWidthIn: number;
  finalRowNeedsCut: boolean;
  /** True when the top rip is so thin it is better to split the cut top + bottom. */
  suggestSplitRows: boolean;
  /** Row length after windows/doors are deducted proportionally. */
  finishedRowLengthIn: number;
  linearFeet: number;
  /** Boards needed before the waste factor. */
  boardsNeeded: number;
  /** Boards needed including waste — what the shopping list buys. */
  boards: number;
  boardsAddedByWaste: number;
  /** True when the opening area was larger than the wall and had to be capped. */
  openingsOverflow: boolean;
}

export const EMPTY_SHIPLAP_RESULT: ShiplapResult = {
  valid: false,
  effectiveWidthIn: 0,
  grossAreaSqIn: 0,
  openingsSqIn: 0,
  netAreaSqIn: 0,
  rows: 0,
  finalRowWidthIn: 0,
  finalRowNeedsCut: false,
  suggestSplitRows: false,
  finishedRowLengthIn: 0,
  linearFeet: 0,
  boardsNeeded: 0,
  boards: 0,
  boardsAddedByWaste: 0,
  openingsOverflow: false,
};

export function calculateShiplap(input: ShiplapInput): ShiplapResult {
  const wallLengthIn = Number.isFinite(input.wallLengthIn) ? input.wallLengthIn : 0;
  const wallHeightIn = Number.isFinite(input.wallHeightIn) ? input.wallHeightIn : 0;

  // No usable size yet: hand back a real empty state instead of pretending a
  // 1-inch wall is a wall.
  if (wallLengthIn < 1 || wallHeightIn < 1) {
    return { ...EMPTY_SHIPLAP_RESULT };
  }

  const boardWidthIn = Math.max(1, input.boardWidthIn);
  const revealIn = clamp(Number.isFinite(input.revealIn) ? input.revealIn : 0, 0, boardWidthIn * 0.4);
  const effectiveWidthIn = Math.max(0.25, boardWidthIn - revealIn);
  const boardLengthIn = Math.max(6, input.boardLengthIn);
  const wasteRatio = clamp(Number.isFinite(input.wasteRatio) ? input.wasteRatio : 0, 0, 0.5);

  const grossAreaSqIn = wallLengthIn * wallHeightIn;
  const requestedOpenings = Number.isFinite(input.openingsSqIn) ? Math.max(0, input.openingsSqIn) : 0;
  const openingsCap = grossAreaSqIn * MAX_OPENING_SHARE;
  const openingsOverflow = requestedOpenings > openingsCap + EPSILON;
  const openingsSqIn = Math.min(requestedOpenings, openingsCap);
  const netAreaSqIn = Math.max(0, grossAreaSqIn - openingsSqIn);

  // --- Rows -----------------------------------------------------------------
  const rawRows = wallHeightIn / effectiveWidthIn;
  const rows = Math.max(1, Math.ceil(rawRows - EPSILON));
  const finalRowWidthIn = clamp(
    wallHeightIn - (rows - 1) * effectiveWidthIn,
    0,
    effectiveWidthIn,
  );
  const finalRowNeedsCut = effectiveWidthIn - finalRowWidthIn > 0.02;
  // A sliver narrower than 1-1/4 in is miserable to rip and hard to nail:
  // better advice is to split the shortfall between the first and last course.
  const suggestSplitRows = finalRowNeedsCut && finalRowWidthIn < 1.25;

  // --- Lengths --------------------------------------------------------------
  // Windows and doors are deducted proportionally from every row, which keeps
  // the board count honest without pretending to know where the openings sit.
  const finishedRowLengthIn =
    wallLengthIn * (grossAreaSqIn > 0 ? netAreaSqIn / grossAreaSqIn : 1);

  const linearFeet = (rows * finishedRowLengthIn) / INCHES_PER_FOOT;

  // --- Boards, cut-aware ----------------------------------------------------
  const fullPerRow = Math.floor(finishedRowLengthIn / boardLengthIn + EPSILON);
  const remainderIn = finishedRowLengthIn - fullPerRow * boardLengthIn;

  let boardsNeeded = rows * fullPerRow;
  if (remainderIn > 0.5) {
    // Offcuts from a single board are reused across rows before buying more.
    const piecesPerBoard = Math.max(1, Math.floor(boardLengthIn / remainderIn + EPSILON));
    boardsNeeded += Math.ceil(rows / piecesPerBoard);
  }
  boardsNeeded = Math.max(1, boardsNeeded);

  const boards = Math.max(1, Math.ceil(boardsNeeded * (1 + wasteRatio) - EPSILON));

  return {
    valid: true,
    effectiveWidthIn,
    grossAreaSqIn,
    openingsSqIn,
    netAreaSqIn,
    rows,
    finalRowWidthIn,
    finalRowNeedsCut,
    suggestSplitRows,
    finishedRowLengthIn,
    linearFeet,
    boardsNeeded,
    boards,
    boardsAddedByWaste: boards - boardsNeeded,
    openingsOverflow,
  };
}

export interface PurchasePlan {
  /** Packs to put in the trolley. */
  packs: number;
  /** Boards actually paid for — packs × pack size, never less than needed. */
  boards: number;
  /** Boards left over after the job. */
  spare: number;
  packSize: number;
}

/**
 * Retailers sell fixed pack sizes, so the honest number to budget with is
 * `packs × packSize`, not the bare board count. Pricing the pack-rounded
 * figure is what stops the estimate and the receipt disagreeing.
 */
export function purchasePlan(boards: number, packSize: number): PurchasePlan {
  if (!Number.isFinite(boards) || boards <= 0) {
    return { packs: 0, boards: 0, spare: 0, packSize: packSize > 0 ? packSize : 1 };
  }
  const size = packSize > 0 ? packSize : 1;
  const packs = Math.max(1, Math.ceil(boards / size - EPSILON));
  const purchased = packs * size;
  return { packs, boards: purchased, spare: purchased - boards, packSize: size };
}

/** Packs needed for the shopping list. */
export function packsNeeded(boards: number, packSize: number): number {
  return purchasePlan(boards, packSize).packs;
}

export interface CostBreakdown {
  boardSubtotal: number;
  fastenerSubtotal: number;
  total: number;
}

export function calculateCost(options: {
  boards: number;
  boardPrice: number;
  nailBoxes: number;
  nailPrice: number;
  adhesiveTubes: number;
  adhesivePrice: number;
}): CostBreakdown {
  const boardSubtotal = Math.max(0, options.boards) * Math.max(0, options.boardPrice);
  const fastenerSubtotal =
    Math.max(0, options.nailBoxes) * Math.max(0, options.nailPrice) +
    Math.max(0, options.adhesiveTubes) * Math.max(0, options.adhesivePrice);
  return {
    boardSubtotal,
    fastenerSubtotal,
    total: boardSubtotal + fastenerSubtotal,
  };
}
