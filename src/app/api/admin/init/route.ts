import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { initAdminSchema } from "@/lib/db/admin-schema";

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only OWNER can initialize schema" },
        { status: 403 }
      );
    }

    initAdminSchema();

    return NextResponse.json({
      success: true,
      message: "Admin schema initialized successfully",
    });
  } catch (error: any) {
    console.error("Schema init error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize schema" },
      { status: 500 }
    );
  }
}
