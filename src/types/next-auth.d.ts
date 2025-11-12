import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string | null;
    orgs?: Array<{ id: string; name: string; role: string }>;
    activeOrgId?: string | null;
    role?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      orgs?: Array<{ id: string; name: string; role: string }>;
      activeOrgId?: string | null;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    orgs?: Array<{ id: string; name: string; role: string }>;
    activeOrgId?: string | null;
    role?: string | null;
  }
}
