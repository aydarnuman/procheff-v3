/**
 * Menu Plan Excel Export API
 * Exports menu planning results to Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

interface DayPlan {
  day: number;
  meals: {
    [key: string]: {
      item_id: number;
      name: string;
      gramaj: number;
      cost: number;
    };
  };
}

interface ExportRequest {
  plan: DayPlan[];
  summary: {
    days: number;
    meals: number;
    totalMealsServed: number;
    persons: number;
    totalCost: number;
    costPerDay: number;
    costPerPerson: number;
    avgCaloriesPerPerson: number;
  };
  meals: string[];
  institutionType: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { plan, summary, meals, institutionType } = body;

    if (!plan || plan.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data to export' },
        { status: 400 }
      );
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Menü Planı');

    // Info section
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'MENÜ PLANI';
    worksheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF1E293B' } };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 35;

    worksheet.addRow([]);

    // Summary info
    worksheet.addRow(['Kurum Tipi:', institutionType.toUpperCase()]);
    worksheet.addRow(['Toplam Gün:', summary.days]);
    worksheet.addRow(['Kişi Sayısı:', summary.persons]);
    worksheet.addRow(['Toplam Öğün:', summary.totalMealsServed]);
    worksheet.addRow(['Toplam Maliyet:', `${summary.totalCost.toFixed(2)} TL`]);
    worksheet.addRow(['Günlük Maliyet:', `${summary.costPerDay.toFixed(2)} TL`]);
    worksheet.addRow(['Kişi Başı Maliyet:', `${summary.costPerPerson.toFixed(2)} TL`]);
    worksheet.addRow(['Ortalama Kalori:', `${summary.avgCaloriesPerPerson} kcal/kişi`]);
    worksheet.addRow(['Tarih:', new Date().toLocaleDateString('tr-TR')]);

    // Style summary
    for (let i = 3; i <= 11; i++) {
      worksheet.getCell(`A${i}`).font = { bold: true };
      worksheet.getCell(`B${i}`).font = { color: { argb: 'FF4F46E5' } };
    }

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Table header
    const headerRow = worksheet.addRow([
      'Gün',
      ...meals.map(m =>
        m === 'kahvalti' ? 'Kahvaltı' :
        m === 'ogle' ? 'Öğle' :
        'Akşam'
      )
    ]);

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B5CF6' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // Set column widths
    worksheet.getColumn(1).width = 12;
    for (let i = 2; i <= meals.length + 1; i++) {
      worksheet.getColumn(i).width = 35;
    }

    // Add data rows
    plan.forEach((dayPlan, index) => {
      const rowData = [
        `Gün ${dayPlan.day}`,
        ...meals.map(meal => {
          const mealData = dayPlan.meals[meal];
          if (mealData) {
            return `${mealData.name}\n${mealData.gramaj}g · ${mealData.cost} TL/kg`;
          }
          return '-';
        })
      ];

      const row = worksheet.addRow(rowData);

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      // Style
      row.getCell(1).font = { bold: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.height = 45;

      // Center align meal cells
      for (let i = 2; i <= meals.length + 1; i++) {
        row.getCell(i).alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Add footer note
    worksheet.addRow([]);
    worksheet.addRow([]);
    const footerRow = worksheet.addRow(['Procheff Menü Robotu tarafından oluşturulmuştur.']);
    footerRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    worksheet.mergeCells(footerRow.number, 1, footerRow.number, meals.length + 1);
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=menu-plani-${Date.now()}.xlsx`
      }
    });
  } catch (error) {
    console.error('Menu plan export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      },
      { status: 500 }
    );
  }
}
