/**
 * wallboard-engine — the calculation engine behind wallboardcalc.com.
 *
 * Pure TypeScript. No React, no DOM, no network, no dependencies.
 * Everything runs synchronously so a UI can recompute on every keystroke.
 *
 *   shiplap  → calculateShiplap(), purchasePlan(), calculateCost()
 *   drywall  → calculateDrywall(), calculateDrywallCost()
 *   units    → inch/foot/metre conversions and formatters
 *   presets  → real retail board sizes (US + UK)
 */

export * from './shiplap.js';
export * from './drywall.js';
export * from './units.js';
export * from './presets.js';
