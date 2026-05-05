/**
 * Konstanta role pengguna — sesuai dengan nilai di tabel profiles.role di database.
 * Gunakan konstanta ini di seluruh codebase, jangan hardcode string 'KONSUMEN'/'PETUGAS'/'BRAND'.
 */
export const ROLES = {
  KONSUMEN: 'KONSUMEN',
  PETUGAS: 'PETUGAS',
  BRAND: 'BRAND',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
