/* eslint-disable @typescript-eslint/no-explicit-any */
import { findUserByEmail, getUserOrgs, initAuthSchema, verifyPassword } from "@/lib/db/init-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

export const authOptions = {
  session: { strategy: "jwt" as const },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        initAuthSchema(); // idempotent
        const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
        const parsed = schema.safeParse(credentials);
        
        if (!parsed.success) return null;
        
        const { email, password } = parsed.data;

        const user = await findUserByEmail(email);
        if (!user) return null;
        const ok = await verifyPassword(user.password_hash, password);
        if (!ok) return null;

        const orgs = await getUserOrgs(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          orgs,
          activeOrgId: orgs[0]?.id || null,
          role: orgs[0]?.role || null,
        };
      },
    }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.uid = user.id;
        token.orgs = user.orgs || [];
        token.activeOrgId = user.activeOrgId || null;
        token.role = user.role || null;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.orgs = token.orgs;
        session.user.activeOrgId = token.activeOrgId;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
