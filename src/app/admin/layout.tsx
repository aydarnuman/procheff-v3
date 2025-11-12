import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Admin Panel - Procheff v3",
  description: "Sistem yönetimi ve kullanıcı yönetimi",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Giriş kontrolü
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin");
  }

  // Yetki kontrolü - Sadece OWNER ve ADMIN
  const allowedRoles = ["OWNER", "ADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-white/10 mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 grid place-items-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Paneli</h1>
              <p className="text-sm text-white/70">Sistem Yönetimi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="px-6">{children}</div>
    </div>
  );
}
