import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { webhookService } from "@/lib/integrations/webhook-service";
import { z } from "zod";

// Webhook validation schema
const WebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().optional(),
  active: z.boolean().default(true),
  retry_count: z.number().int().min(0).max(10).default(3),
  timeout_ms: z.number().int().min(1000).max(30000).default(5000),
});

const UpdateWebhookSchema = WebhookSchema.partial();

/**
 * GET /api/settings/integrations/webhooks
 * Get all webhooks
 */
export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhooks = await webhookService.getAllWebhooks();

    return NextResponse.json({
      success: true,
      webhooks,
    });
  } catch (error) {
    console.error("Failed to get webhooks:", error);
    return NextResponse.json(
      { error: "Failed to get webhooks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/integrations/webhooks
 * Create a new webhook
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = WebhookSchema.parse(body);

    const webhook = await webhookService.createWebhook(validatedData);

    return NextResponse.json({
      success: true,
      webhook,
      message: "Webhook created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/integrations/webhooks
 * Update a webhook
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "Invalid webhook ID" },
        { status: 400 }
      );
    }

    const validatedUpdates = UpdateWebhookSchema.parse(updates);
    const success = await webhookService.updateWebhook(id, validatedUpdates);

    if (!success) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/integrations/webhooks
 * Delete a webhook
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid webhook ID" },
        { status: 400 }
      );
    }

    const success = await webhookService.deleteWebhook(Number(id));

    if (!success) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}