import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Stethoscope,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  HeartHandshake,
  Pill,
  HelpCircle,
  Smile,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import {
  getChatMessages,
  sendChatMessage,
  doctorReplyChat,
  clearChatMessages,
  getDoctorPatients,
} from '../lib/api';
import type { ChatMessage, DoctorPatientSummary } from '../lib/types';
import { cn } from '../lib/utils';

const SUGGESTED_QUESTIONS = [
  {
    text: 'Can you explain my lab results in simple terms?',
    category: 'doubt',
    icon: HelpCircle,
  },
  {
    text: 'I feel very anxious about my current symptoms.',
    category: 'feeling',
    icon: Smile,
  },
  {
    text: 'Should I take my medicines before or after food?',
    category: 'medication',
    icon: Pill,
  },
  {
    text: 'What questions should I write down for my doctor?',
    category: 'general',
    icon: Stethoscope,
  },
];

const CATEGORIES = [
  { id: 'doubt', label: 'Medical Doubt', icon: HelpCircle, color: 'text-amber-800 bg-amber-50 border-amber-300' },
  { id: 'feeling', label: 'Feelings & Anxiety', icon: Smile, color: 'text-rose-800 bg-rose-50 border-rose-300' },
  { id: 'medication', label: 'Medications', icon: Pill, color: 'text-blue-800 bg-blue-50 border-blue-300' },
  { id: 'general', label: 'General Health', icon: HeartHandshake, color: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
];

export default function Chat() {
  const session = useAppStore((s) => s.session);
  const isDoctor = session.role === 'doctor';

  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('doubt');
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);

  // Doctor-specific state
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [activePatientId, setActivePatientId] = useState<string>(initialPatientId);
  const [doctorMode, setDoctorMode] = useState<'ai' | 'doctor_direct'>('ai');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Load patients for doctor view
  useEffect(() => {
    if (isDoctor) {
      getDoctorPatients()
        .then((pts) => {
          setPatients(pts);
          if (!activePatientId && pts.length > 0) {
            setActivePatientId(pts[0].id);
          }
        })
        .catch((err) => console.error('Failed to load patients for doctor chat:', err));
    }
  }, [isDoctor, activePatientId]);

  // Load chat messages
  const loadMessages = async () => {
    setLoading(true);
    try {
      const targetId = isDoctor ? activePatientId : undefined;
      const msgs = await getChatMessages(targetId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatientId]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Speech synthesis for accessibility
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    setIsSpeaking(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      if (isDoctor && doctorMode === 'doctor_direct') {
        // Direct reply from clinician to patient
        const docMsg = await doctorReplyChat({
          patient_id: activePatientId || 'demo-guest',
          message: text,
          doctor_name: session.name || 'Dr. Clinician',
          category: selectedCategory,
        });
        setMessages((prev) => [...prev, docMsg]);
      } else {
        // Send to AI Health Companion
        const response = await sendChatMessage({
          message: text,
          category: selectedCategory,
          doctor_id: isDoctor ? session.id : undefined,
        });

        setMessages((prev) => [...prev, response.user_message, response.reply_message]);
        if (response.suggested_followups && response.suggested_followups.length > 0) {
          setFollowups(response.suggested_followups);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your conversation history?')) return;
    try {
      const targetId = isDoctor ? activePatientId : undefined;
      await clearChatMessages(targetId);
      setMessages([]);
      setFollowups([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activePatient = patients.find((p) => p.id === activePatientId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-5rem)] flex flex-col gap-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
            <Bot size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                Carefolio Health Companion
                <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Gemini 2.5 Flash
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isDoctor
                ? 'Clinical consultations, doubt clarification, and patient direct-reply station'
                : 'Empathetic medical doubts, symptoms, prescription guidance, and emotional support'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Doctor Patient Selector */}
          {isDoctor && patients.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Users size={14} className="text-blue-600" />
              <select
                value={activePatientId}
                onChange={(e) => setActivePatientId(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-slate-900">
                    Patient: {p.name || 'Anonymous'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear history button */}
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-50 border border-slate-200 bg-white shadow-xs transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>

          {isDoctor ? (
            <Link
              to="/doctor"
              className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-all font-bold"
            >
              <ArrowLeft size={13} />
              <span>Doctor Station</span>
            </Link>
          ) : (
            <Link
              to="/drive"
              className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-all font-bold"
            >
              <span>My DigiLocker</span>
              <ChevronRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* Main Conversation Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 flex-1 flex flex-col overflow-hidden shadow-xs relative">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Welcome Card if no messages */}
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 py-8">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                <Sparkles size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {isDoctor
                    ? `Hello ${session.name}, how can Copilot assist you?`
                    : `Hello ${session.name || 'there'}, how are you feeling today?`}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                  {isDoctor
                    ? 'Review clinical doubts, generate diagnostic summaries, or write direct patient guidance.'
                    : 'Ask anything about your medical documents, lab tests, prescriptions, or share any emotional stress you are experiencing.'}
                </p>
              </div>

              {/* Suggested Questions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
                {SUGGESTED_QUESTIONS.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCategory(q.category);
                        handleSendMessage(q.text);
                      }}
                      className="bg-slate-50/80 text-left p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 transition-all group flex items-start gap-3 shadow-xs"
                    >
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors shrink-0">
                        <Icon size={16} />
                      </div>
                      <span className="text-xs text-slate-800 font-semibold group-hover:text-blue-900 leading-snug">
                        {q.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Safety banner */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-medium">
                <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                <span>
                  Private & Secure • For educational & emotional support • Always follow your physician's clinical advice
                </span>
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((m) => {
            const isAI = m.sender_role === 'ai';
            const isUser = m.sender_role === 'patient';
            const isDoc = m.sender_role === 'doctor';

            return (
              <div
                key={m.id}
                className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 relative transition-all text-sm leading-relaxed',
                    isUser
                      ? 'bg-blue-600 text-white shadow-xs rounded-br-xs'
                      : isDoc
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 shadow-xs rounded-bl-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-850 shadow-xs rounded-bl-xs'
                  )}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-black/5 text-xs">
                    <div className="flex items-center gap-2">
                      {isAI && (
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <Bot size={13} />
                        </div>
                      )}
                      {isDoc && (
                        <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          <Stethoscope size={13} />
                        </div>
                      )}
                      {isUser && (
                        <div className="w-5 h-5 rounded-md bg-white/20 text-white flex items-center justify-center font-bold">
                          <User size={13} />
                        </div>
                      )}
                      <span className="font-extrabold tracking-tight">
                        {isAI ? 'Carefolio AI' : m.sender_name}
                      </span>
                      {isDoc && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded border border-indigo-200 font-bold">
                          Verified Clinician
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] opacity-75 font-medium">
                      {m.category && (
                        <span className="uppercase text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5">
                          {m.category}
                        </span>
                      )}
                      <span>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className={cn(
                    'whitespace-pre-line text-xs sm:text-sm font-normal leading-relaxed',
                    isUser ? 'text-white' : 'text-slate-800'
                  )}>
                    {m.message}
                  </div>

                  {/* Actions for AI messages (Speech & Copy) */}
                  {isAI && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
                      <button
                        onClick={() => handleToggleSpeak(m.id, m.message)}
                        className={cn(
                          'p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors flex items-center gap-1 text-[11px] font-medium',
                          isSpeaking === m.id ? 'text-blue-700 bg-blue-100' : 'text-slate-500 hover:text-slate-800'
                        )}
                        title={isSpeaking === m.id ? 'Stop Voice' : 'Listen to Explanation'}
                      >
                        {isSpeaking === m.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        <span>{isSpeaking === m.id ? 'Stop' : 'Listen'}</span>
                      </button>

                      <button
                        onClick={() => handleCopy(m.id, m.message)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-[11px] font-medium"
                        title="Copy to Clipboard"
                      >
                        {copiedId === m.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex items-start gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Bot size={13} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500 font-semibold">Carefolio is thinking...</span>
              </div>
            </div>
          )}

          {/* Follow-up question chips */}
          {followups.length > 0 && !isSending && (
            <div className="space-y-1.5 pt-2">
              <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles size={12} className="text-blue-600" /> Suggested Follow-ups:
              </p>
              <div className="flex flex-wrap gap-2">
                {followups.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(f)}
                    className="text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold transition-all shadow-xs"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Section */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
          {/* Category Switcher & Role Mode */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-bold mr-1">Topic:</span>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all font-bold',
                      active ? cat.color : 'text-slate-600 border-slate-200 hover:bg-slate-100 bg-white'
                    )}
                  >
                    <Icon size={12} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* If Doctor, allow toggling AI Copilot vs Direct Reply */}
            {isDoctor && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDoctorMode('ai')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-bold transition-all',
                    doctorMode === 'ai' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  )}
                >
                  Consult AI
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorMode('doctor_direct')}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-bold transition-all',
                    doctorMode === 'doctor_direct' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                  )}
                >
                  Reply as Doctor
                </button>
              </div>
            )}
          </div>

          {/* Text Area & Send Action */}
          <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-blue-600 focus-within:bg-white p-2 transition-all">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isDoctor && doctorMode === 'doctor_direct'
                  ? `Write a clinical reply directly to ${activePatient?.name || 'patient'}...`
                  : 'Ask a medical doubt, prescription question, or how you are feeling...'
              }
              rows={1}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none max-h-32 min-h-[38px] py-1.5 px-2 font-sans"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className={cn(
                'p-2.5 rounded-xl font-bold transition-all shrink-0 flex items-center justify-center',
                inputText.trim() && !isSending
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
              title="Send message (Enter)"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="flex items-center gap-1 text-slate-500">
              <AlertCircle size={11} className="text-amber-500" />
              Not for life-threatening emergencies (call 112 / 911)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
