/**
 * Konstanta role pengguna — sesuai dengan nilai di tabel profiles.role di database.
 * Gunakan konstanta ini di seluruh codebase, jangan hardcode string role.
 */
export const ROLES = {
  KONSUMEN: 'KONSUMEN',
  PETUGAS: 'PETUGAS',
  ADMIN_TPS: 'ADMIN_TPS',
  BRAND: 'BRAND',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
