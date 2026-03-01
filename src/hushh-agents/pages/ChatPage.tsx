/**
 * Hushh Agents — Chat Page
 * Clean, modern chat interface matching the design system.
 * Desktop-optimized with sidebar for conversation controls.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HushhLogo from '../../components/images/Hushhogo.png';
import { useAuth } from '../hooks/useAuth';
import { useChatPersistence, type PersistedMessage } from '../hooks/useChatPersistence';
import { 
  sendChatMessage, 
  createUserMessage, 
  createAssistantMessage 
} from '../services/hushhIntelligenceService';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from '../core/constants';
import type { ChatMessage, SupportedLanguage } from '../core/types';

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

export default function ChatPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  
  const persistence = useChatPersistence('hushh');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // On mount: restore latest session or create new one
  useEffect(() => {
    const latest = persistence.getLatestSession();
    if (latest && latest.messages.length > 0) {
      const restored: ChatMessage[] = latest.messages.map((m) => ({
        id: m.id,
        conversationId: latest.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: new Date(m.timestamp),
      }));
      setMessages(restored);
      setSessionId(latest.id);
    } else {
      setSessionId(persistence.createSession());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-save messages to localStorage
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      const persisted: PersistedMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.createdAt instanceof Date ? m.createdAt.getTime() : Number(m.createdAt),
      }));
      persistence.saveSession(sessionId, persisted);
    }
  }, [messages, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { redirectTo: '/hushh-agents/chat' } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Handle send message
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;
    
    setError(null);
    
    // Add user message
    const userMessage = createUserMessage(text);
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    
    // Focus back on input
    inputRef.current?.focus();
    
    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      // Send to Hushh Intelligence
      const response = await sendChatMessage({
        message: text,
        history,
        language: selectedLanguage,
        agentId: 'hushh',
      });
      
      if (response.success) {
        const assistantMessage = createAssistantMessage(response.message);
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(response.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // New conversation (preserves old in history)
  const handleClearChat = () => {
    const newId = persistence.createSession();
    setSessionId(newId);
    setMessages([]);
    setError(null);
    setShowHistory(false);
  };

  // Load a past session
  const handleLoadSession = (id: string) => {
    const session = persistence.getSession(id);
    if (session) {
      const restored: ChatMessage[] = session.messages.map((m) => ({
        id: m.id,
        conversationId: session.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: new Date(m.timestamp),
      }));
      setSessionId(session.id);
      setMessages(restored);
      setError(null);
    }
    setShowHistory(false);
  };

  // Delete a session
  const handleDeleteSession = (id: string) => {
    persistence.deleteSession(id);
    if (id === sessionId) {
      const newId = persistence.createSession();
      setSessionId(newId);
      setMessages([]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100" />
          <div className="w-32 h-4 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      
      {/* ═══ Custom Chat Header ═══ */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <button
          onClick={() => navigate('/hushh-agents')}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-gray-600 text-lg">arrow_back</span>
        </button>
        
        <Link to="/hushh-agents" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ios-dark flex items-center justify-center">
            <img src={HushhLogo} alt="Hushh" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-semibold text-sm">Hushh Agents</span>
        </Link>
        
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Chat history"
          title="Past conversations"
        >
          <span className="material-symbols-outlined text-gray-600 text-lg">history</span>
        </button>
      </header>

      {/* ═══ History Sidebar Overlay ═══ */}
      {showHistory && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setShowHistory(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-80 md:w-96 bg-white border-l border-gray-200 z-[70] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-gray-500">history</span>
                Chat History
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {persistence.getSessions().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <span className="material-symbols-outlined text-3xl text-gray-300 mb-3">chat_bubble_outline</span>
                  <p className="text-sm text-gray-400">No past conversations yet</p>
                  <p className="text-xs text-gray-300 mt-1">Your chats will appear here</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {persistence.getSessions().map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        session.id === sessionId
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleLoadSession(session.id)}
                    >
                      <span className="material-symbols-outlined text-sm text-gray-400 mt-0.5 shrink-0">
                        {session.id === sessionId ? 'radio_button_checked' : 'chat'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate font-medium">{session.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {session.messages.length} msgs · {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all shrink-0"
                        aria-label="Delete session"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={handleClearChat}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                New Conversation
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Main Chat Area ═══ */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 md:px-6">
        
        {/* ── Chat Header Bar ── */}
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ios-dark flex items-center justify-center">
              <img src={HushhLogo} alt="Hushh" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-medium">Hushh</h2>
              <span className="text-[10px] text-ios-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-ios-green rounded-full" />
                Online
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
              className="text-xs bg-ios-gray-bg border border-gray-200/60 rounded-lg px-3 py-2 focus:outline-none focus:border-hushh-blue/50"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            
            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto py-6 min-h-[400px] max-h-[calc(100vh-300px)]">
          {messages.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-ios-dark flex items-center justify-center mb-6">
                <img src={HushhLogo} alt="Hushh" className="w-14 h-14 object-contain" />
              </div>
              <h2 
                className="text-2xl md:text-3xl font-normal text-black tracking-tight font-serif mb-3"
                style={playfair}
              >
                Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h2>
              <p className="text-gray-500 text-sm font-light max-w-md leading-relaxed">
                I'm Hushh, your AI assistant. Ask me anything — I can help with questions, 
                analysis, writing, coding, and more.
              </p>
              
              {/* Quick Prompts */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  'Explain quantum computing',
                  'Write a poem about AI',
                  'Help me with Python code',
                  'मुझे हिंदी में बताओ',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputText(prompt)}
                    className="text-xs px-4 py-2 bg-ios-gray-bg border border-gray-200/60 rounded-full text-gray-600 hover:border-hushh-blue/30 hover:text-hushh-blue transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages list
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] ${
                      message.role === 'user'
                        ? 'bg-ios-dark text-white rounded-2xl rounded-br-md px-4 py-3'
                        : 'bg-ios-gray-bg text-gray-900 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200/60'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200/40">
                        <div className="w-5 h-5 rounded-md bg-ios-dark flex items-center justify-center">
                          <img src={HushhLogo} alt="" className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          Hushh
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <span className={`text-[9px] mt-2 block ${
                      message.role === 'user' ? 'text-white/50' : 'text-gray-400'
                    }`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-ios-gray-bg rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200/60">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-ios-dark flex items-center justify-center">
                        <img src={HushhLogo} alt="" className="w-3 h-3" />
                      </div>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 mb-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* ── Input Area ── */}
        <div className="py-4 border-t border-gray-100">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedLanguage === 'hi-IN' 
                    ? 'अपना संदेश लिखें...'
                    : selectedLanguage === 'ta-IN'
                    ? 'உங்கள் செய்தியை எழுதுங்கள்...'
                    : 'Type your message...'
                }
                rows={1}
                className="w-full bg-ios-gray-bg border border-gray-200/60 rounded-2xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:border-hushh-blue/50 transition-colors"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={isTyping}
              />
              
              {/* Voice button (placeholder for future) */}
              <button
                className="absolute right-3 bottom-3 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
                title="Voice input (coming soon)"
              >
                <span className="material-symbols-outlined text-sm">mic</span>
              </button>
            </div>
            
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isTyping}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                inputText.trim() && !isTyping
                  ? 'bg-ios-dark text-white hover:bg-black'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined">
                {isTyping ? 'more_horiz' : 'send'}
              </span>
            </button>
          </div>
          
          {/* Powered by badge */}
          <div className="flex justify-center mt-4">
            <span className="text-[9px] text-gray-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">lock</span>
              Powered by Hushh Intelligence • No data stored
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
