/**
 * Chat API - Streaming endpoint for AI assistant
 * Integrates with MCP memory for context-aware responses
 */

import { AILogger } from '@/lib/ai/logger';
import { AIProviderFactory } from '@/lib/ai/provider-factory';
import { estimateTokens } from '@/lib/ai/utils';
import { getChatAnalytics } from '@/lib/chat/analytics-tracker';
import { executeCommand, isCommand } from '@/lib/chat/commands';
import { domainKnowledge, type DomainContext } from '@/lib/chat/domain-knowledge';
import { LearningEngine } from '@/lib/chat/learning-engine';
import { MemoryManager } from '@/lib/chat/memory-manager';
import { NextRequest, NextResponse } from 'next/server';

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
        { error: 'Mesaj gereklidir' },
        { status: 400 }
      );
    }

    AILogger.info('Chat request received', { message: message.substring(0, 100) });

    // Generate IDs for tracking
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chatAnalytics = getChatAnalytics();
    await chatAnalytics.trackMessage({
      messageId,
      conversationId,
      timestamp: new Date().toISOString(),
      messageType: 'user',
      content: message,
      command: isCommand(message) ? message.split(' ')[0] : undefined
    });

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
    let retrievedContext: any = null;
    try {
      const context = await memoryManager.getRelevantContext(message);
      retrievedContext = context;

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

    // Get domain expertise insights
    try {
      // Extract context from message for domain knowledge
      const domainContext: DomainContext = extractDomainContext(message, conversationHistory);

      const domainInsights = await domainKnowledge.getInsights(message, domainContext);

      if (domainInsights.length > 0) {
        contextInfo += '\n\n## UZMAN BİLGİSİ:\n';
        domainInsights.forEach(insight => {
          contextInfo += `\n### ${insight.title}\n${insight.content}\n`;

          if (insight.recommendations && insight.recommendations.length > 0) {
            contextInfo += '\n**Tavsiyeler:**\n';
            insight.recommendations.slice(0, 3).forEach(rec => {
              contextInfo += `- ${rec}\n`;
            });
          }
        });

        AILogger.info('Domain insights added', {
          insightCount: domainInsights.length,
          categories: domainInsights.map(i => i.category)
        });
      }
    } catch (error) {
      AILogger.warn('Failed to get domain insights', { error });
      // Non-critical, continue without domain knowledge
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

    // Calculate total input tokens
    const totalInputTokens = messages.reduce((sum, msg) => {
      return sum + estimateTokens(msg.content);
    }, 0);

    // Claude Sonnet 4 context window: 200K tokens
    // Reserve 4K for output, so max input is ~196K
    const MAX_INPUT_TOKENS = 196000;
    const WARNING_THRESHOLD = 180000; // Warn at 90% usage

    if (totalInputTokens > MAX_INPUT_TOKENS) {
      AILogger.warn('Context window exceeded', {
        inputTokens: totalInputTokens,
        maxTokens: MAX_INPUT_TOKENS,
        excess: totalInputTokens - MAX_INPUT_TOKENS
      });

      // Truncate conversation history if needed
      const systemPromptTokens = estimateTokens(CHAT_ASSISTANT_PROMPT + contextInfo);
      const currentMessageTokens = estimateTokens(message);
      const availableTokens = MAX_INPUT_TOKENS - systemPromptTokens - currentMessageTokens - 1000; // Safety margin

      // Rebuild messages with limited history
      const limitedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      limitedMessages.push({
        role: 'user',
        content: CHAT_ASSISTANT_PROMPT + contextInfo
      });

      // Add conversation history with token limit
      if (conversationHistory && Array.isArray(conversationHistory)) {
        let historyTokens = 0;
        const limitedHistory = [];
        
        // Add messages from newest to oldest until limit
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
          const msg = conversationHistory[i];
          const msgTokens = estimateTokens(msg.content);
          if (historyTokens + msgTokens <= availableTokens) {
            limitedHistory.unshift(msg);
            historyTokens += msgTokens;
          } else {
            break;
          }
        }

        limitedHistory.forEach((msg: { role: string; content: string }) => {
          limitedMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });

        AILogger.info('Conversation history truncated', {
          original: conversationHistory.length,
          limited: limitedHistory.length,
          savedTokens: totalInputTokens - (systemPromptTokens + currentMessageTokens + historyTokens)
        });
      }

      limitedMessages.push({
        role: 'user',
        content: message
      });

      messages.length = 0;
      messages.push(...limitedMessages);
    } else if (totalInputTokens > WARNING_THRESHOLD) {
      AILogger.warn('Context window approaching limit', {
        inputTokens: totalInputTokens,
        maxTokens: MAX_INPUT_TOKENS,
        usagePercent: Math.round((totalInputTokens / MAX_INPUT_TOKENS) * 100)
      });
    }

    AILogger.info('Chat request prepared', {
      messageCount: messages.length,
      estimatedInputTokens: totalInputTokens,
      contextInfoLength: contextInfo.length
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
          const tokensUsed = estimateTokens(fullResponse);

          AILogger.success('Chat response completed', {
            duration,
            responseLength: fullResponse.length,
            tokensUsed
          });

          // Track assistant response
          await chatAnalytics.trackMessage({
            messageId: `${messageId}_response`,
            conversationId,
            timestamp: new Date().toISOString(),
            messageType: 'assistant',
            content: fullResponse,
            responseTime: duration,
            tokensUsed,
            success: true
          });

          // Save conversation to memory for learning
          try {
            await saveConversationToMemory(
              message,
              fullResponse,
              retrievedContext,
              memoryManager
            );
          } catch (error) {
            AILogger.warn('Failed to save conversation to memory', { error });
            // Non-critical, don't block response
          }

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
      { error: 'Chat isteği işlenemedi', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Helper function to save conversation to memory
 */
async function saveConversationToMemory(
  userMessage: string,
  assistantResponse: string,
  context: any,
  memoryManager: MemoryManager
) {
  try {
    const timestamp = new Date().toISOString();
    const conversationId = `conv_${Date.now()}`;

    // Create conversation entity
    const conversationEntity = {
      name: `conversation_${conversationId}`,
      entityType: 'konusma',
      observations: [
        `User: ${userMessage.substring(0, 200)}`,
        `Assistant: ${assistantResponse.substring(0, 200)}`,
        `Timestamp: ${timestamp}`,
        `Context Used: ${context ? 'Yes' : 'No'}`,
        `Similar Tenders Found: ${context?.similarTenders?.length || 0}`,
        `Learned Rules Applied: ${context?.learnedRules?.length || 0}`
      ]
    };

    // Extract keywords from conversation
    const keywords = extractKeywordsFromConversation(userMessage, assistantResponse);

    // Create keyword entities
    const keywordEntities = keywords.slice(0, 5).map(keyword => ({
      name: `keyword_${keyword.toLowerCase().replace(/\s+/g, '_')}`,
      entityType: 'anahtar_kelime',
      observations: [`Keyword: ${keyword}`, `From Conversation: ${conversationId}`]
    }));

    // Save all entities
    await memoryManager['createEntities']([conversationEntity, ...keywordEntities]);

    // Create relations
    const relations = keywordEntities.map(entity => ({
      from: conversationEntity.name,
      to: entity.name,
      relationType: 'icerir_kelime'
    }));

    if (relations.length > 0) {
      await memoryManager['createRelations'](relations);
    }

    AILogger.info('Conversation saved to memory', {
      conversationId,
      keywordCount: keywords.length
    });
  } catch (error) {
    AILogger.warn('Failed to save conversation', { error });
    // Don't throw - this is non-critical
  }
}

/**
 * Extract domain context from message and conversation history
 */
function extractDomainContext(message: string, conversationHistory?: any[]): DomainContext {
  const context: DomainContext = {};
  const text = message.toLowerCase();

  // Extract institution
  const institutionKeywords = ['hastane', 'okul', 'üniversite', 'belediye', 'bakanlık', 'sağlık', 'eğitim'];
  for (const keyword of institutionKeywords) {
    if (text.includes(keyword)) {
      context.institution = keyword;
      break;
    }
  }

  // Extract budget
  const budgetMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:milyon|bin)?\s*(?:tl|lira)/i);
  if (budgetMatch) {
    let amount = parseFloat(budgetMatch[1]);
    if (text.includes('milyon')) amount *= 1000000;
    else if (text.includes('bin')) amount *= 1000;
    context.budget = amount;
  }

  // Extract person count
  const personMatch = text.match(/(\d+)\s*kişi/i);
  if (personMatch) {
    context.personCount = parseInt(personMatch[1]);
  }

  // Extract menu items
  const menuKeywords = ['çorba', 'pilav', 'tavuk', 'et', 'sebze', 'salata', 'tatlı'];
  const foundMenuItems: string[] = [];
  menuKeywords.forEach(item => {
    if (text.includes(item)) foundMenuItems.push(item);
  });
  if (foundMenuItems.length > 0) {
    context.menuItems = foundMenuItems;
  }

  // Extract from conversation history if available
  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach(msg => {
      const historyText = msg.content.toLowerCase();

      // Look for institution mentions
      if (!context.institution) {
        for (const keyword of institutionKeywords) {
          if (historyText.includes(keyword)) {
            context.institution = keyword;
            break;
          }
        }
      }

      // Look for budget mentions
      if (!context.budget) {
        const budgetHistoryMatch = historyText.match(/(\d+(?:\.\d+)?)\s*(?:milyon|bin)?\s*(?:tl|lira)/i);
        if (budgetHistoryMatch) {
          let amount = parseFloat(budgetHistoryMatch[1]);
          if (historyText.includes('milyon')) amount *= 1000000;
          else if (historyText.includes('bin')) amount *= 1000;
          context.budget = amount;
        }
      }
    });
  }

  return context;
}

/**
 * Extract keywords from conversation
 */
function extractKeywordsFromConversation(userMessage: string, assistantResponse: string): string[] {
  const text = `${userMessage} ${assistantResponse}`.toLowerCase();

  // Important keywords for tender domain
  const domainKeywords = [
    'ihale', 'maliyet', 'bütçe', 'analiz', 'karar', 'risk',
    'teklif', 'katıl', 'fiyat', 'menü', 'yemek', 'personel',
    'tedarik', 'kar', 'zarar', 'puan', 'değerlendirme'
  ];

  const foundKeywords: string[] = [];

  // Check for domain keywords
  domainKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });

  // Extract institution names (words starting with capital letters)
  const institutionPattern = /\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*/g;
  const institutions = text.match(institutionPattern) || [];
  foundKeywords.push(...institutions.slice(0, 3));

  // Extract numbers with context (e.g., "5000 kişi", "10 milyon TL")
  const numberPattern = /\d+(\.\d+)?\s*(kişi|tl|milyon|bin|gün|ay|yıl)/gi;
  const numbers = text.match(numberPattern) || [];
  foundKeywords.push(...numbers.slice(0, 3));

  return [...new Set(foundKeywords)]; // Remove duplicates
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
