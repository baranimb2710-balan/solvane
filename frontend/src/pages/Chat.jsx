import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { sendChatMessage } from '../services/api';

const SUGGESTIONS = [
  'What are the Ramanathaswamy Temple timings?',
  'How do I reach Dhanushkodi safely?',
  'What are the must-try local foods?',
  'Can you suggest places for a 2-day budget trip?',
];

export default function Chat() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('solvane_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Persist messages across page navigation in current session
  useEffect(() => {
    try {
      sessionStorage.setItem('solvane_chat_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat to sessionStorage:', e);
    }
  }, [messages]);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClearChat = () => {
    setMessages([]);
    setErrorBanner(null);
    setLastFailedMessage(null);
    try {
      sessionStorage.removeItem('solvane_chat_messages');
    } catch {}
    inputRef.current?.focus();
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend !== null ? textToSend : input).trim();
    if (!text || loading) return;

    if (text.length > 500) {
      setErrorBanner('Please keep your question under 500 characters.');
      return;
    }

    // Add user message immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (textToSend === null) {
      setInput('');
    }
    setErrorBanner(null);
    setLastFailedMessage(null);
    setLoading(true);

    // Retrieve active trip from localStorage ("solvane_trip")
    let currentTrip = null;
    try {
      const tripRaw = localStorage.getItem('solvane_trip');
      if (tripRaw) {
        currentTrip = JSON.parse(tripRaw);
      }
    } catch (e) {
      console.warn('Could not read solvane_trip from localStorage:', e);
    }

    // Format conversation history (up to last 8 messages)
    const historyPayload = messages.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    // Send to backend
    const res = await sendChatMessage({
      message: text,
      history: historyPayload,
      trip: currentTrip,
    });

    setLoading(false);

    if (res.success && res.data) {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
        sources: res.data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      setLastFailedMessage(text);
      setErrorBanner(
        res.error || 'Failed to get an answer from Solvane. Please check your connection and try again.'
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Simple formatter for assistant responses (handles basic bolding & newlines)
  const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      // Parse markdown-style **bold**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={idx} className="block min-h-[1.25rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-amber-200">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* TopBar with active 'chat' */}
      <TopBar active="chat" />

      {/* Main Chat Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col px-3 sm:px-6 py-4 relative">
        {/* Chat Header Actions */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-orange-500/30">
              ✨
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                Ask Solvane
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  AI Tourist Guide
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Verified travel facts, temple rules, Dhanushkodi safety & local dining
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Clear chat</span>
            </button>
          )}
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Empty State / Welcome Screen */}
          {messages.length === 0 && (
            <div className="my-auto py-10 px-4 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-orange-400 p-0.5 shadow-xl shadow-sky-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
                  ✨
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                Vanakkam! I'm Solvane
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Your local AI travel companion for Ramanathapuram district. Ask me anything about temple darshan timings, Dhanushkodi safety, budget recommendations, or authentic eateries!
              </p>

              {/* Quick suggestion chips */}
              <div className="space-y-2 text-left">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 text-center mb-3">
                  Suggested Questions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="w-full text-left p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-orange-400/40 text-xs sm:text-sm text-slate-200 hover:text-white transition-all flex items-center justify-between group cursor-pointer shadow-sm"
                    >
                      <span>{suggestion}</span>
                      <span className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-xs font-black text-slate-950 shrink-0 mt-0.5 shadow-md shadow-orange-500/20">
                    ✨
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`relative text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-md shadow-orange-500/20'
                      : 'bg-slate-900/90 border border-white/10 text-slate-100 rounded-2xl rounded-tl-xs px-4 py-3 max-w-[90%] sm:max-w-[82%] shadow-lg'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{renderFormattedText(msg.content)}</div>

                  {/* Sources Chips for Assistant Answers */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <span>Verified Sources:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => {
                          if (src.type === 'place') {
                            return (
                              <Link
                                key={sIdx}
                                to={`/place/${src.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 transition-colors"
                              >
                                <span>🏛️</span>
                                <span>{src.name}</span>
                                <span className="text-[9px] text-sky-400">↗</span>
                              </Link>
                            );
                          }
                          // For hotels and food spots without dedicated route pages, link to Google Maps
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${src.name} Rameswaram Ramanathapuram`
                          )}`;
                          const icon = src.type === 'hotel' ? '🏨' : '🍽️';
                          return (
                            <a
                              key={sIdx}
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 transition-colors"
                            >
                              <span>{icon}</span>
                              <span>{src.name}</span>
                              <span className="text-[9px] text-amber-400">↗</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Message Timestamp */}
                  <div
                    className={`text-[9px] mt-1.5 ${
                      isUser ? 'text-amber-100/70 text-right' : 'text-slate-400 text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0 mt-0.5">
                    👤
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-xs font-black text-slate-950 shrink-0 mt-0.5">
                ✨
              </div>
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl rounded-tl-xs px-4 py-3 shadow-lg flex items-center gap-2">
                <span className="text-xs text-slate-300">Solvane is thinking</span>
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {errorBanner && (
            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorBanner}</span>
              </div>
              {lastFailedMessage && (
                <button
                  onClick={() => handleSendMessage(lastFailedMessage)}
                  className="px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/40 font-semibold cursor-pointer transition-colors whitespace-nowrap"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask about temple timings, Dhanushkodi, local food..."
              className="w-full pl-4 pr-24 py-3 rounded-2xl bg-slate-900 border border-white/15 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all shadow-lg disabled:opacity-50"
            />

            {/* Character counter & Send button */}
            <div className="absolute right-2 flex items-center gap-2">
              {input.length > 400 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {input.length}/500
                </span>
              )}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !loading
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-slate-400">
            <span>Press Enter to send</span>
            <span>Ramanathapuram AI Guide • Solvane</span>
          </div>
        </div>
      </div>
    </div>
  );
}
