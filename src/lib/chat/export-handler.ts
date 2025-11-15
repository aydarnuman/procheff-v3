/**
 * Export Handler for Chat
 * Handles report generation directly from chat
 */

import { getDatabase } from '@/lib/db/universal-client';
import { AILogger } from '@/lib/ai/logger';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// Database row type
interface AnalysisRow {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  data_pool?: string;
  contextual?: string;
  deep?: string;
  [key: string]: any;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  analysisId?: string;
  compareIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  type?: 'analysis' | 'comparison' | 'summary' | 'trend';
}

export interface ExportResult {
  success: boolean;
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  error?: string;
}

export class ExportHandler {
  /**
   * Main export function
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    try {
      AILogger.info('Export requested', options);

      // Validate options
      if (!options.format) {
        throw new Error('Export format is required');
      }

      // Route to appropriate handler
      switch (options.format) {
        case 'pdf':
          return await this.exportPDF(options);
        case 'excel':
          return await this.exportExcel(options);
        case 'csv':
          return await this.exportCSV(options);
        case 'json':
          return await this.exportJSON(options);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      AILogger.error('Export error', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Export as PDF
   */
  private async exportPDF(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchData(options);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'ProCheff İhale Analiz Raporu',
          Author: 'ProCheff AI Assistant',
          Subject: 'İhale Analiz Raporu',
          Keywords: 'ihale, analiz, maliyet, karar'
        }
      });

      // Collect PDF content in buffer
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Add header
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .text('PROCHEFF İHALE ANALİZ RAPORU', { align: 'center' });

      doc.moveDown();
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(new Date().toLocaleDateString('tr-TR'), { align: 'center' });

      doc.moveDown(2);

      // Add analysis content based on type
      if (options.type === 'comparison' && data.length > 1) {
        this.addComparisonToPDF(doc, data);
      } else if (options.type === 'summary') {
        this.addSummaryToPDF(doc, data);
      } else {
        this.addAnalysisToPDF(doc, data[0]);
      }

      // Finalize PDF
      doc.end();

      // Wait for PDF to be generated
      return new Promise((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve({
            success: true,
            buffer: pdfBuffer,
            filename: `procheff_rapor_${Date.now()}.pdf`,
            mimeType: 'application/pdf'
          });
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export as Excel
   */
  private async exportExcel(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchData(options);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ProCheff AI Assistant';
      workbook.created = new Date();

      // Add main worksheet
      const worksheet = workbook.addWorksheet('Analiz Raporu', {
        properties: {
          tabColor: { argb: 'FF4F46E5' }
        }
      });

      // Define columns based on data type
      if (options.type === 'comparison') {
        this.addComparisonToExcel(worksheet, data);
      } else if (options.type === 'trend') {
        this.addTrendToExcel(worksheet, data);
      } else {
        this.addAnalysisToExcel(worksheet, data[0]);
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return {
        success: true,
        buffer: Buffer.from(buffer),
        filename: `procheff_rapor_${Date.now()}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export as CSV
   */
  private async exportCSV(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchData(options);

      let csvContent = '';

      // Add UTF-8 BOM for Excel compatibility
      csvContent = '\ufeff';

      // Create CSV based on data type
      if (options.type === 'comparison') {
        csvContent += this.createComparisonCSV(data);
      } else {
        csvContent += this.createAnalysisCSV(data[0]);
      }

      return {
        success: true,
        buffer: Buffer.from(csvContent, 'utf-8'),
        filename: `procheff_rapor_${Date.now()}.csv`,
        mimeType: 'text/csv'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export as JSON
   */
  private async exportJSON(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.fetchData(options);

      const jsonContent = JSON.stringify({
        metadata: {
          generated: new Date().toISOString(),
          source: 'ProCheff AI Assistant',
          type: options.type || 'analysis',
          format: 'json'
        },
        data: data
      }, null, 2);

      return {
        success: true,
        buffer: Buffer.from(jsonContent, 'utf-8'),
        filename: `procheff_rapor_${Date.now()}.json`,
        mimeType: 'application/json'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch data from database
   */
  private async fetchData(options: ExportOptions): Promise<any[]> {
    const db = await getDatabase();
    const results: any[] = [];

    // Fetch single analysis
    if (options.analysisId) {
      const analysis = await db.queryOne(`
        SELECT * FROM analysis_results
        WHERE id = $1
        ORDER BY created_at DESC
      `, [options.analysisId]) as AnalysisRow | undefined;
      if (analysis) {
        // Parse JSON fields
        if (analysis.data_pool) (analysis as any).data_pool = JSON.parse(analysis.data_pool);
        if (analysis.contextual) (analysis as any).contextual = JSON.parse(analysis.contextual);
        if (analysis.deep) (analysis as any).deep = JSON.parse(analysis.deep);
        results.push(analysis);
      }
    }

    // Fetch multiple for comparison
    if (options.compareIds && options.compareIds.length > 0) {
      const placeholders = options.compareIds.map((_, idx) => `$${idx + 1}`).join(',');
      const analyses = await db.query(`
        SELECT * FROM analysis_results
        WHERE id IN (${placeholders})
        ORDER BY created_at DESC
      `, options.compareIds) as AnalysisRow[];

      analyses.forEach((analysis: AnalysisRow) => {
        if (analysis.data_pool) (analysis as any).data_pool = JSON.parse(analysis.data_pool);
        if (analysis.contextual) (analysis as any).contextual = JSON.parse(analysis.contextual);
        if (analysis.deep) (analysis as any).deep = JSON.parse(analysis.deep);
        results.push(analysis);
      });
    }

    // Fetch by date range
    if (options.dateRange) {
      const analyses = await db.query(`
        SELECT * FROM analysis_results
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
      `, [options.dateRange.start, options.dateRange.end]) as AnalysisRow[];

      analyses.forEach((analysis: AnalysisRow) => {
        if (analysis.data_pool) (analysis as any).data_pool = JSON.parse(analysis.data_pool);
        if (analysis.contextual) (analysis as any).contextual = JSON.parse(analysis.contextual);
        if (analysis.deep) (analysis as any).deep = JSON.parse(analysis.deep);
        results.push(analysis);
      });
    }

    // If no specific criteria, get recent analyses
    if (results.length === 0) {
      const analyses = await db.query(`
        SELECT * FROM analysis_results
        ORDER BY created_at DESC
        LIMIT 10
      `) as AnalysisRow[];

      analyses.forEach((analysis: AnalysisRow) => {
        if (analysis.data_pool) (analysis as any).data_pool = JSON.parse(analysis.data_pool);
        if (analysis.contextual) (analysis as any).contextual = JSON.parse(analysis.contextual);
        if (analysis.deep) (analysis as any).deep = JSON.parse(analysis.deep);
        results.push(analysis);
      });
    }

    return results;
  }

  // =========================================
  // PDF Helper Methods
  // =========================================

  private addAnalysisToPDF(doc: any, analysis: any) {
    // Basic info section
    doc.fontSize(14).font('Helvetica-Bold').text('TEMEL BİLGİLER');
    doc.moveDown(0.5);

    if (analysis.data_pool?.basicInfo) {
      const info = analysis.data_pool.basicInfo;
      doc.fontSize(10).font('Helvetica');
      if (info.kurum) doc.text(`Kurum: ${info.kurum}`);
      if (info.ihale_turu) doc.text(`İhale Türü: ${info.ihale_turu}`);
      if (info.butce) doc.text(`Bütçe: ${info.butce}`);
      if (info.kisilik) doc.text(`Kişi Sayısı: ${info.kisilik}`);
    }

    doc.moveDown();

    // Risk analysis section
    if (analysis.contextual) {
      doc.fontSize(14).font('Helvetica-Bold').text('RİSK ANALİZİ');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      const ctx = analysis.contextual;
      if (ctx.operasyonel_riskler) {
        doc.text(`Risk Seviyesi: ${ctx.operasyonel_riskler.seviye}`);
      }
      if (ctx.maliyet_sapma_olasiligi) {
        doc.text(`Maliyet Sapma Olasılığı: %${ctx.maliyet_sapma_olasiligi.oran}`);
      }
    }

    doc.moveDown();

    // Decision section
    if (analysis.deep?.karar_onerisi) {
      doc.fontSize(14).font('Helvetica-Bold').text('KARAR ÖNERİSİ');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      const decision = analysis.deep.karar_onerisi;
      doc.text(`Karar: ${decision.karar}`);
      doc.text(`Güven Skoru: ${decision.puan}/100`);
      if (decision.gerekce) {
        doc.text(`Gerekçe: ${decision.gerekce}`);
      }
    }
  }

  private addComparisonToPDF(doc: any, analyses: any[]) {
    doc.fontSize(14).font('Helvetica-Bold').text('İHALE KARŞILAŞTIRMA');
    doc.moveDown();

    analyses.forEach((analysis, idx) => {
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`${idx + 1}. ${analysis.data_pool?.basicInfo?.kurum || 'İhale'}`);

      doc.fontSize(10).font('Helvetica');
      if (analysis.data_pool?.basicInfo) {
        const info = analysis.data_pool.basicInfo;
        doc.text(`  • Bütçe: ${info.butce || 'N/A'}`);
        doc.text(`  • Kişi: ${info.kisilik || 'N/A'}`);
      }
      if (analysis.deep?.karar_onerisi) {
        doc.text(`  • Karar: ${analysis.deep.karar_onerisi.karar}`);
        doc.text(`  • Puan: ${analysis.deep.karar_onerisi.puan}/100`);
      }
      doc.moveDown();
    });
  }

  private addSummaryToPDF(doc: any, analyses: any[]) {
    doc.fontSize(14).font('Helvetica-Bold').text('ÖZET RAPOR');
    doc.moveDown();

    // Statistics
    const stats = this.calculateStatistics(analyses);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Toplam Analiz: ${analyses.length}`);
    doc.text(`Ortalama Bütçe: ${stats.avgBudget} TL`);
    doc.text(`Ortalama Puan: ${stats.avgScore}/100`);
    doc.text(`Katılım Önerisi: ${stats.recommendCount}/${analyses.length}`);
  }

  // =========================================
  // Excel Helper Methods
  // =========================================

  private addAnalysisToExcel(worksheet: any, analysis: any) {
    // Add headers
    worksheet.columns = [
      { header: 'Alan', key: 'field', width: 30 },
      { header: 'Değer', key: 'value', width: 50 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };

    // Add data
    const rows: any[] = [];

    if (analysis.data_pool?.basicInfo) {
      const info = analysis.data_pool.basicInfo;
      rows.push({ field: 'Kurum', value: info.kurum || '' });
      rows.push({ field: 'İhale Türü', value: info.ihale_turu || '' });
      rows.push({ field: 'Bütçe', value: info.butce || '' });
      rows.push({ field: 'Kişi Sayısı', value: info.kisilik || '' });
    }

    if (analysis.contextual) {
      rows.push({ field: 'Risk Seviyesi', value: analysis.contextual.operasyonel_riskler?.seviye || '' });
      rows.push({ field: 'Maliyet Sapma', value: `%${analysis.contextual.maliyet_sapma_olasiligi?.oran || 0}` });
    }

    if (analysis.deep?.karar_onerisi) {
      rows.push({ field: 'Karar', value: analysis.deep.karar_onerisi.karar });
      rows.push({ field: 'Puan', value: analysis.deep.karar_onerisi.puan });
      rows.push({ field: 'Gerekçe', value: analysis.deep.karar_onerisi.gerekce || '' });
    }

    worksheet.addRows(rows);
  }

  private addComparisonToExcel(worksheet: any, analyses: any[]) {
    // Define columns
    worksheet.columns = [
      { header: 'Kurum', key: 'kurum', width: 30 },
      { header: 'Bütçe', key: 'butce', width: 20 },
      { header: 'Kişi Sayısı', key: 'kisilik', width: 15 },
      { header: 'Risk', key: 'risk', width: 15 },
      { header: 'Karar', key: 'karar', width: 20 },
      { header: 'Puan', key: 'puan', width: 10 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };

    // Add data rows
    analyses.forEach(analysis => {
      worksheet.addRow({
        kurum: analysis.data_pool?.basicInfo?.kurum || '',
        butce: analysis.data_pool?.basicInfo?.butce || '',
        kisilik: analysis.data_pool?.basicInfo?.kisilik || '',
        risk: analysis.contextual?.operasyonel_riskler?.seviye || '',
        karar: analysis.deep?.karar_onerisi?.karar || '',
        puan: analysis.deep?.karar_onerisi?.puan || 0
      });
    });
  }

  private addTrendToExcel(worksheet: any, analyses: any[]) {
    // Define columns for trend analysis
    worksheet.columns = [
      { header: 'Tarih', key: 'date', width: 20 },
      { header: 'Kurum', key: 'kurum', width: 30 },
      { header: 'Bütçe', key: 'butce', width: 20 },
      { header: 'Karar', key: 'karar', width: 20 },
      { header: 'Puan', key: 'puan', width: 10 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };

    // Add data with date
    analyses.forEach(analysis => {
      worksheet.addRow({
        date: new Date(analysis.created_at).toLocaleDateString('tr-TR'),
        kurum: analysis.data_pool?.basicInfo?.kurum || '',
        butce: analysis.data_pool?.basicInfo?.butce || '',
        karar: analysis.deep?.karar_onerisi?.karar || '',
        puan: analysis.deep?.karar_onerisi?.puan || 0
      });
    });
  }

  // =========================================
  // CSV Helper Methods
  // =========================================

  private createAnalysisCSV(analysis: any): string {
    const rows: string[] = [];

    // Header
    rows.push('Alan,Değer');

    // Data
    if (analysis.data_pool?.basicInfo) {
      const info = analysis.data_pool.basicInfo;
      rows.push(`Kurum,"${info.kurum || ''}"`);
      rows.push(`İhale Türü,"${info.ihale_turu || ''}"`);
      rows.push(`Bütçe,"${info.butce || ''}"`);
      rows.push(`Kişi Sayısı,"${info.kisilik || ''}"`);
    }

    if (analysis.deep?.karar_onerisi) {
      rows.push(`Karar,"${analysis.deep.karar_onerisi.karar}"`);
      rows.push(`Puan,${analysis.deep.karar_onerisi.puan}`);
    }

    return rows.join('\n');
  }

  private createComparisonCSV(analyses: any[]): string {
    const rows: string[] = [];

    // Header
    rows.push('Kurum,Bütçe,Kişi Sayısı,Risk,Karar,Puan');

    // Data
    analyses.forEach(analysis => {
      const kurum = analysis.data_pool?.basicInfo?.kurum || '';
      const butce = analysis.data_pool?.basicInfo?.butce || '';
      const kisilik = analysis.data_pool?.basicInfo?.kisilik || '';
      const risk = analysis.contextual?.operasyonel_riskler?.seviye || '';
      const karar = analysis.deep?.karar_onerisi?.karar || '';
      const puan = analysis.deep?.karar_onerisi?.puan || 0;

      rows.push(`"${kurum}","${butce}","${kisilik}","${risk}","${karar}",${puan}`);
    });

    return rows.join('\n');
  }

  // =========================================
  // Utility Methods
  // =========================================

  private calculateStatistics(analyses: any[]) {
    let totalBudget = 0;
    let totalScore = 0;
    let recommendCount = 0;
    let validBudgetCount = 0;

    analyses.forEach(analysis => {
      // Budget
      if (analysis.data_pool?.basicInfo?.butce) {
        const budget = parseFloat(
          analysis.data_pool.basicInfo.butce.replace(/[^\d.]/g, '')
        );
        if (!isNaN(budget)) {
          totalBudget += budget;
          validBudgetCount++;
        }
      }

      // Score
      if (analysis.deep?.karar_onerisi?.puan) {
        totalScore += analysis.deep.karar_onerisi.puan;
      }

      // Recommendation
      if (analysis.deep?.karar_onerisi?.karar === 'Katıl') {
        recommendCount++;
      }
    });

    return {
      avgBudget: validBudgetCount > 0
        ? Math.round(totalBudget / validBudgetCount)
        : 0,
      avgScore: analyses.length > 0
        ? Math.round(totalScore / analyses.length)
        : 0,
      recommendCount
    };
  }
}

// Export singleton instance
export const exportHandler = new ExportHandler();