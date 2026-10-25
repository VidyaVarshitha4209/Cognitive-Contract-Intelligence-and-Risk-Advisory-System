import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  FileText,
  User,
  Bot,
  Trash2,
  HelpCircle,
  Bookmark,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { contractsAPI, chatAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SUGGESTED_QUESTIONS = [
  'What are the payment terms and invoice due dates?',
  'What is the required notice period for termination?',
  'Does this contract contain an automatic renewal clause?',
  'What are the major liabilities and indemnification risks?',
  'Which clauses fail to comply with company policies?',
  'What governing law and jurisdiction apply to disputes?'
];

const AIChatbot = () => {
  const [searchParams] = useSearchParams();
  const urlContractId = searchParams.get('contractId');

  const [contracts, setContracts] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState(urlContractId || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Load contracts
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const data = await contractsAPI.list();
        setContracts(data);
        if (!selectedContractId && data.length > 0) {
          setSelectedContractId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load contracts:', err);
      }
    };
    fetchContracts();
  }, []);

  // Load chat history when selected contract changes
  useEffect(() => {
    if (!selectedContractId) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const historyData = await chatAPI.getHistory(selectedContractId);
        setMessages(historyData.messages || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedContractId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || !selectedContractId) return;

    setInput('');
    // Optimistic user message
    const tempUserMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      source_references: [],
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setSending(true);
    try {
      const response = await chatAPI.ask(selectedContractId, query);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'An error occurred while communicating with the advisory engine. Please verify the contract is analyzed.',
          source_references: [],
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedContractId) return;
    if (!window.confirm('Clear conversation history for this contract?')) return;
    try {
      await chatAPI.clearHistory(selectedContractId);
      setMessages([]);
    } catch (err) {
      alert('Failed to clear chat history.');
    }
  };

  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Cognitive Contract RAG Assistant</h1>
            <p className="text-[11px] text-slate-500">Ask natural language questions grounded strictly in contract clauses.</p>
          </div>
        </div>

        {/* Contract Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 max-w-[260px] truncate"
            >
              {contracts.length === 0 && <option value="">No contracts uploaded</option>}
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.filename}
                </option>
              ))}
            </select>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear History"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {loadingHistory ? (
            <LoadingSpinner size="md" text="Loading Conversation..." />
          ) : messages.length > 0 ? (
            messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none shadow-sm space-y-3'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Grounded Source Citations */}
                  {msg.source_references && msg.source_references.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        <span>Source Citations (Grounded Excerpts):</span>
                      </span>
                      <div className="space-y-1.5">
                        {msg.source_references.map((src, i) => (
                          <div
                            key={i}
                            className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-700">
                              <span className="uppercase text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {src.clause_category}
                              </span>
                              <span>Page {src.page_number}</span>
                            </div>
                            <p className="italic text-slate-500 line-clamp-2">"{src.snippet}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Ask Anything About{' '}
                  <span className="text-purple-600">{selectedContract?.filename || 'the Contract'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Every answer is strictly retrieved and cited from the contract clauses and verified against corporate policies.
                </p>
              </div>

              {/* Sample question pills */}
              <div className="w-full max-w-xl pt-2 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suggested Prompts:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs text-slate-700 font-medium transition text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-none p-3.5 text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                <span>Retrieving semantic chunks and synthesizing grounded answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                selectedContractId
                  ? `Ask a question about ${selectedContract?.filename || 'this contract'}...`
                  : 'Please select a contract above to begin asking questions...'
              }
              disabled={!selectedContractId || sending}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || !selectedContractId || sending}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
