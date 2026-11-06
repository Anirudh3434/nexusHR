"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  if (size === 'sm') {
    return (
      <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0 shadow-2xs" aria-hidden>
        <Sparkles className="w-3.5 h-3.5" />
      </div>
    );
  }
  return (
    <div className="relative group cursor-pointer inline-block" aria-hidden>
      <div className="absolute inset-0 rounded-[24px] bg-primary/30 blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
      <div className="relative w-14 h-14 rounded-[20px] bg-gradient-to-tr from-primary via-primary/90 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary/30 border border-white/20 transition-transform group-hover:scale-105 duration-300">
        <Sparkles className="w-7 h-7 text-white animate-pulse" />
      </div>
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

  // Focus composer when opened; return focus to launcher on close.
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
          className="relative group rounded-full w-14 h-14 flex items-center justify-center bg-gradient-to-tr from-primary via-primary/95 to-indigo-600 text-white shadow-xl shadow-primary/35 hover:shadow-2xl hover:shadow-primary/45 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        >
          <div className="absolute inset-0 rounded-full bg-primary/40 blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="w-6 h-6 text-white relative z-10 animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="HR assistant chat"
      className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100dvh-5rem)] flex flex-col rounded-[28px] sm:rounded-[32px] border border-white/50 dark:border-white/10 bg-gradient-to-b from-white/95 via-white/90 to-white/80 dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-950/85 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap');
        .font-cursive {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      {/* Ambient blurred primary reflections matching MCP container */}
      <div className="absolute -top-16 -left-16 w-52 h-52 bg-primary/25 rounded-full blur-[70px] pointer-events-none" />
      <div className="absolute top-1/3 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-primary/15 rounded-full blur-[65px] pointer-events-none" />

      {/* Identity header with Glassmorphic MCP styling */}
      <div className="relative z-10 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-white/40 dark:border-white/10 flex items-center justify-between bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/25 shadow-xs">
            <Sparkles className="h-5 w-5 stroke-[2.2] animate-pulse" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-1.5 truncate">
              NexusAI <span className="font-cursive text-lg font-bold text-primary tracking-normal">HR Assistant</span>
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight mt-0.5 truncate">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Online · <span className="font-cursive text-xs font-bold text-primary">policies, leave &amp; benefits</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleNewChat}
            aria-label="Start new conversation"
            title="Start new conversation"
            className="h-8 w-8 rounded-full bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-all flex items-center justify-center cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="h-8 w-8 rounded-full bg-white/60 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-all flex items-center justify-center cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Conversation Area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation with HR assistant"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin z-10 relative"
      >
        {messages.length === 0 && (
          <div className="text-center pt-6 pb-2 px-2 space-y-4 animate-in fade-in duration-300">
            <AssistantAvatar size="lg" />
            <div>
              <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Hi, I&apos;m <span className="font-cursive text-xl font-bold text-primary">NexusAI</span>
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
                I can answer questions about HR policies, time off, holidays, and benefits.
              </p>
            </div>
            <div className="flex flex-col gap-2 max-w-[320px] mx-auto pt-1">
              {suggestedQuestions.slice(0, 4).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(question)}
                  className="w-full rounded-2xl bg-white/70 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-2xs hover:border-primary/50 dark:hover:border-primary/50 hover:bg-white dark:hover:bg-neutral-800 hover:text-primary dark:hover:text-primary transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{question}</span>
                  <span className="text-neutral-400 group-hover:text-primary transition-colors text-sm shrink-0">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          message.role === 'user' ? (
            <div key={index} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-none bg-primary text-white px-3.5 py-2.5 shadow-md shadow-primary/25 border border-primary/40 font-medium">
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className="mt-1 text-right text-[10px] text-white/75">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ) : (
            <div key={index} className="flex items-start gap-2.5">
              <AssistantAvatar size="sm" />
              <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white/80 dark:bg-neutral-850/90 border border-neutral-200/70 dark:border-neutral-700/60 px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 shadow-sm backdrop-blur-md">
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 border-t border-neutral-200/60 dark:border-neutral-700/60 pt-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Sources</p>
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                        <FileText className="w-3 h-3 shrink-0 text-primary" />
                        <span className="truncate">{source.title}</span>
                        <span className="ml-auto shrink-0 tabular text-[10px] font-mono text-primary">{Math.round(source.relevance * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5" aria-label="Assistant is typing">
            <AssistantAvatar size="sm" />
            <div className="rounded-2xl rounded-tl-none bg-white/80 dark:bg-neutral-850/90 border border-neutral-200/70 dark:border-neutral-700/60 px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-primary/60 rounded-full motion-safe:animate-bounce" />
                <div className="w-2 h-2 bg-primary/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-primary/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Feedback Banner */}
      {showFeedback && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
        <div className="px-4 pb-1 z-10 relative">
          <div className="flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 dark:border-neutral-700/60 bg-white/70 dark:bg-neutral-800/70 px-3 py-1 shadow-2xs backdrop-blur-md">
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Was this helpful?</span>
            <button
              onClick={() => handleFeedback(true)}
              aria-label="Yes, helpful"
              className="rounded-full p-1 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400 transition-colors cursor-pointer"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback(false)}
              aria-label="No, not helpful"
              className="rounded-full p-1 text-rose-600 hover:bg-rose-500/15 dark:text-rose-400 transition-colors cursor-pointer"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Composer (Bottom Bar) */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="border-t border-white/40 dark:border-white/10 p-3 sm:p-3.5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about HR policies..."
            aria-label="Ask the HR assistant"
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-xs sm:text-sm border border-neutral-200/80 dark:border-neutral-700/80 focus:border-primary focus:ring-2 focus:ring-primary/15 rounded-2xl focus:outline-none text-neutral-800 dark:text-neutral-100 bg-white/90 dark:bg-neutral-800/90 placeholder-neutral-400 font-medium h-10 sm:h-11 shadow-inner transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:opacity-95 disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
