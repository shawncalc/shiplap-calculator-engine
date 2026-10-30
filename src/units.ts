/**
 * Unit helpers.
 *
 * Everything inside the calculator is stored in INCHES so a single source of
 * truth feeds both the imperial and the metric UI. Conversion only happens at
 * the display / input boundary.
 */

export type UnitSystem = 'imperial' | 'metric';

export const INCHES_PER_FOOT = 12;
export const INCHES_PER_METER = 39.3700787;
export const SQ_INCHES_PER_SQ_FOOT = 144;
export const SQ_INCHES_PER_SQ_METER = 1550.0031;

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Split an inch value into whole feet + remaining inches for the ft/in inputs. */
export function splitImperial(inches: number): { major: number; minor: number } {
  const safe = Math.max(0, inches);
  const feet = Math.floor(safe / INCHES_PER_FOOT);
  const minor = round(safe - feet * INCHES_PER_FOOT, 2);
  if (minor >= INCHES_PER_FOOT) return { major: feet + 1, minor: 0 };
  return { major: feet, minor };
}

/** Split an inch value into whole metres + remaining centimetres for metric inputs. */
export function splitMetric(inches: number): { major: number; minor: number } {
  const totalCm = round(Math.max(0, inches) * 2.54, 2);
  let meters = Math.floor(totalCm / 100);
  let cm = round(totalCm - meters * 100, 1);
  if (cm >= 100) {
    meters += 1;
    cm = 0;
  }
  return { major: meters, minor: cm };
}

export function metersCmToInches(meters: number, cm: number): number {
  return ((meters * 100 + cm) / 100) * INCHES_PER_METER;
}

export function feetInchesToInches(feet: number, inches: number): number {
  return feet * INCHES_PER_FOOT + inches;
}

/** "12 ft 6 in" / "3.81 m" — used for wall length + height chips. */
export function formatLength(inches: number, unit: UnitSystem): string {
  if (!Number.isFinite(inches)) return '—';
  if (unit === 'metric') {
    const meters = inches / INCHES_PER_METER;
    if (meters < 1) return `${round(inches * 2.54, 1)} cm`;
    return `${round(meters, 2)} m`;
  }
  const { major, minor } = splitImperial(inches);
  if (minor === 0) return `${major} ft`;
  return `${major} ft ${minor} in`;
}

/** Short precise measurement for callouts, e.g. "2 in" / "5.1 cm". */
export function formatWidth(inches: number, unit: UnitSystem): string {
  if (!Number.isFinite(inches)) return '—';
  if (unit === 'metric') return `${round(inches * 2.54, 1)} cm`;
  return `${round(inches, 2)} in`;
}

/** Running length totals, e.g. "170 ft" / "51.8 m". */
export function formatRunLength(inches: number, unit: UnitSystem): string {
  if (!Number.isFinite(inches)) return '—';
  if (unit === 'metric') return `${round(inches / INCHES_PER_METER, 1)} m`;
  return `${round(inches / INCHES_PER_FOOT, 1)} ft`;
}

export function formatArea(sqInches: number, unit: UnitSystem): string {
  if (!Number.isFinite(sqInches)) return '—';
  if (unit === 'metric') return `${round(sqInches / SQ_INCHES_PER_SQ_METER, 2)} m²`;
  return `${round(sqInches / SQ_INCHES_PER_SQ_FOOT, 1)} sq ft`;
}

/** Area entered by the user (sq ft / m²) converted back to canonical sq inches. */
export function areaInputToSqInches(value: number, unit: UnitSystem): number {
  return unit === 'metric' ? value * SQ_INCHES_PER_SQ_METER : value * SQ_INCHES_PER_SQ_FOOT;
}

export function sqInchesToAreaInput(sqInches: number, unit: UnitSystem): number {
  return unit === 'metric'
    ? round(sqInches / SQ_INCHES_PER_SQ_METER, 2)
    : round(sqInches / SQ_INCHES_PER_SQ_FOOT, 1);
}

export function formatMoney(value: number, currency: 'USD' | 'GBP'): string {
  const locale = currency === 'GBP' ? 'en-GB' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
