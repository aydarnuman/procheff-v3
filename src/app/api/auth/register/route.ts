import { createDefaultOrgForUser, createUser, findUserByEmail, initAuthSchema } from "@/lib/db/init-auth";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: NextRequest) {
  initAuthSchema();
  const body = await req.json();
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    orgName: z.string().min(2).default("Procheff Workspace"),
  });
  
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Geçersiz veri" }, { status: 400 });
  }
  
  const { email, password, name, orgName } = parsed.data;

  const exists = findUserByEmail(email);
  if (exists) return NextResponse.json({ success: false, error: "Bu email zaten kayıtlı" }, { status: 409 });

  const userId = nanoid(12);
  createUser({ id: userId, email, name, password });

  const orgId = nanoid(10);
  createDefaultOrgForUser({ orgId, userId, orgName });

  return NextResponse.json({ success: true });
}
