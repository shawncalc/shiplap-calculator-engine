/**
 * Drywall sheet + finishing engine.
 *
 * Canonical units: feet for room dimensions and areas, inches for fastener
 * spacing. Pure and synchronous so the UI can recompute on every keystroke.
 *
 * ── Where the coefficients come from ────────────────────────────────────────
 * None of these are "a number that felt right". Each one is a published
 * manufacturer or industry figure, and the page repeats them in a table so a
 * reader can check the arithmetic on the back of an envelope:
 *
 *   joint compound  10.0 gal per 1,000 sq ft   USG Sheetrock All Purpose Joint
 *                                              Compound, submittal J1969
 *   paper tape     370 ft per 1,000 sq ft      USG Sheetrock Paper Joint Tape,
 *                                              submittal J1736
 *   screws, walls   28 per 4 × 8 sheet         USG fastener spacing: 16 in o.c.
 *   screws, ceiling 35 per 4 × 8 sheet         USG fastener spacing: 12 in o.c.
 *   sheet weights   1.78 lb/sq ft (1/2 in)     manufacturer data, 4 × 8 = 57 lb
 *                   2.19 lb/sq ft (5/8 in)     4 × 8 = 70 lb
 *
 * ── What the sheet count actually is ────────────────────────────────────────
 * The industry-standard *area* method: gross surface area, minus openings,
 * plus a waste allowance, divided by the sheet area, rounded up. It is a
 * purchasing number, not a cut list. The page says that out loud rather than
 * pretending the calculator has laid out your boards for you.
 */

/** 4 × 8 sheets are 32 sq ft; the longer lengths trade weight for fewer joints. */
export type SheetId = '4x8' | '4x10' | '4x12';
export type ThicknessId = '1/2' | '5/8' | 'mr';

export interface SheetOption {
  id: SheetId;
  lengthFt: number;
  areaSqFt: number;
  label: string;
  detail: string;
}

export const SHEETS: SheetOption[] = [
  { id: '4x8', lengthFt: 8, areaSqFt: 32, label: '4 × 8 ft', detail: '32 sq ft · the default' },
  { id: '4x10', lengthFt: 10, areaSqFt: 40, label: '4 × 10 ft', detail: '40 sq ft · fewer joints' },
  { id: '4x12', lengthFt: 12, areaSqFt: 48, label: '4 × 12 ft', detail: '48 sq ft · fewest joints, heaviest' },
];

export interface ThicknessOption {
  id: ThicknessId;
  label: string;
  detail: string;
  /** Pounds per square foot of board. */
  lbPerSqFt: number;
  /** Screw the board actually needs. */
  screw: string;
  /** Nominal screws in a 1 lb box — used to turn a count into boxes. */
  screwsPerLb: number;
  note: string;
}

export const THICKNESSES: ThicknessOption[] = [
  {
    id: '1/2',
    label: '1/2 in',
    detail: 'Standard walls',
    lbPerSqFt: 1.78,
    screw: '1-1/4 in',
    screwsPerLb: 300,
    note: 'The default for walls on framing at 16 in centres.',
  },
  {
    id: '5/8',
    label: '5/8 in',
    detail: 'Ceilings & fire-rated',
    lbPerSqFt: 2.19,
    screw: '1-5/8 in',
    screwsPerLb: 190,
    note: 'Stiffer, so it sags less on ceilings. Also the usual Type X fire rating.',
  },
  {
    id: 'mr',
    label: '1/2 in MR',
    detail: 'Moisture resistant',
    lbPerSqFt: 1.82,
    screw: '1-1/4 in',
    screwsPerLb: 300,
    note: 'Green board. Damp rooms only — not inside a shower or a steam enclosure.',
  },
];

/** Retail packaging the shopping list has to round to. */
export const PACKAGING = {
  /** Ready-mixed compound, the standard pail. */
  mudPailGal: 4.5,
  /** Hand-taping roll. Banjos use 500 ft, but most visitors are hand-taping. */
  tapeRollFt: 250,
  /** Corner bead comes in 8 ft sticks at the big boxes. */
  beadStickFt: 8,
} as const;

/** Square feet one standard door / window removes, at typical residential sizes. */
export const OPENING_SQFT = {
  /** 3 × 7 ft = 21 sq ft. */
  door: 21,
  /** 3 × 5 ft = 15 sq ft. */
  window: 15,
} as const;

export const COEFFICIENTS = {
  mudGalPer1000SqFt: 10,
  tapeFtPer1000SqFt: 370,
  /** USG: 28 screws in a 4 × 8 sheet on walls at 16 in o.c. → 0.875 per sq ft. */
  wallScrewsPerSqFt: 28 / 32,
  /** USG: 35 screws in a 4 × 8 sheet on a ceiling at 12 in o.c. → 1.094 per sq ft. */
  ceilingScrewsPerSqFt: 35 / 32,
} as const;

export interface DrywallInput {
  includeWalls: boolean;
  includeCeiling: boolean;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  /** Skip the room maths and type a total area instead. */
  useArea: boolean;
  knownAreaSqFt: number;
  doors: number;
  windows: number;
  /** Garage doors, sliders, archways — anything bigger than a standard door. */
  largeOpeningsSqFt: number;
  sheetId: SheetId;
  thicknessId: ThicknessId;
  wasteRatio: number;
  /** Outside corners, each one takes a stick of bead. */
  outsideCorners: number;
}

export interface DrywallResult {
  valid: boolean;
  wallAreaSqFt: number;
  ceilingAreaSqFt: number;
  grossAreaSqFt: number;
  openingAreaSqFt: number;
  netAreaSqFt: number;
  sheetAreaSqFt: number;
  sheets: number;
  /** Sheets before the waste allowance — shows what the waste costs. */
  sheetsNoWaste: number;
  screws: number;
  screwPounds: number;
  tapeFt: number;
  tapeRolls: number;
  mudGal: number;
  mudPails: number;
  cornerBeadSticks: number;
  totalWeightLb: number;
  heaviestSheetLb: number;
  /**
   * Board is hung with its 4 ft edge vertical, so wall height / 4 decides how
   * many courses there are. A leftover strip under a foot is where the waste
   * allowance stops being generous.
   */
  heightAdvice: 'exact' | 'strip' | 'narrow' | 'none';
  topStripFt: number;
}

export const EMPTY_DRYWALL: DrywallResult = {
  valid: false,
  wallAreaSqFt: 0,
  ceilingAreaSqFt: 0,
  grossAreaSqFt: 0,
  openingAreaSqFt: 0,
  netAreaSqFt: 0,
  sheetAreaSqFt: 32,
  sheets: 0,
  sheetsNoWaste: 0,
  screws: 0,
  screwPounds: 0,
  tapeFt: 0,
  tapeRolls: 0,
  mudGal: 0,
  mudPails: 0,
  cornerBeadSticks: 0,
  totalWeightLb: 0,
  heaviestSheetLb: 0,
  heightAdvice: 'none',
  topStripFt: 0,
};

const num = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

export function calculateDrywall(input: DrywallInput): DrywallResult {
  const sheet = SHEETS.find((s) => s.id === input.sheetId) ?? SHEETS[0];
  const thickness = THICKNESSES.find((t) => t.id === input.thicknessId) ?? THICKNESSES[0];
  const wasteRatio = Math.min(0.5, Math.max(0, num(input.wasteRatio)));

  const lengthFt = num(input.lengthFt);
  const widthFt = num(input.widthFt);
  const heightFt = num(input.heightFt);

  let wallArea = 0;
  let ceilingArea = 0;

  if (input.useArea) {
    const known = num(input.knownAreaSqFt);
    if (known < 1) return { ...EMPTY_DRYWALL, sheetAreaSqFt: sheet.areaSqFt };
    // A typed area is one number: it already covers whatever surfaces the
    // visitor measured, so we do not try to split it between walls and ceiling.
    wallArea = known;
  } else {
    if (lengthFt < 1 || widthFt < 1) return { ...EMPTY_DRYWALL, sheetAreaSqFt: sheet.areaSqFt };
    if (input.includeWalls) {
      if (heightFt < 1) return { ...EMPTY_DRYWALL, sheetAreaSqFt: sheet.areaSqFt };
      wallArea = 2 * (lengthFt + widthFt) * heightFt;
    }
    if (input.includeCeiling) ceilingArea = lengthFt * widthFt;
    if (wallArea + ceilingArea < 1) return { ...EMPTY_DRYWALL, sheetAreaSqFt: sheet.areaSqFt };
  }

  // Openings only exist on walls, and never more than the wall itself.
  const requestedOpenings = input.useArea
    ? 0
    : Math.max(0, num(input.doors)) * OPENING_SQFT.door +
      Math.max(0, num(input.windows)) * OPENING_SQFT.window +
      Math.max(0, num(input.largeOpeningsSqFt));
  const openingArea = Math.min(requestedOpenings, wallArea * 0.9);

  const wallNet = Math.max(0, wallArea - openingArea);
  const grossArea = wallArea + ceilingArea;
  const netArea = Math.max(0, wallNet + ceilingArea);

  const sheetsNoWaste = netArea / sheet.areaSqFt;
  const sheets = Math.max(1, Math.ceil(sheetsNoWaste * (1 + wasteRatio) - 1e-6));

  // Fasteners and finishing are quoted against the boarded area *before* the
  // waste allowance: you do not screw or tape the sheets you never hung.
  let screws = 0;
  if (!input.useArea) {
    screws = wallNet * COEFFICIENTS.wallScrewsPerSqFt + ceilingArea * COEFFICIENTS.ceilingScrewsPerSqFt;
  } else {
    // No wall/ceiling split available — use the wall rate, which is the lower
    // of the two, and the page tells the reader to round up a box.
    screws = netArea * COEFFICIENTS.wallScrewsPerSqFt;
  }
  screws = Math.ceil(screws);

  const tapeFt = Math.ceil((netArea / 1000) * COEFFICIENTS.tapeFtPer1000SqFt);
  const mudGal = (netArea / 1000) * COEFFICIENTS.mudGalPer1000SqFt;

  const courses = input.useArea ? 0 : Math.ceil(heightFt / 4);
  const topStripFt = input.useArea || !input.includeWalls ? 0 : heightFt - (courses - 1) * 4;
  const heightAdvice: DrywallResult['heightAdvice'] =
    input.useArea || !input.includeWalls
      ? 'none'
      : topStripFt >= 3.99
        ? 'exact'
        : topStripFt < 1
          ? 'narrow'
          : 'strip';

  return {
    valid: true,
    wallAreaSqFt: wallArea,
    ceilingAreaSqFt: ceilingArea,
    grossAreaSqFt: grossArea,
    openingAreaSqFt: openingArea,
    netAreaSqFt: netArea,
    sheetAreaSqFt: sheet.areaSqFt,
    sheets,
    sheetsNoWaste: Math.ceil(sheetsNoWaste - 1e-6),
    screws,
    screwPounds: screws / thickness.screwsPerLb,
    tapeFt,
    tapeRolls: Math.max(1, Math.ceil(tapeFt / PACKAGING.tapeRollFt)),
    mudGal,
    mudPails: Math.max(1, Math.ceil(mudGal / PACKAGING.mudPailGal)),
    cornerBeadSticks: Math.ceil(
      (Math.max(0, num(input.outsideCorners)) * Math.max(1, input.useArea ? 8 : heightFt)) /
        PACKAGING.beadStickFt,
    ),
    totalWeightLb: sheets * sheet.areaSqFt * thickness.lbPerSqFt,
    heaviestSheetLb: sheet.areaSqFt * thickness.lbPerSqFt,
    heightAdvice,
    topStripFt,
  };
}

export interface DrywallCost {
  boardSubtotal: number;
  finishingSubtotal: number;
  total: number;
}

export function calculateDrywallCost(options: {
  sheets: number;
  sheetPrice: number;
  screwBoxes: number;
  screwPrice: number;
  tapeRolls: number;
  tapePrice: number;
  mudPails: number;
  mudPrice: number;
  beadSticks: number;
  beadPrice: number;
}): DrywallCost {
  const boardSubtotal = Math.max(0, options.sheets) * Math.max(0, options.sheetPrice);
  const finishingSubtotal =
    Math.max(0, options.screwBoxes) * Math.max(0, options.screwPrice) +
    Math.max(0, options.tapeRolls) * Math.max(0, options.tapePrice) +
    Math.max(0, options.mudPails) * Math.max(0, options.mudPrice) +
    Math.max(0, options.beadSticks) * Math.max(0, options.beadPrice);
  return { boardSubtotal, finishingSubtotal, total: boardSubtotal + finishingSubtotal };
}
