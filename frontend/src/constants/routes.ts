import { ROLES, UserRole } from './roles';

/**
 * Peta role → halaman dashboard utama masing-masing role.
 * Tambahkan entry baru di sini jika ada role baru — tidak perlu modifikasi komponen lain (OCP).
 */
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  [ROLES.BRAND]: '/brand/dashboard',
  [ROLES.PETUGAS]: '/petugas/dashboard',
  [ROLES.KONSUMEN]: '/dashboard',
};

/**
 * Kembalikan route home sesuai role.
 * Fallback ke '/dashboard' jika role tidak dikenali.
 */
export const getHomeRouteByRole = (role: string): string => {
  return ROLE_HOME_ROUTES[role as UserRole] ?? '/dashboard';
};
