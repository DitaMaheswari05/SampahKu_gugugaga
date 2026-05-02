export const ROLES = ['KONSUMEN', 'PETUGAS', 'BRAND'] as const;

export const POINTS = {
  DISCARDED: 1,
  PICKED_UP: 2,
  AT_TPS: 3,
  SORTED: 4,
  IN_TRANSIT: 2,
  AT_FACILITY: 5,
  RECYCLED: 10,
  DISPOSED: 1
} as const;

export type Role = (typeof ROLES)[number];
