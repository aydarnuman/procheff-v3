/**
 * Gramaj Table Excel Export API
 * Exports gramaj calculation results to Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

interface ExportRequest {
  results: Array<{
    item: {
      id: number;
      name: string;
      default_gramaj: number;
      unit_cost: number;
      calories: number;
    };
    perPerson: number;
    total: number;
    totalCost: number;
  }>;
  institutionType: string;
  persons: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { results, institutionType, persons } = body;

    if (!results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data to export' },
        { status: 400 }
      );
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Gramaj Tablosu');

    // Set column widths
    worksheet.columns = [
      { header: 'Yemek', key: 'name', width: 30 },
      { header: 'Kişi Başı (g)', key: 'perPerson', width: 15 },
      { header: 'Toplam (kg)', key: 'total', width: 15 },
      { header: 'Birim Maliyet (TL/kg)', key: 'unitCost', width: 20 },
      { header: 'Toplam Maliyet (TL)', key: 'totalCost', width: 20 },
      { header: 'Kalori/Porsiyon', key: 'calories', width: 18 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add info section
    worksheet.insertRow(1, ['GRAMAJ TABLOSU']);
    worksheet.insertRow(2, ['']);
    worksheet.insertRow(3, ['Kurum Tipi:', institutionType.toUpperCase()]);
    worksheet.insertRow(4, ['Kişi Sayısı:', persons]);
    worksheet.insertRow(5, ['Tarih:', new Date().toLocaleDateString('tr-TR')]);
    worksheet.insertRow(6, ['']);

    // Style info section
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
    titleRow.height = 30;

    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('A5').font = { bold: true };

    // Data starts at row 8 (after info + header)
    let totalCost = 0;
    let totalCalories = 0;

    results.forEach((result, index) => {
      const row = worksheet.addRow({
        name: result.item.name,
        perPerson: result.perPerson,
        total: result.total,
        unitCost: result.item.unit_cost,
        totalCost: result.totalCost,
        calories: result.item.calories
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      // Format numbers
      row.getCell('perPerson').numFmt = '#,##0';
      row.getCell('total').numFmt = '#,##0.00';
      row.getCell('unitCost').numFmt = '#,##0.00';
      row.getCell('totalCost').numFmt = '#,##0.00';
      row.getCell('calories').numFmt = '#,##0';

      // Center align numbers
      row.getCell('perPerson').alignment = { horizontal: 'center' };
      row.getCell('total').alignment = { horizontal: 'center' };
      row.getCell('unitCost').alignment = { horizontal: 'right' };
      row.getCell('totalCost').alignment = { horizontal: 'right' };
      row.getCell('calories').alignment = { horizontal: 'center' };

      totalCost += result.totalCost;
      totalCalories += result.item.calories * persons;
    });

    // Add summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      'TOPLAM',
      '',
      '',
      '',
      totalCost,
      totalCalories
    ]);

    summaryRow.font = { bold: true, size: 12 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }
    };
    summaryRow.getCell('totalCost').numFmt = '#,##0.00';
    summaryRow.getCell('calories').numFmt = '#,##0';
    summaryRow.height = 25;

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 7) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=gramaj-tablosu-${Date.now()}.xlsx`
      }
    });
  } catch (error) {
    console.error('Gramaj export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      },
      { status: 500 }
    );
  }
}
