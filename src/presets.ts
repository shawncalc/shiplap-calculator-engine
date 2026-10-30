/**
 * Board presets extracted from the wallboardcalc.com calculators.
 *
 * These are the real retail numbers the site uses — dressed (actual) face
 * widths, not nominal shelf-tag sizes. UK cladding is sold by nominal width
 * (100/150/200 mm) but the tongue eats ~6 mm, so the face you actually see is
 * 94/144/194 mm.
 *
 * All widths are in INCHES (canonical unit — see units.ts). Nothing in this
 * file knows about React, Next.js, affiliate links or any particular shop.
 */

export interface BoardStyle {
  id: string;
  /** ACTUAL face width in inches — dressed size, not the nominal name. */
  widthIn: number;
  /** Short name used in a shopping list, e.g. "1x6" or "150 mm". */
  name: string;
  /** Human detail line, e.g. "Balanced · 5½ in". */
  detail: string;
}

export interface BoardLength {
  /** Canonical length in inches. */
  inches: number;
  /** Display label, e.g. "8 ft". */
  label: string;
}

/** Common US shiplap / tongue-and-groove board sizes (Home Depot / Lowe's). */
export const US_BOARD_STYLES: BoardStyle[] = [
  { id: '1x4', widthIn: 3.5, name: '1x4', detail: 'Narrow · 3½ in' },
  { id: '1x6', widthIn: 5.5, name: '1x6', detail: 'Balanced · 5½ in' },
  { id: '1x8', widthIn: 7.25, name: '1x8', detail: 'Wide · 7¼ in' },
];

/** UK cladding boards — nominal mm name, dressed mm face. */
export const UK_BOARD_STYLES: BoardStyle[] = [
  { id: '100mm', widthIn: 3.7008, name: '100 mm', detail: 'Narrow · 94 mm face' },
  { id: '150mm', widthIn: 5.6693, name: '150 mm', detail: 'Common · 144 mm face' },
  { id: '200mm', widthIn: 7.6378, name: '200 mm', detail: 'Wide · 194 mm face' },
];

/** Stock board lengths sold in the US. */
export const US_BOARD_LENGTHS: BoardLength[] = [
  { inches: 96, label: '8 ft' },
  { inches: 144, label: '12 ft' },
  { inches: 192, label: '16 ft' },
];

/** Stock board lengths sold in the UK (metric cutting lists). */
export const UK_BOARD_LENGTHS: BoardLength[] = [
  { inches: 94.488, label: '2.4 m' },
  { inches: 118.11, label: '3.0 m' },
  { inches: 141.73, label: '3.6 m' },
];

export interface RevealOption {
  inches: number;
  label: string;
  detail: string;
}

/** The three joint styles that cover virtually every shiplap look. */
export const REVEAL_OPTIONS: RevealOption[] = [
  { inches: 0, label: 'Flush joint (0 in)', detail: 'Boards butt tight together' },
  { inches: 0.0625, label: 'Micro gap (1/16 in)', detail: 'Tight shadow line' },
  { inches: 0.125, label: 'Nickel gap (1/8 in)', detail: 'The classic shiplap look' },
];

export interface WasteOption {
  ratio: number;
  label: string;
}

export const WASTE_OPTIONS: WasteOption[] = [
  { ratio: 0.05, label: '5% — simple rectangle, few cuts' },
  { ratio: 0.1, label: '10% — recommended for most rooms' },
  { ratio: 0.15, label: '15% — lots of cuts, angles or outlets' },
];
