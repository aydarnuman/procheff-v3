/**
 * Chat Store - State management for AI assistant
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatState {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  clearHistory: () => void;
  deleteMessage: (id: string) => void;
  setError: (error: string | null) => void;
  startNewConversation: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      isLoading: false,
      error: null,
      conversationId: null,

      // Send message to AI
      sendMessage: async (content: string) => {
        const state = get();

        // Add user message
        const userMessage: Message = {
          id: generateMessageId(),
          role: 'user',
          content,
          timestamp: new Date().toISOString()
        };

        set({
          messages: [...state.messages, userMessage],
          isLoading: true,
          error: null
        });

        // Create placeholder for assistant response
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true
        };

        set(state => ({
          messages: [...state.messages, assistantMessage]
        }));

        try {
          // Call chat API with streaming
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: content,
              conversationHistory: state.messages.map(m => ({
                role: m.role,
                content: m.content
              }))
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Read streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          let fullResponse = '';

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;

            // Update last message with accumulated content
            set(state => {
              const newMessages = [...state.messages];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = fullResponse;
              }
              return { messages: newMessages };
            });
          }

          // Mark streaming as complete
          set(state => {
            const newMessages = [...state.messages];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.isStreaming = false;
            }
            return {
              messages: newMessages,
              isLoading: false
            };
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

          set(state => ({
            error: errorMessage,
            isLoading: false,
            // Remove the incomplete assistant message
            messages: state.messages.filter(m => m.content !== '' || m.role === 'user')
          }));

          console.error('Chat error:', error);
        }
      },

      // Add a message manually
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateMessageId(),
          timestamp: new Date().toISOString()
        };

        set(state => ({
          messages: [...state.messages, newMessage]
        }));
      },

      // Update last message content (for streaming)
      updateLastMessage: (content) => {
        set(state => {
          const newMessages = [...state.messages];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage) {
            lastMessage.content = content;
          }
          return { messages: newMessages };
        });
      },

      // Clear all messages
      clearHistory: () => {
        set({
          messages: [],
          error: null,
          isLoading: false
        });
      },

      // Delete specific message
      deleteMessage: (id) => {
        set(state => ({
          messages: state.messages.filter(m => m.id !== id)
        }));
      },

      // Set error state
      setError: (error) => {
        set({ error, isLoading: false });
      },

      // Start new conversation
      startNewConversation: () => {
        set({
          messages: [],
          error: null,
          isLoading: false,
          conversationId: generateConversationId()
        });
      }
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        // Only persist messages (last 50)
        messages: state.messages.slice(-50),
        conversationId: state.conversationId
      })
    }
  )
);

// Helper functions
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
