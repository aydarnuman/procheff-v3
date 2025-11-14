import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { webhookService } from "@/lib/integrations/webhook-service";

/**
 * POST /api/settings/integrations/test-webhook
 * Test a webhook
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { webhookId } = body;

    if (!webhookId || typeof webhookId !== "number") {
      return NextResponse.json(
        { error: "Invalid webhook ID" },
        { status: 400 }
      );
    }

    const result = await webhookService.testWebhook(webhookId);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      message: result.message,
    });
  } catch (error) {
    console.error("Failed to test webhook:", error);
    return NextResponse.json(
      { error: "Failed to test webhook" },
      { status: 500 }
    );
  }
}