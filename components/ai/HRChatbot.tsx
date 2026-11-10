"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, ThumbsUp, ThumbsDown, FileText, RotateCcw } from 'lucide-react';

export type ActionPose = 
  | 'welcoming' 
  | 'thinking' 
  | 'success' 
  | 'working' 
  | 'idea' 
  | 'support' 
  | 'celebration' 
  | 'security' 
  | 'shrug';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: ActionPose;
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

const actionMap: Record<ActionPose, string> = {
  welcoming: '/images/mascot/nexi_welcoming_avatar.png',
  thinking: '/images/mascot/nexi_thinking_avatar.png',
  success: '/images/mascot/nexi_success_avatar.png',
  working: '/images/mascot/nexi_working_trans.png',
  idea: '/images/mascot/nexi_idea_trans.png',
  support: '/images/mascot/nexi_support_trans.png',
  celebration: '/images/mascot/nexi_celebration_trans.png',
  security: '/images/mascot/nexi_security_avatar.png',
  shrug: '/images/mascot/nexi_thinking_avatar.png',
};

const suggestedQuestions = [
  "How many PTO days do I have?",
  "What are the company holidays?",
  "How do I request sick leave?",
  "What health benefits are available?",
  "How do I update my personal information?"
];

function AssistantAvatar({ 
  size = 'md', 
  action = 'welcoming' 
}: { 
  size?: 'sm' | 'md' | 'lg';
  action?: ActionPose;
}) {
  const src = actionMap[action] || actionMap.welcoming;

  if (size === 'sm') {
    return (
      <div 
        className="w-8 h-8 rounded-full border border-primary/25 shadow-xs overflow-hidden shrink-0 relative bg-gradient-to-tr from-primary/20 via-indigo-500/20 to-purple-500/20 ring-2 ring-primary/20 flex items-end justify-center" 
        aria-hidden
      >
        <img 
          src={src} 
          alt={`Nexi (${action})`} 
          className="w-full h-full object-cover object-top scale-110 translate-y-0.5 drop-shadow-xs transition-transform duration-200 select-none" 
        />
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer inline-flex items-center justify-center select-none" aria-hidden>
      {/* 3D Volumetric Spherical Glow */}
      <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-primary/35 via-indigo-500/25 to-violet-500/35 blur-xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none" />
      
      {/* 3D Sphere Container with Popout Avatar */}
      <div className="relative w-28 h-28 rounded-full border-2 border-white/60 dark:border-white/20 shadow-[0_14px_32px_-6px_rgba(79,70,229,0.45),inset_0_-10px_20px_rgba(30,27,75,0.35),inset_0_4px_12px_rgba(255,255,255,0.6)] transition-all group-hover:scale-105 duration-300 bg-gradient-to-b from-indigo-300/30 via-primary/20 to-violet-600/35 backdrop-blur-md flex items-end justify-center">
        {/* Soft top specular curve highlight */}
        <div className="absolute -top-3 inset-x-4 h-10 rounded-full bg-gradient-to-b from-white/45 to-transparent pointer-events-none z-0" />
        
        {/* Lower body clipped cleanly to sphere boundary */}
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <img 
            src={src} 
            alt="" 
            className="w-full h-full object-cover object-top scale-120 -translate-y-2 drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] select-none pointer-events-none transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-2.5" 
          />
        </div>

        {/* Upper body / head & hand overflowing above the sphere */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{ clipPath: 'polygon(-50% -100%, 150% -100%, 150% 50%, -50% 50%)' }}
        >
          <img 
            src={src} 
            alt={`Nexi (${action})`} 
            className="w-full h-full object-cover object-top scale-120 -translate-y-2 drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] select-none pointer-events-none transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-2.5" 
          />
        </div>
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Focus composer when opened; return focus to launcher on close.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus({ preventScroll: true });
    } else {
      launcherRef.current?.focus({ preventScroll: true });
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

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

        // Determine dynamic action pose based on response context & user query
        let actionPose: ActionPose = 'working';
        const lowerResponse = (data.response || '').toLowerCase();
        const lowerUser = text.toLowerCase();
        
        if (
          lowerResponse.includes("couldn't find") ||
          lowerResponse.includes("could not find") ||
          lowerResponse.includes("not found") ||
          lowerResponse.includes("not sure") ||
          lowerResponse.includes("unable to find")
        ) {
          actionPose = 'shrug';
        } else if (
          lowerResponse.includes('holiday') || 
          lowerResponse.includes('celebrat') ||
          lowerResponse.includes('anniversary') ||
          lowerResponse.includes('congratulations') ||
          lowerResponse.includes('happy new year') ||
          lowerResponse.includes('festival')
        ) {
          actionPose = 'celebration';
        } else if (
          lowerResponse.includes('security') ||
          lowerResponse.includes('data privacy') ||
          lowerResponse.includes('password') ||
          lowerResponse.includes('laptop damage') ||
          lowerResponse.includes('confidential') ||
          lowerResponse.includes('geofenc')
        ) {
          actionPose = 'security';
        } else if (
          lowerResponse.includes('helpdesk') || 
          lowerResponse.includes('support@') ||
          lowerResponse.includes('hr representative') ||
          lowerResponse.includes('ticket')
        ) {
          actionPose = 'support';
        } else if (
          lowerResponse.includes('tip:') ||
          lowerResponse.includes('recommend') ||
          lowerResponse.includes('step 1') ||
          lowerResponse.includes('best practice') ||
          lowerUser.startsWith('how do i') ||
          lowerUser.startsWith('how to')
        ) {
          actionPose = 'idea';
        } else if (
          lowerResponse.includes('approved') ||
          lowerResponse.includes('successfully') ||
          lowerResponse.includes('great news') ||
          (data.sources && data.sources.some(s => s.relevance >= 0.9))
        ) {
          actionPose = 'success';
        } else if (
          lowerResponse.includes('hello') || 
          lowerResponse.includes('hi ') || 
          lowerResponse.includes('welcome') ||
          lowerResponse.includes('how can i help')
        ) {
          actionPose = 'welcoming';
        } else if (data.sources && data.sources.length > 0) {
          actionPose = 'working';
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          sources: data.sources,
          action: actionPose
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(data.conversationId);
        setShowFeedback(true);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message || 'Unable to process your request'}`,
          timestamp: new Date(),
          action: 'shrug'
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please try again.',
        timestamp: new Date(),
        action: 'shrug'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    inputRef.current?.focus({ preventScroll: true });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          ref={launcherRef}
          onClick={() => setIsOpen(true)}
          aria-label="Open HR assistant chat"
          title="Chat with Nexi — NexusHR Assistant"
          className="relative group w-16 h-16 sm:w-[72px] sm:h-[72px] cursor-pointer select-none transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded-full"
        >
          {/* Extended hit-area covering the avatar head overflow */}
          <span className="absolute -top-3 inset-x-0 bottom-0 pointer-events-auto" aria-hidden="true" />

          {/* 3D Volumetric Glow */}
          <div className="absolute inset-0 rounded-full bg-primary/40 blur-lg opacity-75 group-hover:opacity-100 group-hover:blur-xl transition-all duration-300 pointer-events-none" />

          {/* Circular Base Pod */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-indigo-600 to-violet-600 border-2 border-white/50 shadow-xl shadow-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/50 transition-all duration-200 pointer-events-none" />

          {/* Layer 1: Avatar body clipped cleanly to circle's lower boundary */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <img
              src="/images/mascot/nexi_welcoming_avatar.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-top scale-125 -translate-y-2 drop-shadow-md select-none pointer-events-none transition-transform duration-200 group-hover:scale-130 group-hover:-translate-y-2.5"
            />
          </div>

          {/* Layer 2: Avatar head and waving hand overflowing outside the circle */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ clipPath: 'polygon(-50% -100%, 150% -100%, 150% 50%, -50% 50%)' }}
          >
            <img
              src="/images/mascot/nexi_welcoming_avatar.png"
              alt="Nexi - NexusHR AI Mascot"
              className="absolute inset-0 w-full h-full object-cover object-top scale-125 -translate-y-2 drop-shadow-lg select-none pointer-events-none transition-transform duration-200 group-hover:scale-130 group-hover:-translate-y-2.5"
            />
          </div>

          {/* Green dot (online status indicator) - fully circular, unclipped, positioned on bottom-right rim */}
          <span className="absolute bottom-0.5 right-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900 shadow-md pointer-events-none">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label="HR assistant chat"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[min(620px,calc(100dvh-2.5rem))] max-h-[calc(100dvh-2.5rem)] flex flex-col rounded-[28px] sm:rounded-[32px] border border-white/50 dark:border-white/10 bg-gradient-to-b from-white/95 via-white/90 to-white/80 dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-950/85 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
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

      {/* Identity header with Glassmorphic MCP styling - pinned to top */}
      <div className="sticky top-0 z-20 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-white/40 dark:border-white/10 flex items-center justify-between bg-white/75 dark:bg-neutral-900/75 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-1.5 truncate">
              Nexi <span className="font-cursive text-lg font-bold text-primary tracking-normal">AI Companion</span>
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
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleNewChat}
            aria-label="Start new conversation"
            title="Start new conversation"
            className="h-8 w-8 rounded-full bg-white/70 dark:bg-neutral-800/70 hover:bg-white dark:hover:bg-neutral-800 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-all flex items-center justify-center cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60 active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            title="Close chat (Esc)"
            className="h-8 w-8 rounded-full bg-white/70 dark:bg-neutral-800/70 hover:bg-red-500/15 dark:hover:bg-red-500/25 text-neutral-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition-all flex items-center justify-center cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60 hover:border-red-500/30 active:scale-95 shrink-0"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Conversation Area */}
      <div
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with HR assistant"
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin z-10 relative overscroll-contain"
      >
        {messages.length === 0 && (
          <div className="text-center pt-6 pb-2 px-2 space-y-4 animate-in fade-in duration-300">
            <AssistantAvatar size="lg" action="welcoming" />
            <div>
              <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Hi, I&apos;m <span className="font-cursive text-xl font-bold text-primary">Nexi</span>
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
                Your AI companion for HR policies, time off, holidays, and benefits.
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
              <AssistantAvatar size="sm" action={message.action || 'working'} />
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
            <AssistantAvatar size="sm" action="thinking" />
            <div className="rounded-2xl rounded-tl-none bg-white/80 dark:bg-neutral-850/90 border border-neutral-200/70 dark:border-neutral-700/60 px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-primary/60 rounded-full motion-safe:animate-bounce" />
                <div className="w-2 h-2 bg-primary/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-primary/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
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
            onKeyDown={handleKeyDown}
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
