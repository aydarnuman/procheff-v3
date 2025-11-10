/**
 * PDF Export API Route
 * Generates PDF report from analysis data
 */

import { AILogger } from "@/lib/ai/logger";
import { buildReportPayload, generateReportFilename } from "@/lib/utils/report-builder";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { analysis, cost, decision, menu } = body;

    AILogger.info("📄 PDF rapor oluşturma başlatıldı");

    // Build unified report payload
    const reportData = buildReportPayload(analysis, cost, decision, menu);

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      info: {
        Title: "Procheff AI Teklif Raporu",
        Author: "Procheff v3",
        Subject: "İhale Analiz Raporu",
        CreationDate: new Date(),
      },
    });

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PROCHEFF AI TEKLİF RAPORU", { align: "center" });
    doc.moveDown();

    // Separator line
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown();

    // İhale Bilgileri
    doc.fontSize(14).font("Helvetica-Bold").text("📋 İHALE BİLGİLERİ");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Kurum: ${reportData.kurum}`);
    doc.text(`İhale Türü: ${reportData.ihale_turu}`);
    doc.text(`Süre: ${reportData.sure}`);
    doc.text(`Bütçe: ${reportData.butce}`);
    doc.moveDown();

    // Maliyet Analizi
    doc.fontSize(14).font("Helvetica-Bold").text("💰 MALİYET ANALİZİ");
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Günlük Kişi Maliyeti: ${reportData.gunluk_kisi_maliyeti}`);
    doc.text(`Tahmini Toplam Gider: ${reportData.tahmini_toplam_gider}`);
    doc.text(`Önerilen Karlılık Oranı: ${reportData.onerilen_karlilik_orani}`);
    doc.moveDown();

    // Maliyet Dağılımı
    doc.fontSize(12).font("Helvetica-Bold").text("Maliyet Dağılımı:");
    doc.fontSize(11).font("Helvetica");
    doc.text(`  • Hammadde: ${reportData.maliyet_dagilimi.hammadde}`);
    doc.text(`  • İşçilik: ${reportData.maliyet_dagilimi.iscilik}`);
    doc.text(`  • Genel Giderler: ${reportData.maliyet_dagilimi.genel_giderler}`);
    doc.text(`  • Kâr: ${reportData.maliyet_dagilimi.kar}`);
    doc.moveDown();

    // Riskli Kalemler
    if (reportData.riskli_kalemler.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").text("⚠️ Riskli Kalemler:");
      doc.fontSize(11).font("Helvetica");
      reportData.riskli_kalemler.forEach((item) => {
        doc.text(`  • ${item}`);
      });
      doc.moveDown();
    }

    // AI Kararı
    doc.fontSize(14).font("Helvetica-Bold").text("🧠 AI KARAR ANALİZİ");
    doc.moveDown(0.5);

    // Karar badge
    const kararColor =
      reportData.karar === "Katıl" ? "green" : reportData.karar === "Katılma" ? "red" : "orange";
    doc.fontSize(16).font("Helvetica-Bold").fillColor(kararColor).text(reportData.karar);
    doc.fillColor("black");

    doc.fontSize(11).font("Helvetica");
    doc.text(`Risk Oranı: ${reportData.risk_orani}`);
    doc.text(`Tahmini Kâr Oranı: ${reportData.tahmini_kar_orani}`);
    doc.moveDown();

    doc.fontSize(12).font("Helvetica-Bold").text("Gerekçe:");
    doc.fontSize(11).font("Helvetica");
    doc.text(reportData.gerekce, { align: "justify" });
    doc.moveDown();

    // Stratejik Öneriler
    if (reportData.stratejik_oneriler.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").text("💡 Stratejik Öneriler:");
      doc.fontSize(11).font("Helvetica");
      reportData.stratejik_oneriler.forEach((oneri, idx) => {
        doc.text(`  ${idx + 1}. ${oneri}`);
      });
      doc.moveDown();
    }

    // Kritik Noktalar
    if (reportData.kritik_noktalar.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").text("⚠️ Kritik Noktalar:");
      doc.fontSize(11).font("Helvetica");
      reportData.kritik_noktalar.forEach((nokta, idx) => {
        doc.text(`  ${idx + 1}. ${nokta}`);
      });
      doc.moveDown();
    }

    // Menü Bilgileri (if available)
    if (reportData.menu_items && reportData.menu_items.length > 0) {
      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").text("🍽️ MENÜ BİLGİLERİ");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      doc.text(`Toplam Ürün Sayısı: ${reportData.menu_items.length} adet`);
      doc.text(`Toplam Gramaj: ${reportData.toplam_gramaj}g/kişi`);
      doc.text(`Kişi Sayısı: ${reportData.kisi_sayisi} kişi`);
      doc.moveDown();

      doc.fontSize(12).font("Helvetica-Bold").text("Menü Listesi:");
      doc.fontSize(10).font("Helvetica");
      reportData.menu_items.forEach((item, idx) => {
        doc.text(
          `  ${idx + 1}. ${item.yemek} - ${item.gramaj}g (${item.kategori || "—"})`
        );
      });
    }

    // Footer - Meta Info
    doc.moveDown(2);
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();
    doc.moveDown();

    doc.fontSize(9).font("Helvetica").fillColor("gray");
    doc.text(`AI Model: ${reportData.model}`, { align: "right" });
    doc.text(`Tarih: ${reportData.tarih}`, { align: "right" });
    doc.text("Procheff v3 - AI Powered Procurement Analysis", { align: "center" });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    const duration = Date.now() - startTime;
    const filename = generateReportFilename("pdf");

    AILogger.success(`✅ PDF rapor oluşturuldu (${duration}ms)`, {
      filename,
      size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
      karar: reportData.karar,
    });

    // Return PDF as downloadable response
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";

    AILogger.error("❌ PDF rapor oluşturma hatası", {
      error: errorMessage,
      duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        meta: {
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
