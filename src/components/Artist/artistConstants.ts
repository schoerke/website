/**
 * Instrument category priority order used for sorting artists and filter buttons.
 * Keys are the lowercase database values stored in the Artist collection.
 * Lower number = higher priority (appears first).
 * Instruments not listed default to priority 7 (winds, chamber music, etc.).
 */
export const INSTRUMENT_PRIORITY: { [key: string]: number } = {
  conductor: 1,
  piano: 2,
  'piano-forte': 2, // Same priority as piano
  violin: 3,
  cello: 4,
  viola: 5,
  bass: 6,
  // All other instruments (winds, chamber music, etc.) get category 7
}
