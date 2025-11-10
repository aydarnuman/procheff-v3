"use client";
import { LogOut, UserCircle2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  activeOrgId?: string | null;
}

export function UserMenu() {
  const { data } = useSession();
  const user = data?.user as ExtendedUser | undefined;

  if (!user) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="hidden md:block text-sm text-gray-300">
        <div className="font-medium">{user?.name || user?.email}</div>
        <div className="text-gray-400 text-xs">{user?.activeOrgId ? "Aktif Workspace" : "—"}</div>
      </div>
      <button className="rounded-lg p-2 bg-slate-900/70 border border-slate-700 hover:border-slate-600 transition-colors">
        <UserCircle2 className="h-5 w-5 text-gray-300" />
      </button>
      <button
        onClick={() => signOut({ callbackUrl: "/signin" })}
        className="rounded-lg p-2 bg-slate-900/70 border border-slate-700 hover:border-red-500 transition-colors"
        title="Çıkış"
      >
        <LogOut className="h-5 w-5 text-gray-300" />
      </button>
    </div>
  );
}
