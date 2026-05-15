export const ROLES = ['KONSUMEN', 'PETUGAS', 'ADMIN_TPS', 'BRAND'] as const;

export type Role = (typeof ROLES)[number];

/**
 * Default allowed_actions suggestions per TPS type.
 * Admin TPS bisa override saat registrasi.
 */
export const DEFAULT_ALLOWED_ACTIONS: Record<string, string[]> = {
  'TPS': ['collecting', 'receiving'],
  'TPS3R': ['collecting', 'receiving', 'inspecting', 'shipping'],
  'Bank Sampah': ['receiving', 'inspecting', 'recycling'],
  'TPST': ['collecting', 'receiving', 'inspecting', 'shipping', 'recycling'],
  'TPA': ['receiving', 'disposing'],
  'Pengepul': ['receiving', 'shipping'],
  'Recycler': ['receiving', 'inspecting', 'recycling'],
};

/**
 * All valid biz_step values.
 */
export const VALID_BIZ_STEPS = [
  'commissioning', 'discarding', 'collecting', 'receiving',
  'inspecting', 'shipping', 'recycling', 'disposing'
] as const;
