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
        <div className="bg-white border border-slate-200 rounded-3xl w-[360px] sm:w-[400px] h-[520px] max-h-[85vh] flex flex-col shadow-2xl mb-3 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900">MED DEV COPILOT</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Empathetic health assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                to="/chat"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                title="Expand to full screen"
              >
                <Maximize2 size={14} />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                title="Close chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-slate-50/40">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Need help with your records?</h4>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Ask questions about your prescriptions, test biomarkers, or clinical terms.
                  </p>
                </div>

                <div className="space-y-1.5 w-full pt-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('doubt');
                      handleSendMessage('Can you explain my latest lab report?');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-[11px] text-slate-800 font-medium flex items-center gap-2 transition-all shadow-2xs"
                  >
                    <HelpCircle size={13} className="text-blue-600 shrink-0" />
                    <span className="truncate">Explain my latest lab report</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('feeling');
                      handleSendMessage('I am feeling anxious about my test results.');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-[11px] text-slate-800 font-medium flex items-center gap-2 transition-all shadow-2xs"
                  >
                    <Smile size={13} className="text-rose-500 shrink-0" />
                    <span className="truncate">I feel anxious about my results</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('medication');
                      handleSendMessage('Should I take my medicines with food?');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-[11px] text-slate-800 font-medium flex items-center gap-2 transition-all shadow-2xs"
                  >
                    <Pill size={13} className="text-amber-500 shrink-0" />
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
                      'max-w-[88%] rounded-2xl p-3 relative text-xs leading-relaxed shadow-xs',
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                        : isDoc
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-bl-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 opacity-80 text-[10px]">
                      <span className="font-bold">{isAI ? 'MED DEV COPILOT' : m.sender_name}</span>
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="whitespace-pre-line">{m.message}</div>

                    {isAI && (
                      <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => handleToggleSpeak(m.id, m.message)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
                          title="Listen"
                        >
                          {isSpeaking === m.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                        <button
                          onClick={() => handleCopy(m.id, m.message)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
                          title="Copy"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl text-slate-600 text-xs shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="font-medium">Thinking...</span>
              </div>
            )}

            {followups.length > 0 && !isSending && (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Suggested follow-ups:</p>
                <div className="flex flex-wrap gap-1">
                  {followups.slice(0, 2).map((f, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(f)}
                      className="text-[10px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-300 text-blue-700 truncate max-w-full text-left font-medium shadow-2xs"
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
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about symptoms, medications, doubts..."
                className="flex-1 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-100 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className={cn(
                  'p-2 rounded-xl transition-all shadow-xs',
                  inputText.trim() && !isSending
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                <Send size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck size={11} className="text-blue-600" />
                Empathetic Health Support
              </span>
              <Link to="/chat" className="text-blue-600 hover:underline font-semibold">
                Open Full Chat →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:scale-102 active:scale-98 transition-all duration-200"
        title="Open MED DEV COPILOT"
      >
        <span className="relative flex items-center justify-center">
          <Bot size={20} className="group-hover:rotate-6 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-600 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-600" />
        </span>
        <span className="hidden sm:inline text-xs font-bold tracking-tight">
          Ask MED DEV COPILOT
        </span>
      </button>
    </div>
  );
}
