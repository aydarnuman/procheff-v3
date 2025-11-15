import { AILogger } from "@/lib/ai/logger";
import { registerOAuthApp } from "@/lib/db/oauth-schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RegisterOAuthSchema = z.object({
  name: z
    .string()
    .min(3, "Uygulama adı en az 3 karakter olmalıdır")
    .max(100, "Uygulama adı en fazla 100 karakter olmalıdır"),
  description: z
    .string()
    .min(10, "Açıklama en az 10 karakter olmalıdır")
    .max(500, "Açıklama en fazla 500 karakter olmalıdır"),
  homepage_url: z.string().url("Geçerli bir URL girin"),
  callback_urls: z
    .array(z.string().url("Her geri arama URL'si geçerli olmalıdır"))
    .min(1, "En az bir geri arama URL'si gereklidir"),
});

type RegisterOAuthRequest = z.infer<typeof RegisterOAuthSchema>;

export async function POST(req: NextRequest) {
  try {
    AILogger.info("OAuth app registration request received");

    const body = await req.json();

    // Validate request
    let validatedData: RegisterOAuthRequest;
    try {
      validatedData = RegisterOAuthSchema.parse(body);
    } catch (error) {
      const validationError =
        error instanceof z.ZodError ? error.issues : [];
      AILogger.warn("OAuth registration validation failed", {
        errors: validationError,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Doğrulama başarısız",
          details: validationError,
        },
        { status: 400 }
      );
    }

    // Register the app
    const result = registerOAuthApp({
      name: validatedData.name,
      description: validatedData.description,
      homepage_url: validatedData.homepage_url,
      callback_urls: validatedData.callback_urls,
    });

    AILogger.success("OAuth app registered successfully", {
      id: result.id,
      name: validatedData.name,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          client_id: result.client_id,
          client_secret: result.client_secret,
          name: validatedData.name,
          message: "OAuth uygulaması başarıyla kaydedildi. Client secret'ı güvenli bir yerde saklayın.",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    AILogger.error("OAuth registration failed", {
      error: message,
    });

    // Check for unique constraint violation
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu uygulama adı zaten kaydedilmiş",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "OAuth uygulaması kaydedilemedi",
        details: message,
      },
      { status: 500 }
    );
  }
}
