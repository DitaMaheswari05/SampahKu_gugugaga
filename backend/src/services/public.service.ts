import { supabase } from '../config/supabase';

export class PublicService {
  static async getDashboardStats() {
    // Pengguna Aktif: Count of profiles with role KONSUMEN or PETUGAS
    const { count: usersCount, error: err1 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['KONSUMEN', 'PETUGAS']);
      
    if (err1) throw err1;

    // Produk Terlacak: Total instances
    const { count: instancesCount, error: err2 } = await supabase
      .from('product_instances')
      .select('*', { count: 'exact', head: true });
      
    if (err2) throw err2;

    // Recovery Rate: Recycled / Total Instances
    const { count: recycledCount, error: err3 } = await supabase
      .from('product_instances')
      .select('*', { count: 'exact', head: true })
      .eq('current_status', 'RECYCLED');

    if (err3) throw err3;

    const recoveryRate = instancesCount && instancesCount > 0 
      ? Math.round(((recycledCount || 0) / instancesCount) * 100) 
      : 0;

    return {
      recovery_rate: recoveryRate,
      tracked_products: instancesCount || 0,
      active_users: usersCount || 0
    };
  }
}
