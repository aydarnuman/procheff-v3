/**
 * Chat API - Streaming endpoint for AI assistant
 * Integrates with MCP memory for context-aware responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai/provider-factory';
import { AILogger } from '@/lib/ai/logger';
import { MemoryManager } from '@/lib/chat/memory-manager';
import { LearningEngine } from '@/lib/chat/learning-engine';
import { isCommand, executeCommand } from '@/lib/chat/commands';

const CHAT_ASSISTANT_PROMPT = `
SYSTEM TALİMATI:
Sen ProCheff sisteminin AI asistanısın. İhale analizi konusunda uzman bir danışmansın.

YETKİLERİN:
1. İhale dokümanlarını analiz etme
2. Geçmiş analizlerden öğrenme
3. Benzer ihaleleri bulma ve karşılaştırma
4. Kullanıcıya özel tavsiyeler sunma
5. Stratejik kararlar önerme

DAVRANIŞLAR:
- Samimi ve profesyonel ol
- Türkçe karakter kullan
- Kısa ve öz yanıtlar ver
- Önemli noktaları vurgula
- Kaynak referansı göster
- Emin olmadığında belirt

BİLGİ KAYNAKLARI:
- Geçmiş analiz sonuçları
- Öğrenilmiş kurallar
- Benzer ihale deneyimleri
- Kullanıcı feedback'leri

YANIT FORMATI:
- Markdown kullan
- Önemli bilgileri **bold** yap
- Listeler için bullet points kullan
- Gerekirse tablo oluştur
`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request
    const body = await req.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    AILogger.info('Chat request received', { message: message.substring(0, 100) });

    // Check if message is a command
    if (isCommand(message)) {
      AILogger.info('Command detected', { command: message });

      try {
        const result = await executeCommand(message);

        // Return command result as a formatted response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(result.message));
            controller.close();
          }
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Command-Result': result.type
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Komut çalıştırılamadı';
        AILogger.error('Command execution error', { error: errorMessage });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`❌ **Hata:** ${errorMessage}`));
            controller.close();
          }
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Command-Result': 'error'
          }
        });
      }
    }

    // Initialize managers for normal chat
    const memoryManager = new MemoryManager();

    // Get relevant context from memory
    let contextInfo = '';
    try {
      const context = await memoryManager.getRelevantContext(message);

      if (context.similarTenders.length > 0) {
        contextInfo += '\n\n## BENZER İHALELER (Geçmiş Deneyimler):\n';
        context.similarTenders.slice(0, 3).forEach((tender, idx) => {
          contextInfo += `\n### ${idx + 1}. ${tender.name}\n`;
          if (tender.observations) {
            contextInfo += tender.observations.slice(0, 5).join('\n') + '\n';
          }
        });
      }

      if (context.learnedRules.length > 0) {
        contextInfo += '\n\n## ÖĞRENİLMİŞ KURALLAR:\n';
        context.learnedRules.slice(0, 3).forEach((rule, idx) => {
          contextInfo += `\n${idx + 1}. `;
          if (rule.observations) {
            contextInfo += rule.observations.join(', ');
          }
          contextInfo += '\n';
        });
      }

      AILogger.info('Context retrieved', {
        similarTenders: context.similarTenders.length,
        learnedRules: context.learnedRules.length
      });
    } catch (error) {
      AILogger.warn('Failed to retrieve context, continuing without it', { error });
      // Continue without context - not critical
    }

    // Build conversation messages
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add system prompt
    messages.push({
      role: 'user',
      content: CHAT_ASSISTANT_PROMPT + contextInfo
    });

    // Add conversation history (last 5 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-5).forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Create Claude client
    const client = AIProviderFactory.getClaude();

    // Stream response
    const stream = await client.messages.stream({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages
    });

    // Create readable stream for response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Log completion
          const duration = Date.now() - startTime;
          AILogger.success('Chat response completed', {
            duration,
            responseLength: fullResponse.length
          });

          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          AILogger.error('Chat streaming error', { error: errorMessage });
          controller.error(error);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    AILogger.error('Chat API error', { error: errorMessage, duration });

    return NextResponse.json(
      { error: 'Failed to process chat request', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Feedback endpoint - allows users to provide corrections
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisId, correction } = body;

    if (!analysisId || !correction) {
      return NextResponse.json(
        { error: 'Analysis ID and correction are required' },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager();
    const learningEngine = new LearningEngine();

    // Save user feedback
    await memoryManager.addUserFeedback({
      analysisId,
      correction,
      timestamp: new Date().toISOString()
    });

    // Generate learning rule
    const rule = learningEngine.generateLearningRule({
      analysisId,
      correction,
      timestamp: new Date().toISOString()
    });

    AILogger.success('User feedback processed', { analysisId, ruleId: rule.id });

    return NextResponse.json({
      success: true,
      message: 'Feedback kaydedildi ve sistem öğrendi',
      ruleId: rule.id
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    AILogger.error('Feedback processing error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to process feedback', details: errorMessage },
      { status: 500 }
    );
  }
}
