/**
 * Menu Plan PDF Export API
 * Generates professional PDF reports for menu plans
 */

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

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

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    doc.fontSize(24)
       .fillColor('#4F46E5')
       .text('MENÜ PLANI', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(10)
       .fillColor('#64748B')
       .text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' })
       .moveDown(2);

    // Summary Info Box
    doc.fontSize(12)
       .fillColor('#1E293B');

    const infoY = doc.y;
    doc.rect(50, infoY, 495, 120)
       .fillAndStroke('#F8FAFC', '#E2E8F0');

    doc.fillColor('#1E293B')
       .fontSize(11)
       .text('ÖZET BİLGİLER', 70, infoY + 15, { underline: true });

    const leftCol = 70;
    const rightCol = 300;
    let yPos = infoY + 40;

    doc.fontSize(10)
       .fillColor('#64748B')
       .text('Kurum Tipi:', leftCol, yPos)
       .fillColor('#1E293B')
       .text(institutionType.toUpperCase(), leftCol + 100, yPos);

    doc.fillColor('#64748B')
       .text('Toplam Gün:', rightCol, yPos)
       .fillColor('#1E293B')
       .text(`${summary.days}`, rightCol + 100, yPos);

    yPos += 20;
    doc.fillColor('#64748B')
       .text('Kişi Sayısı:', leftCol, yPos)
       .fillColor('#1E293B')
       .text(`${summary.persons}`, leftCol + 100, yPos);

    doc.fillColor('#64748B')
       .text('Toplam Öğün:', rightCol, yPos)
       .fillColor('#1E293B')
       .text(`${summary.totalMealsServed}`, rightCol + 100, yPos);

    yPos += 20;
    doc.fillColor('#64748B')
       .text('Toplam Maliyet:', leftCol, yPos)
       .fillColor('#16A34A')
       .text(`${summary.totalCost.toFixed(2)} TL`, leftCol + 100, yPos);

    doc.fillColor('#64748B')
       .text('Günlük Maliyet:', rightCol, yPos)
       .fillColor('#16A34A')
       .text(`${summary.costPerDay.toFixed(2)} TL`, rightCol + 100, yPos);

    doc.moveDown(4);

    // Menu Calendar Table
    doc.fontSize(14)
       .fillColor('#1E293B')
       .text('MENÜ TAKVİMİ', { underline: true })
       .moveDown();

    // Table Header
    const tableTop = doc.y;
    const colWidth = 495 / (meals.length + 1);
    let xPos = 50;

    // Draw header background
    doc.rect(50, tableTop, 495, 30)
       .fillAndStroke('#8B5CF6', '#7C3AED');

    // Header text
    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .text('GÜN', xPos + 5, tableTop + 10, { width: colWidth - 10, align: 'center' });

    xPos += colWidth;
    meals.forEach((meal) => {
      const mealLabel =
        meal === 'kahvalti' ? 'KAHVALTI' :
        meal === 'ogle' ? 'ÖĞLE' :
        'AKŞAM';

      doc.text(mealLabel, xPos + 5, tableTop + 10, { width: colWidth - 10, align: 'center' });
      xPos += colWidth;
    });

    // Table Rows
    let rowY = tableTop + 30;
    plan.forEach((dayPlan, index) => {
      // Check if we need a new page
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }

      const rowHeight = 40;

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, rowY, 495, rowHeight)
           .fillAndStroke('#F8FAFC', '#E2E8F0');
      } else {
        doc.rect(50, rowY, 495, rowHeight)
           .stroke('#E2E8F0');
      }

      // Day number
      xPos = 50;
      doc.fontSize(10)
         .fillColor('#1E293B')
         .text(`Gün ${dayPlan.day}`, xPos + 5, rowY + 12, {
           width: colWidth - 10,
           align: 'center'
         });

      xPos += colWidth;

      // Meals
      meals.forEach((meal) => {
        const mealData = dayPlan.meals[meal];
        if (mealData) {
          doc.fontSize(9)
             .fillColor('#1E293B')
             .text(mealData.name, xPos + 5, rowY + 8, {
               width: colWidth - 10,
               align: 'center'
             });

          doc.fontSize(7)
             .fillColor('#64748B')
             .text(`${mealData.gramaj}g · ${mealData.cost} TL/kg`, xPos + 5, rowY + 23, {
               width: colWidth - 10,
               align: 'center'
             });
        } else {
          doc.fontSize(9)
             .fillColor('#94A3B8')
             .text('-', xPos + 5, rowY + 15, {
               width: colWidth - 10,
               align: 'center'
             });
        }
        xPos += colWidth;
      });

      rowY += rowHeight;
    });

    // Footer
    doc.fontSize(8)
       .fillColor('#94A3B8')
       .text(
         'Bu rapor Procheff Menü Robotu tarafından otomatik oluşturulmuştur.',
         50,
         750,
         { align: 'center', width: 495 }
       );

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    await new Promise<void>((resolve) => {
      doc.on('end', () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=menu-plani-${Date.now()}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PDF export failed'
      },
      { status: 500 }
    );
  }
}
