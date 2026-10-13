import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Bot,
  X,
  Send,
  Maximize2,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  Smile,
  Pill,
} from 'lucide-react';
import { getChatMessages, sendChatMessage } from '../lib/api';
import type { ChatMessage } from '../lib/types';
import { cn } from '../lib/utils';

export default function ChatWidget() {
  const { pathname } = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('doubt');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      getChatMessages()
        .then((msgs) => setMessages(msgs))
        .catch((err) => console.error('Failed to load widget messages:', err));
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      const response = await sendChatMessage({
        message: text,
        category: selectedCategory,
      });

      setMessages((prev) => [...prev, response.user_message, response.reply_message]);
      if (response.suggested_followups && response.suggested_followups.length > 0) {
        setFollowups(response.suggested_followups);
      }
    } catch (err) {
      console.error('Failed to send widget message:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // If already on the full Chat page, do not render duplicate widget
  if (pathname === '/chat') {
    return null;
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Chat Window */}
      {isOpen && (
        <div className="glass-strong border border-slate-700/80 rounded-3xl w-[360px] sm:w-[400px] h-[520px] max-h-[85vh] flex flex-col shadow-2xl mb-3 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-100">HealthCopilot AI</h3>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400">Doubts, prescriptions & emotions</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                to="/chat"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title="Expand to full screen"
              >
                <Maximize2 size={14} />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Close chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">Need help understanding your health?</h4>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Ask any question about your medical files, dosages, or how you're feeling.
                  </p>
                </div>

                <div className="space-y-1.5 w-full pt-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('doubt');
                      handleSendMessage('Can you explain my latest lab report?');
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-white flex items-center gap-2 transition-all"
                  >
                    <HelpCircle size={13} className="text-cyan-400 shrink-0" />
                    <span className="truncate">Explain my latest lab report</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('feeling');
                      handleSendMessage('I am feeling anxious about my test results.');
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 text-[11px] text-slate-300 hover:text-white flex items-center gap-2 transition-all"
                  >
                    <Smile size={13} className="text-rose-400 shrink-0" />
                    <span className="truncate">I feel anxious about my results</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('medication');
                      handleSendMessage('Should I take my medicines with food?');
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-white flex items-center gap-2 transition-all"
                  >
                    <Pill size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">Should I take medicines with food?</span>
                  </button>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isAI = m.sender_role === 'ai';
              const isUser = m.sender_role === 'patient';
              const isDoc = m.sender_role === 'doctor';

              return (
                <div key={m.id} className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl p-3 relative text-xs leading-relaxed',
                      isUser
                        ? 'bg-gradient-to-br from-cyan-600 to-teal-700 text-white rounded-br-sm'
                        : isDoc
                        ? 'bg-indigo-950/60 border border-indigo-500/40 text-slate-100 rounded-bl-sm'
                        : 'glass border border-slate-800 text-slate-200 rounded-bl-sm'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-[10px]">
                      <span className="font-bold">{isAI ? 'HealthCopilot' : m.sender_name}</span>
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="whitespace-pre-line">{m.message}</div>

                    {isAI && (
                      <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => handleToggleSpeak(m.id, m.message)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Listen"
                        >
                          {isSpeaking === m.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                        <button
                          onClick={() => handleCopy(m.id, m.message)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Copy"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 glass p-2 rounded-xl text-slate-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Thinking...</span>
              </div>
            )}

            {followups.length > 0 && !isSending && (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] text-slate-500 font-semibold">Suggested:</p>
                <div className="flex flex-wrap gap-1">
                  {followups.slice(0, 2).map((f, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(f)}
                      className="text-[10px] glass px-2 py-1 rounded-lg border border-slate-800 hover:border-cyan-500/40 text-cyan-300 truncate max-w-full text-left"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about symptoms, doubts..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className={cn(
                  'p-2 rounded-xl transition-all',
                  inputText.trim() && !isSending
                    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                )}
              >
                <Send size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck size={10} className="text-teal-400" />
                AI Health Support
              </span>
              <Link to="/chat" className="text-cyan-400 hover:underline">
                Open Full Chat →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500 text-slate-950 font-bold shadow-xl shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all duration-200"
        title="Open HealthCopilot AI Companion"
      >
        <span className="relative flex items-center justify-center">
          <Bot size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
        </span>
        <span className="hidden sm:inline text-xs font-extrabold tracking-tight">
          Ask Health Copilot
        </span>
      </button>
    </div>
  );
}
