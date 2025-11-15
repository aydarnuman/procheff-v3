import { getAdminStats, getActivityLogs } from "@/lib/db/admin-queries";
import type { ActivityLogEntry } from "@/lib/db/admin-queries";
import { Users, Building2, Activity, UserCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const stats = await getAdminStats();
  const recentActivity = await getActivityLogs({ limit: 10 });

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          label="Toplam Kullanıcı"
          value={stats.totalUsers}
          color="blue"
        />
        <StatCard
          icon={<UserCheck className="h-6 w-6" />}
          label="Aktif Kullanıcı"
          value={stats.activeUsers}
          color="green"
        />
        <StatCard
          icon={<Building2 className="h-6 w-6" />}
          label="Organizasyonlar"
          value={stats.totalOrgs}
          color="purple"
        />
        <StatCard
          icon={<Activity className="h-6 w-6" />}
          label="Son 24s Giriş"
          value={stats.recentLogins}
          color="orange"
        />
      </div>

      {/* Role Distribution */}
      <div className="glass-card mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Rol Dağılımı</h3>
        <div className="space-y-3">
          {stats.roleDistribution.length > 0 ? (
            stats.roleDistribution.map((item) => (
              <div key={item.role} className="flex items-center justify-between">
                <span className="text-gray-300">{item.role}</span>
                <span className="text-white font-semibold">{item.count} kullanıcı</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">Henüz rol ataması yapılmamış</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Son Aktiviteler</h3>
          <Link href="/admin/activity" className="text-sm text-indigo-400 hover:text-indigo-300">
            Tümünü Gör →
          </Link>
        </div>
        <div className="space-y-3">
          {recentActivity && Array.isArray(recentActivity) && recentActivity.length > 0 ? (
            recentActivity.map((log: ActivityLogEntry) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-green-400 mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-white">
                    {log.user_name || "Sistem"} - {log.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm p-3">Henüz aktivite kaydı bulunmuyor</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Link href="/admin/users" className="glass-card hover:bg-white/10 transition-all p-6">
          <Users className="h-8 w-8 text-indigo-400 mb-3" />
          <h4 className="text-white font-semibold mb-1">Kullanıcı Yönetimi</h4>
          <p className="text-sm text-gray-400">Kullanıcıları görüntüle ve düzenle</p>
        </Link>

        <Link href="/admin/organizations" className="glass-card hover:bg-white/10 transition-all p-6">
          <Building2 className="h-8 w-8 text-purple-400 mb-3" />
          <h4 className="text-white font-semibold mb-1">Organizasyonlar</h4>
          <p className="text-sm text-gray-400">Organizasyonları yönet</p>
        </Link>

        <Link href="/admin/activity" className="glass-card hover:bg-white/10 transition-all p-6">
          <Activity className="h-8 w-8 text-green-400 mb-3" />
          <h4 className="text-white font-semibold mb-1">Aktivite Logları</h4>
          <p className="text-sm text-gray-400">Sistem aktivitelerini takip et</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  };

  return (
    <div className="glass-card">
      <div className={`h-12 w-12 rounded-xl ${colorClasses[color]} border grid place-items-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
