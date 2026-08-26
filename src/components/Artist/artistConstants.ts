/**
 * Instrument category priority order used for sorting artists and filter buttons.
 * Keys are the lowercase database values stored in the Artist collection.
 * Lower number = higher priority (appears first).
 * Instruments not listed default to priority 9 (unknown).
 */
export const INSTRUMENT_PRIORITY: { [key: string]: number } = {
  conductor: 1,
  piano: 2,
  'piano-forte': 2, // Same priority as piano
  violin: 3,
  viola: 4,
  cello: 5,
  bass: 6,
  horn: 7,
  'chamber-music': 8,
  // All other instruments default to category 9
}
