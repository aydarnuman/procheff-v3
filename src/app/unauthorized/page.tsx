import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full text-center p-8">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Yetkisiz Erişim</h1>
        <p className="text-gray-400 mb-6">
          Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece OWNER ve ADMIN rolleri
          bu alana erişebilir.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
