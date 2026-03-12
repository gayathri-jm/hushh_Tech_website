/**
 * Hushh Agents — Code Generation Page
 * Uses Claude Opus 4.5 via GCP Vertex AI for code generation.
 * Modes: generate, debug, explain, optimize
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import HushhLogo from '../../components/images/Hushhogo.png';

/* ── Types ── */
type CodeMode = 'generate' | 'debug' | 'explain' | 'optimize';

interface CodeResult {
  code: string;
  explanation: string;
  thinking?: string;
  model: string;
}

/* ── Language options ── */
const LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', icon: 'TS' },
  { id: 'javascript', label: 'JavaScript', icon: 'JS' },
  { id: 'python', label: 'Python', icon: 'PY' },
  { id: 'react', label: 'React/JSX', icon: 'RX' },
  { id: 'sql', label: 'SQL', icon: 'SQ' },
  { id: 'html', label: 'HTML/CSS', icon: 'HT' },
  { id: 'rust', label: 'Rust', icon: 'RS' },
  { id: 'go', label: 'Go', icon: 'GO' },
];

/* ── Mode configs ── */
const MODES: { id: CodeMode; label: string; icon: string; desc: string }[] = [
  { id: 'generate', label: 'Generate', icon: 'auto_awesome', desc: 'Create new code' },
  { id: 'debug', label: 'Debug', icon: 'bug_report', desc: 'Find & fix bugs' },
  { id: 'explain', label: 'Explain', icon: 'school', desc: 'Understand code' },
  { id: 'optimize', label: 'Optimize', icon: 'speed', desc: 'Improve performance' },
];

/* ── Playfair heading ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

export default function CodePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [mode, setMode] = useState<CodeMode>('generate');
  const [result, setResult] = useState<CodeResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { redirectTo: '/hushh-agents/code' } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Generate code via Edge Function
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ibsisfnjxeowvdtvgzff.supabase.co';

      const res = await fetch(`${supabaseUrl}/functions/v1/claude-code-gen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prompt, language, mode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Code generation failed');
      }

      setResult({
        code: data.code,
        explanation: data.explanation,
        thinking: data.thinking,
        model: data.model,
      });
    } catch (err) {
      console.error('Code gen error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, language, mode, isGenerating]);

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    if (!result?.code) return;
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  // Handle keyboard shortcut (Cmd+Enter)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-purple-500/20" />
          <div className="w-32 h-4 bg-purple-500/20 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col antialiased">

      {/* ═══ Header ═══ */}
      <header className="px-4 md:px-6 py-4 flex justify-between items-center border-b border-gray-800/60 sticky top-0 bg-[#0d1117]/95 backdrop-blur-md z-50">
        <Link to="/hushh-agents" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <img src={HushhLogo} alt="Hushh" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-semibold text-sm text-white">Hushh Code</span>
            <span className="text-[9px] text-purple-400 block uppercase tracking-widest">
              Claude Opus 4.5
            </span>
          </div>
        </Link>

        <button
          onClick={() => navigate('/hushh-agents')}
          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 transition-colors text-gray-400 hover:text-white"
          aria-label="Back to Agents"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </header>

      {/* ═══ Main ═══ */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 md:px-6 py-6 gap-6">

        {/* Mode Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${mode === m.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-gray-800/40 text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700'
                }
              `}
            >
              <span className="material-symbols-outlined text-lg">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Language Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all
                ${language === lang.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-gray-800/40 text-gray-600 border border-gray-800 hover:text-gray-400'
                }
              `}
            >
              {lang.icon}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'generate' ? 'Describe what code you need...\ne.g., "Create a React hook for infinite scroll with TypeScript"'
              : mode === 'debug' ? 'Paste your buggy code here...'
              : mode === 'explain' ? 'Paste code you want explained...'
              : 'Paste code to optimize...'
            }
            className="w-full min-h-[140px] md:min-h-[160px] bg-gray-900/80 border border-gray-800 rounded-2xl p-4 md:p-5 text-sm font-mono text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
            rows={6}
          />
          
          {/* Submit Button */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-[10px] text-gray-600 hidden md:block">⌘ + Enter</span>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isGenerating
                  ? 'bg-purple-500/20 text-purple-400 cursor-wait'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    {mode === 'generate' ? 'auto_awesome' : mode === 'debug' ? 'bug_report' : mode === 'explain' ? 'school' : 'speed'}
                  </span>
                  {mode === 'generate' ? 'Generate' : mode === 'debug' ? 'Debug' : mode === 'explain' ? 'Explain' : 'Optimize'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-400 text-lg mt-0.5">error</span>
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <p className="text-xs text-red-400/60 mt-1">Please try again or check your connection.</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            
            {/* Thinking (collapsible) */}
            {result.thinking && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:text-gray-400 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">psychology</span>
                    Claude's Thinking Process
                  </span>
                  <span className="material-symbols-outlined text-lg">
                    {showThinking ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {showThinking && (
                  <div className="px-4 pb-4 border-t border-gray-800">
                    <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap leading-relaxed mt-3 max-h-60 overflow-y-auto">
                      {result.thinking}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Code Output */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Code Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{language}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Code Body */}
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {result.code}
                </pre>
              </div>
            </div>

            {/* Explanation */}
            {result.explanation && (
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 md:p-5">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">info</span>
                  Explanation
                </h3>
                <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {result.explanation}
                </div>
              </div>
            )}

            {/* Model Badge */}
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-[10px] text-gray-600">Powered by</span>
              <span className="bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-[10px] font-medium text-purple-400">
                {result.model} via Vertex AI
              </span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isGenerating && !error && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-purple-500/60">code</span>
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2" style={playfair}>
              Ready to code
            </h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Describe what you need, paste code to debug, or ask for an explanation. 
              Claude Opus 4.5 with extended thinking will help.
            </p>
          </div>
        )}
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-gray-800/60 px-4 py-4">
        <p className="text-[10px] text-gray-600 text-center">
          Hushh Code • Claude Opus 4.5 • GCP Vertex AI • Extended Thinking
        </p>
      </footer>
    </div>
  );
}
