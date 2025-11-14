import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { integrationService, IntegrationType } from "@/lib/integrations/integration-service";
import { z } from "zod";

/**
 * GET /api/settings/integrations
 * Get all integration configurations
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrations = await integrationService.getAllIntegrations();

    return NextResponse.json({
      success: true,
      integrations,
    });
  } catch (error) {
    console.error("Failed to get integrations:", error);
    return NextResponse.json(
      { error: "Failed to get integrations" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/integrations
 * Update integration configuration
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { service, config, enabled } = body;

    if (!service || !["ihalebul", "google_sheets", "slack", "discord", "zapier"].includes(service)) {
      return NextResponse.json(
        { error: "Invalid service type" },
        { status: 400 }
      );
    }

    const success = await integrationService.updateIntegration(
      service as IntegrationType,
      config,
      enabled
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update integration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${service} integration updated successfully`,
    });
  } catch (error) {
    console.error("Failed to update integration:", error);
    return NextResponse.json(
      { error: "Failed to update integration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/integrations
 * Test integration or trigger action
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, service, data } = body;

    if (action === "test") {
      // Test integration connection
      if (!service || !["ihalebul", "google_sheets", "slack", "discord", "zapier"].includes(service)) {
        return NextResponse.json(
          { error: "Invalid service type" },
          { status: 400 }
        );
      }

      const result = await integrationService.testIntegration(service as IntegrationType);

      return NextResponse.json({
        success: result.success,
        message: result.message,
      });
    } else if (action === "toggle") {
      // Enable/disable integration
      if (!service || typeof body.enabled !== "boolean") {
        return NextResponse.json(
          { error: "Invalid request" },
          { status: 400 }
        );
      }

      const success = await integrationService.toggleIntegration(
        service as IntegrationType,
        body.enabled
      );

      return NextResponse.json({
        success,
        message: success
          ? `${service} ${body.enabled ? "enabled" : "disabled"} successfully`
          : "Failed to toggle integration",
      });
    } else if (action === "send") {
      // Send data to integration (e.g., Slack notification, Zapier webhook)
      if (service === "slack" && data?.message) {
        const success = await integrationService.sendSlackNotification(
          data.message,
          data.attachments
        );
        return NextResponse.json({
          success,
          message: success ? "Slack notification sent" : "Failed to send Slack notification",
        });
      } else if (service === "discord" && data?.content) {
        const success = await integrationService.sendDiscordNotification(
          data.content,
          data.embeds
        );
        return NextResponse.json({
          success,
          message: success ? "Discord notification sent" : "Failed to send Discord notification",
        });
      } else if (service === "zapier" && data) {
        const success = await integrationService.sendToZapier(data);
        return NextResponse.json({
          success,
          message: success ? "Data sent to Zapier" : "Failed to send to Zapier",
        });
      } else {
        return NextResponse.json(
          { error: "Invalid service or data for send action" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Failed to process integration request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}