"use client";
import { Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) router.push("/monitor");
    else setErr("Giriş başarısız. Bilgileri kontrol et.");
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md glass-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="h1 text-2xl">Procheff – Giriş</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-gray-100"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Şifre</label>
            <input
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-gray-100"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-sm text-rose-400">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gradient disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <Divider />
        <RegisterHint />
      </div>
    </main>
  );
}

function Divider() {
  return <div className="my-6 h-px bg-slate-800" />;
}

function RegisterHint() {
  async function seed() {
    const email = prompt("Yeni kullanıcı email:");
    if (!email) return;
    const password = prompt("Şifre (min 6):") || "";
    const orgName = prompt("Organizasyon adı:") || "Procheff Workspace";
    const name = email.split("@")[0];
    await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, orgName }),
    });
    alert("Kayıt oluşturuldu. Şimdi giriş yapabilirsin.");
  }
  return (
    <div className="text-sm text-gray-400">
      İlk kez kullanıyorsan{" "}
      <button onClick={seed} className="text-indigo-400 hover:underline">
        hızlı kayıt oluştur
      </button>
      .
    </div>
  );
}
