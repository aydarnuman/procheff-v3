#!/usr/bin/env node
/**
 * 🔄 Auto Workflow Script
 * 
 * Claude çıktılarını otomatik olarak işler ve Cursor'a entegre eder.
 * 
 * Kullanım:
 *   node scripts/auto-workflow.js <claude-output.md>
 * 
 * Özellikler:
 *   - Claude çıktısını parse eder
 *   - Todo list oluşturur
 *   - Code changes'i tespit eder
 *   - Implementation plan oluşturur
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('❌ Kullanım: node scripts/auto-workflow.js <claude-output.md>');
  process.exit(1);
}

/**
 * Claude çıktısından implementation plan çıkar
 */
function extractImplementationPlan(content) {
  const plan = {
    steps: [],
    files: [],
    dependencies: []
  };

  // Step extraction (numara ile başlayan satırlar)
  const stepRegex = /^\d+\.\s+(.+)$/gm;
  let match;
  while ((match = stepRegex.exec(content)) !== null) {
    plan.steps.push(match[1]);
  }

  // File paths (```startLine:endLine:filepath formatı veya code block içinde)
  const fileRefRegex = /```(\d+):(\d+):([^\s\n]+)/g;
  while ((match = fileRefRegex.exec(content)) !== null) {
    plan.files.push({
      path: match[3],
      startLine: parseInt(match[1]),
      endLine: parseInt(match[2])
    });
  }
  
  // Also check code blocks for file paths in comments
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const code = match[1];
    // Look for file path in comments (// src/... or # src/...)
    const commentPathRegex = /\/\/\s*([\w\/\.-]+\.(ts|tsx|js|jsx))|#\s*([\w\/\.-]+\.(ts|tsx|js|jsx))/g;
    let commentMatch;
    while ((commentMatch = commentPathRegex.exec(code)) !== null) {
      const filePath = commentMatch[1] || commentMatch[3];
      if (filePath && !plan.files.some(f => f.path === filePath)) {
        plan.files.push({
          path: filePath,
          startLine: 1,
          endLine: 100 // Unknown, use default
        });
      }
    }
  }

  // Dependencies (import statements)
  const importRegex = /^import\s+.*from\s+['"]([^'"]+)['"]/gm;
  while ((match = importRegex.exec(content)) !== null) {
    if (!plan.dependencies.includes(match[1])) {
      plan.dependencies.push(match[1]);
    }
  }

  return plan;
}

/**
 * Todo list oluştur
 */
function createTodoList(plan) {
  const todos = plan.steps.map((step, index) => ({
    id: `step-${index + 1}`,
    status: 'pending',
    content: step
  }));

  return todos;
}

/**
 * Implementation summary oluştur
 */
function createSummary(plan, todos) {
  return {
    timestamp: new Date().toISOString(),
    totalSteps: plan.steps.length,
    filesToModify: plan.files.length,
    dependencies: plan.dependencies.length,
    todos: todos.length,
    estimatedTime: `${plan.steps.length * 15} dakika`,
    files: plan.files.map(f => f.path),
    summary: `${plan.steps.length} adım, ${plan.files.length} dosya, ${plan.dependencies.length} dependency`
  };
}

/**
 * Main
 */
function main() {
  try {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const plan = extractImplementationPlan(content);
    const todos = createTodoList(plan);
    const summary = createSummary(plan, todos);

    // Output files
    const outputDir = path.join(process.cwd(), '.workflow');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write todo list
    const todoFile = path.join(outputDir, 'todos.json');
    fs.writeFileSync(todoFile, JSON.stringify({ todos }, null, 2));
    console.log(`✅ Todo list: ${todoFile}`);

    // Write summary
    const summaryFile = path.join(outputDir, 'summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary: ${summaryFile}`);

    // Write implementation plan
    const planFile = path.join(outputDir, 'plan.md');
    let planContent = `# Implementation Plan\n\n`;
    planContent += `**Oluşturulma:** ${summary.timestamp}\n\n`;
    planContent += `## Özet\n\n`;
    planContent += `- ${summary.totalSteps} adım\n`;
    planContent += `- ${summary.filesToModify} dosya değişikliği\n`;
    planContent += `- ${summary.dependencies.length} dependency\n`;
    planContent += `- Tahmini süre: ${summary.estimatedTime}\n\n`;
    planContent += `## Adımlar\n\n`;
    plan.steps.forEach((step, index) => {
      planContent += `${index + 1}. ${step}\n`;
    });
    planContent += `\n## Dosyalar\n\n`;
    plan.files.forEach(file => {
      planContent += `- \`${file.path}\` (${file.startLine}-${file.endLine})\n`;
    });
    planContent += `\n## Dependencies\n\n`;
    plan.dependencies.forEach(dep => {
      planContent += `- \`${dep}\`\n`;
    });
    fs.writeFileSync(planFile, planContent);
    console.log(`✅ Plan: ${planFile}`);

    console.log(`\n🎯 ${summary.totalSteps} adım, ${summary.filesToModify} dosya hazır!`);

  } catch (error) {
    console.error(`❌ Hata: ${error.message}`);
    process.exit(1);
  }
}

main();

