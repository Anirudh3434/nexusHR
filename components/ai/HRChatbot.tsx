"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown, Sparkles, FileText, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    articleId: string;
    title: string;
    relevance: number;
  }>;
}

interface Source {
  articleId: string;
  title: string;
  relevance: number;
}

interface ChatResponse {
  response: string;
  sources: Source[];
  category: string;
  conversationId: string;
}

const suggestedQuestions = [
  "How many PTO days do I have?",
  "What are the company holidays?",
  "How do I request sick leave?",
  "What health benefits are available?",
  "How do I update my personal information?"
];

function AssistantAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-14 h-14 rounded-2xl' : size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl';
  const icon = size === 'lg' ? 'w-7 h-7' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className={`${dims} bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25`} aria-hidden>
      <Sparkles className={`${icon} text-white`} />
    </div>
  );
}

export default function HRChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus the composer when opened; return focus to the launcher on close.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  // Escape closes the panel.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-user-id'] = userData.id || '';
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-name'] = userData.name || '';
      }

      const response = await fetch('/api/ai/hr/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({
            sender: m.role,
            text: m.content
          })),
          conversationId
        })
      });

      if (response.ok) {
        const data: ChatResponse = await response.json();

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          sources: data.sources
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(data.conversationId);
        setShowFeedback(true);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message || 'Unable to process your request'}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!conversationId) return;

    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-user-id'] = userData.id || '';
      }

      await fetch('/api/ai/hr/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          conversationId,
          helpful,
          rating: helpful ? 5 : 1
        })
      });

      setShowFeedback(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setShowFeedback(false);
    setInputValue('');
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          ref={launcherRef}
          onClick={() => setIsOpen(true)}
          aria-label="Open HR assistant chat"
          className="rounded-full w-14 h-14 flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="HR assistant chat"
      className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100dvh-6rem)] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Identity header */}
      <div className="bg-primary text-primary-foreground px-4 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0" aria-hidden>
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-foreground leading-tight">NexusAI HR Assistant</p>
            <p className="flex items-center gap-1.5 text-xs text-primary-foreground/80 leading-tight mt-0.5">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
              </span>
              Online · Policies, leave &amp; benefits
            </p>
          </div>
          <button
            onClick={handleNewChat}
            aria-label="Start new conversation"
            title="Start new conversation"
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with HR assistant"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center pt-10 pb-4 px-2">
            <AssistantAvatar size="lg" />
            <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
              Hi, I&apos;m NexusAI
            </h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              I can answer questions about HR policies, time off, holidays, and benefits.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestedQuestions.slice(0, 4).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(question)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:shadow transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          message.role === 'user' ? (
            <div key={index} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2.5 shadow-sm">
                <p className="text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap">{message.content}</p>
                <p className="mt-1 text-right text-[10px] text-primary-foreground/75">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ) : (
            <div key={index} className="flex items-start gap-2.5">
              <AssistantAvatar size="sm" />
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-foreground">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 border-t border-border pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sources</p>
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3 shrink-0 text-primary" />
                        <span className="truncate">{source.title}</span>
                        <span className="ml-auto shrink-0 tabular text-[10px]">{Math.round(source.relevance * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5" aria-label="Assistant is typing">
            <AssistantAvatar size="sm" />
            <div className="rounded-2xl rounded-tl-md bg-muted px-4 py-3.5">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full motion-safe:animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Feedback */}
      {showFeedback && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
        <div className="px-4 pb-1">
          <div className="flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <button
              onClick={() => handleFeedback(true)}
              aria-label="Yes, helpful"
              className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback(false)}
              aria-label="No, not helpful"
              className="rounded-full p-1.5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="border-t border-border p-3 shrink-0">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about HR policies..."
            aria-label="Ask the HR assistant"
            disabled={isLoading}
            className="flex-1 rounded-xl"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            aria-label="Send message"
            className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
