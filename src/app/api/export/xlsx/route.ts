/**
 * Excel Export API Route
 * Generates Excel (XLSX) report from analysis data
 */

import { AILogger } from "@/lib/ai/logger";
import { buildReportPayload, generateReportFilename } from "@/lib/utils/report-builder";
import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { analysis, cost, decision, menu } = body;

    AILogger.info("📊 Excel rapor oluşturma başlatıldı");

    // Build unified report payload
    const reportData = buildReportPayload(analysis, cost, decision, menu);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Procheff v3";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create main sheet
    const sheet = workbook.addWorksheet("Teklif Raporu", {
      properties: { tabColor: { argb: "FF4F81BD" } },
    });

    // Set column widths
    sheet.columns = [
      { width: 30 },
      { width: 50 },
    ];

    // Title Row
    const titleRow = sheet.addRow(["PROCHEFF AI TEKLİF RAPORU"]);
    titleRow.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F81BD" },
    };
    titleRow.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells("A1:B1");
    titleRow.height = 30;

    // Empty row
    sheet.addRow([]);

    // İhale Bilgileri Section
    const ihaleHeader = sheet.addRow(["📋 İHALE BİLGİLERİ"]);
    ihaleHeader.font = { bold: true, size: 12 };
    ihaleHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7E6E6" },
    };
    sheet.mergeCells(`A${ihaleHeader.number}:B${ihaleHeader.number}`);

    sheet.addRow(["Kurum", reportData.kurum]);
    sheet.addRow(["İhale Türü", reportData.ihale_turu]);
    sheet.addRow(["Süre", reportData.sure]);
    sheet.addRow(["Bütçe", reportData.butce]);
    sheet.addRow([]);

    // Maliyet Analizi Section
    const maliyetHeader = sheet.addRow(["💰 MALİYET ANALİZİ"]);
    maliyetHeader.font = { bold: true, size: 12 };
    maliyetHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7E6E6" },
    };
    sheet.mergeCells(`A${maliyetHeader.number}:B${maliyetHeader.number}`);

    sheet.addRow(["Günlük Kişi Maliyeti", reportData.gunluk_kisi_maliyeti]);
    sheet.addRow(["Tahmini Toplam Gider", reportData.tahmini_toplam_gider]);
    sheet.addRow(["Önerilen Karlılık Oranı", reportData.onerilen_karlilik_orani]);
    sheet.addRow([]);

    // Maliyet Dağılımı
    const dagilimHeader = sheet.addRow(["Maliyet Dağılımı"]);
    dagilimHeader.font = { bold: true };
    sheet.mergeCells(`A${dagilimHeader.number}:B${dagilimHeader.number}`);

    sheet.addRow(["  Hammadde", reportData.maliyet_dagilimi.hammadde]);
    sheet.addRow(["  İşçilik", reportData.maliyet_dagilimi.iscilik]);
    sheet.addRow(["  Genel Giderler", reportData.maliyet_dagilimi.genel_giderler]);
    sheet.addRow(["  Kâr", reportData.maliyet_dagilimi.kar]);
    sheet.addRow([]);

    // Riskli Kalemler
    if (reportData.riskli_kalemler.length > 0) {
      const riskHeader = sheet.addRow(["⚠️ Riskli Kalemler"]);
      riskHeader.font = { bold: true };
      sheet.mergeCells(`A${riskHeader.number}:B${riskHeader.number}`);

      reportData.riskli_kalemler.forEach((item) => {
        sheet.addRow(["", `• ${item}`]);
      });
      sheet.addRow([]);
    }

    // AI Kararı Section
    const kararHeader = sheet.addRow(["🧠 AI KARAR ANALİZİ"]);
    kararHeader.font = { bold: true, size: 12 };
    kararHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7E6E6" },
    };
    sheet.mergeCells(`A${kararHeader.number}:B${kararHeader.number}`);

    const kararRow = sheet.addRow(["Karar", reportData.karar]);
    kararRow.font = { bold: true };
    if (reportData.karar === "Katıl") {
      kararRow.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF92D050" },
      };
    } else if (reportData.karar === "Katılma") {
      kararRow.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF0000" },
      };
    } else {
      kararRow.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC000" },
      };
    }

    sheet.addRow(["Risk Oranı", reportData.risk_orani]);
    sheet.addRow(["Tahmini Kâr Oranı", reportData.tahmini_kar_orani]);
    sheet.addRow(["Gerekçe", reportData.gerekce]);
    sheet.addRow([]);

    // Stratejik Öneriler
    if (reportData.stratejik_oneriler.length > 0) {
      const oneriHeader = sheet.addRow(["💡 Stratejik Öneriler"]);
      oneriHeader.font = { bold: true };
      sheet.mergeCells(`A${oneriHeader.number}:B${oneriHeader.number}`);

      reportData.stratejik_oneriler.forEach((oneri, idx) => {
        sheet.addRow(["", `${idx + 1}. ${oneri}`]);
      });
      sheet.addRow([]);
    }

    // Kritik Noktalar
    if (reportData.kritik_noktalar.length > 0) {
      const kritikHeader = sheet.addRow(["⚠️ Kritik Noktalar"]);
      kritikHeader.font = { bold: true };
      sheet.mergeCells(`A${kritikHeader.number}:B${kritikHeader.number}`);

      reportData.kritik_noktalar.forEach((nokta, idx) => {
        sheet.addRow(["", `${idx + 1}. ${nokta}`]);
      });
      sheet.addRow([]);
    }

    // Menü Sheet (if available)
    if (reportData.menu_items && reportData.menu_items.length > 0) {
      const menuSheet = workbook.addWorksheet("Menü Listesi", {
        properties: { tabColor: { argb: "FF00B050" } },
      });

      menuSheet.columns = [
        { header: "Sıra", key: "sira", width: 10 },
        { header: "Yemek Adı", key: "yemek", width: 30 },
        { header: "Gramaj (g)", key: "gramaj", width: 15 },
        { header: "Öğün", key: "ogun", width: 15 },
        { header: "Kişi Sayısı", key: "kisi", width: 15 },
        { header: "Kategori", key: "kategori", width: 20 },
      ];

      // Style header
      menuSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      menuSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00B050" },
      };

      // Add menu data
      reportData.menu_items.forEach((item, idx) => {
        menuSheet.addRow({
          sira: idx + 1,
          yemek: item.yemek,
          gramaj: item.gramaj,
          ogun: item.ogun || "—",
          kisi: item.kisi || 0,
          kategori: item.kategori || "—",
        });
      });

      // Add summary row
      menuSheet.addRow([]);
      const summaryRow = menuSheet.addRow([
        "",
        "TOPLAM",
        reportData.toplam_gramaj,
        "",
        reportData.kisi_sayisi,
        "",
      ]);
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEB9C" },
      };
    }

    // Meta Info Sheet
    const metaSheet = workbook.addWorksheet("Meta Bilgi", {
      properties: { tabColor: { argb: "FF808080" } },
    });
    metaSheet.columns = [{ width: 30 }, { width: 50 }];

    metaSheet.addRow(["AI Model", reportData.model]);
    metaSheet.addRow(["Oluşturulma Tarihi", reportData.tarih]);
    metaSheet.addRow(["Timestamp", reportData.timestamp]);
    metaSheet.addRow(["Sistem", "Procheff v3 - AI Powered Procurement Analysis"]);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const duration = Date.now() - startTime;
    const filename = generateReportFilename("xlsx");

    AILogger.success(`✅ Excel rapor oluşturuldu (${duration}ms)`, {
      filename,
      size: `${(buffer.byteLength / 1024).toFixed(2)} KB`,
      karar: reportData.karar,
      sheets: workbook.worksheets.length,
    });

    // Return Excel as downloadable response
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";

    AILogger.error("❌ Excel rapor oluşturma hatası", {
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
