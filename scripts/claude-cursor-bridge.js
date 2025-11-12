#!/usr/bin/env node
/**
 * 🤖 Claude-Cursor Bridge Script
 * 
 * Bu script, Claude AI çıktılarını Cursor prompt formatına dönüştürür
 * ve otomatik görev zinciri oluşturur.
 * 
 * Kullanım:
 *   node scripts/claude-cursor-bridge.js <input-file> [options]
 * 
 * Örnek:
 *   node scripts/claude-cursor-bridge.js claude-output.md --format=prompt
 *   node scripts/claude-cursor-bridge.js claude-output.md --format=todo --output=todos.json
 */

const fs = require('fs');
const path = require('path');

// Command line arguments
const args = process.argv.slice(2);
const inputFile = args[0];
const options = {
  format: args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'prompt',
  output: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || null,
  verbose: args.includes('--verbose') || args.includes('-v')
};

if (!inputFile) {
  console.error('❌ Kullanım: node scripts/claude-cursor-bridge.js <input-file> [options]');
  console.error('\nSeçenekler:');
  console.error('  --format=<prompt|todo|summary>  Çıktı formatı (default: prompt)');
  console.error('  --output=<file>                Çıktı dosyası (default: stdout)');
  console.error('  --verbose, -v                  Detaylı log');
  process.exit(1);
}

/**
 * Claude çıktısını parse et
 */
function parseClaudeOutput(content) {
  const sections = {
    tasks: [],
    codeBlocks: [],
    notes: [],
    errors: []
  };

  // Task extraction (## veya ### başlıkları)
  const taskRegex = /^###?\s+(.+)$/gm;
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    sections.tasks.push({
      title: match[1],
      line: content.substring(0, match.index).split('\n').length
    });
  }

  // Code blocks (handle both regular and file reference format)
  const codeBlockRegex = /```(\d+:\d+:[\w\/\.-]+|[\w]*)?\n?([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const firstPart = match[1] || '';
    let language = 'text';
    let fileRef = null;
    
    // Check if it's a file reference (startLine:endLine:filepath)
    if (firstPart.includes(':')) {
      const parts = firstPart.split(':');
      if (parts.length === 3) {
        fileRef = {
          startLine: parseInt(parts[0]),
          endLine: parseInt(parts[1]),
          path: parts[2]
        };
        // Try to detect language from file extension
        const ext = parts[2].split('.').pop();
        language = ext || 'text';
      }
    } else {
      language = firstPart || 'text';
    }
    
    sections.codeBlocks.push({
      language,
      code: match[2],
      fileRef,
      line: content.substring(0, match.index).split('\n').length
    });
  }

  // Notes (⚠️, ✅, ❌ gibi emoji'ler)
  const noteRegex = /(⚠️|✅|❌|💡|🔍|📝)\s+(.+)$/gm;
  while ((match = noteRegex.exec(content)) !== null) {
    sections.notes.push({
      type: match[1],
      message: match[2],
      line: content.substring(0, match.index).split('\n').length
    });
  }

  return sections;
}

/**
 * Cursor prompt formatına dönüştür
 */
function toCursorPrompt(parsed) {
  let prompt = `# Cursor Prompt - ${new Date().toISOString()}\n\n`;

  if (parsed.tasks.length > 0) {
    prompt += `## Görevler\n\n`;
    parsed.tasks.forEach((task, index) => {
      prompt += `${index + 1}. ${task.title}\n`;
    });
    prompt += '\n';
  }

  if (parsed.codeBlocks.length > 0) {
    prompt += `## Kod Değişiklikleri\n\n`;
    parsed.codeBlocks.forEach((block, index) => {
      prompt += `### ${block.language || 'code'} Block ${index + 1}\n\n`;
      prompt += `\`\`\`${block.language || ''}\n${block.code}\n\`\`\`\n\n`;
    });
  }

  if (parsed.notes.length > 0) {
    prompt += `## Notlar\n\n`;
    parsed.notes.forEach(note => {
      prompt += `${note.type} ${note.message}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}

/**
 * Todo list formatına dönüştür
 */
function toTodoList(parsed) {
  const todos = parsed.tasks.map((task, index) => ({
    id: `task-${index + 1}`,
    status: 'pending',
    content: task.title
  }));

  return JSON.stringify({ todos }, null, 2);
}

/**
 * Summary formatına dönüştür
 */
function toSummary(parsed) {
  return {
    timestamp: new Date().toISOString(),
    tasks: parsed.tasks.length,
    codeBlocks: parsed.codeBlocks.length,
    notes: parsed.notes.length,
    tasks: parsed.tasks.map(t => t.title),
    summary: `Toplam ${parsed.tasks.length} görev, ${parsed.codeBlocks.length} kod bloğu, ${parsed.notes.length} not`
  };
}

/**
 * Main function
 */
function main() {
  try {
    // Read input file
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Dosya bulunamadı: ${inputFile}`);
      process.exit(1);
    }

    const content = fs.readFileSync(inputFile, 'utf-8');
    
    if (options.verbose) {
      console.log(`📖 Dosya okundu: ${inputFile} (${content.length} karakter)`);
    }

    // Parse content
    const parsed = parseClaudeOutput(content);
    
    if (options.verbose) {
      console.log(`📊 Parse edildi:`);
      console.log(`   - ${parsed.tasks.length} görev`);
      console.log(`   - ${parsed.codeBlocks.length} kod bloğu`);
      console.log(`   - ${parsed.notes.length} not`);
    }

    // Convert to requested format
    let output;
    switch (options.format) {
      case 'prompt':
        output = toCursorPrompt(parsed);
        break;
      case 'todo':
        output = toTodoList(parsed);
        break;
      case 'summary':
        output = JSON.stringify(toSummary(parsed), null, 2);
        break;
      default:
        console.error(`❌ Bilinmeyen format: ${options.format}`);
        process.exit(1);
    }

    // Write output
    if (options.output) {
      fs.writeFileSync(options.output, output, 'utf-8');
      console.log(`✅ Çıktı kaydedildi: ${options.output}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error(`❌ Hata: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run
main();

