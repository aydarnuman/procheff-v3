/**
 * Test PDF Processing
 * This script tests if the PDF processing works correctly
 */

const fs = require('fs');
const path = require('path');

async function testPDFProcessing() {
  console.log('🧪 Testing PDF Processing...\n');

  try {
    // Try to import pdf-parse
    const pdfParse = require('pdf-parse');
    console.log('✅ pdf-parse library is available');

    // Try to import pdf2json
    const PDF2Json = require('pdf2json');
    console.log('✅ pdf2json library is available');

    // Create a simple test PDF buffer (this is just a placeholder)
    // In real usage, you would read an actual PDF file
    const testPDFPath = process.argv[2];

    if (!testPDFPath) {
      console.log('\n⚠️  Usage: node test-pdf-processing.js <path-to-pdf>');
      console.log('   Example: node test-pdf-processing.js ~/Desktop/test.pdf');
      return;
    }

    if (!fs.existsSync(testPDFPath)) {
      console.log(`\n❌ PDF file not found: ${testPDFPath}`);
      return;
    }

    const pdfBuffer = fs.readFileSync(testPDFPath);
    console.log(`\n📄 Testing with PDF: ${testPDFPath}`);
    console.log(`   File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Test pdf-parse
    console.log('\n🔍 Testing pdf-parse...');
    try {
      const pdfData = await pdfParse(pdfBuffer);
      console.log(`   ✅ Pages: ${pdfData.numpages}`);
      console.log(`   ✅ Text length: ${pdfData.text.length} characters`);
      console.log(`   ✅ First 200 chars: ${pdfData.text.substring(0, 200).replace(/\n/g, ' ')}`);

      if (pdfData.text.trim().length < 100) {
        console.log('   ⚠️  Warning: Very little text extracted (might need OCR)');
      }
    } catch (error) {
      console.log(`   ❌ pdf-parse error: ${error.message}`);
    }

    // Test pdf2json
    console.log('\n🔍 Testing pdf2json...');
    try {
      const pdfParser = new PDF2Json(null, 1);

      await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          let totalText = '';
          const pages = pdfData.Pages || [];

          pages.forEach(page => {
            const texts = page.Texts || [];
            texts.forEach(text => {
              const runs = text.R || [];
              runs.forEach(run => {
                if (run.T) {
                  totalText += decodeURIComponent(run.T) + ' ';
                }
              });
            });
          });

          console.log(`   ✅ Pages found: ${pages.length}`);
          console.log(`   ✅ Text length: ${totalText.length} characters`);
          console.log(`   ✅ First 200 chars: ${totalText.substring(0, 200)}`);
          resolve();
        });

        pdfParser.on('pdfParser_dataError', (error) => {
          console.log(`   ❌ pdf2json error: ${error.parserError || error}`);
          resolve();
        });

        pdfParser.parseBuffer(pdfBuffer);
      });
    } catch (error) {
      console.log(`   ❌ pdf2json error: ${error.message}`);
    }

    console.log('\n✅ PDF processing test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPDFProcessing();