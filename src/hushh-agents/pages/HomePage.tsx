/**
 * Hushh Agents — Home Page
 * 
 * Follows KYC onboarding UI patterns with Apple primary bright colors.
 * HushhTechHeader, max-w-md centered layout, Playfair headings.
 */
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HushhTechCta, { HushhTechCtaVariant } from '../../components/hushh-tech-cta/HushhTechCta';
import { useAuth } from '../hooks/useAuth';
import HushhLogo from '../../components/images/Hushhogo.png';

const playfair = { fontFamily: "'Playfair Display', serif" };

/* Apple system colors */
const APPLE = {
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  purple: '#AF52DE',
  teal: '#5AC8FA',
  indigo: '#5856D6',
  pink: '#FF2D55',
};

/** Agent card — clean bordered card matching KYC style */
const AgentNudge = ({
  title,
  subtitle,
  description,
  icon,
  color,
  badge,
  badgeColor,
  chips,
  onClick,
}: {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  badge: string;
  badgeColor: string;
  chips: string[];
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="text-left w-full border border-gray-200/60 rounded-2xl p-5 transition-all active:scale-[0.98] hover:border-gray-300 bg-white"
    aria-label={title}
  >
    <div className="flex items-start gap-3.5">
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}12` }}
      >
        <span className="material-symbols-outlined text-[24px]" style={{ color }}>
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.15em] font-medium">
              {subtitle}
            </p>
            <h3 className="text-[15px] font-semibold text-gray-900 leading-tight" style={playfair}>
              {title}
            </h3>
          </div>
          <span
            className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{
              backgroundColor: `${badgeColor}15`,
              color: badgeColor,
            }}
          >
            {badge}
          </span>
        </div>

        <p className="text-[12px] text-gray-500 font-light leading-relaxed mt-1.5">
          {description}
        </p>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {chips.map((chip) => (
            <span
              key={chip}
              className="px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-medium text-gray-500"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Chevron */}
      <span className="material-symbols-outlined text-gray-300 text-[18px] shrink-0 mt-1">
        chevron_right
      </span>
    </div>
  </button>
);

export default function AgentsHomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { redirectTo: '/hushh-agents' } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !mounted) {
    return (
      <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse mb-3" />
        <p className="text-[13px] text-gray-400 font-light">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-blue-500 selection:text-white">

      {/* ═══ Header — matches KYC sticky header ═══ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <Link to="/hushh-agents" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
            <img src={HushhLogo} alt="Hushh" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-gray-900 block leading-tight">Hushh Agents</span>
            <span className="text-[9px] uppercase tracking-[0.2em] font-medium" style={{ color: APPLE.blue }}>
              AI Platform
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user?.name && (
            <span className="text-[11px] text-gray-400 hidden md:block font-light">
              {user.name.split(' ')[0]}
            </span>
          )}
          <button
            onClick={signOut}
            className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px] text-gray-400">logout</span>
          </button>
        </div>
      </header>

      {/* ═══ Main Content ═══ */}
      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-48">

        {/* ── Hero ── */}
        <section className="pt-8 pb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2 font-medium">
            Your AI Companions
          </p>
          <h1
            className="text-[2rem] leading-[1.1] font-normal text-black tracking-tight font-serif"
            style={playfair}
          >
            Meet Your <br />
            <span className="text-gray-400 italic font-light">Agents.</span>
          </h1>
          <p className="text-gray-500 text-[13px] font-light mt-3 leading-relaxed">
            Intelligent assistants powered by GCP AI. Chat in English, Hindi, or Tamil.
          </p>
        </section>

        {/* ── Primary Agents ── */}
        <section className="pb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3 font-medium">
            Available Agents
          </p>
          <div className="space-y-3">
            {/* Kirkland Agents Directory — Priority */}
            <AgentNudge
              title="Kirkland Agents"
              subtitle="Local Directory · 771 Agents"
              description="Browse and discover local agents. Search by name, category, or location. View ratings and get directions."
              icon="location_city"
              color={APPLE.indigo}
              badge="Live"
              badgeColor={APPLE.blue}
              chips={['Search', 'Filter', 'Ratings', 'Directions']}
              onClick={() => navigate('/hushh-agents/kirkland')}
            />

            {/* Hushh Chat Agent */}
            <AgentNudge
              title="Hushh"
              subtitle="Primary Agent"
              description="Your intelligent AI companion. Ask questions, get analysis, creative writing, coding help, and more."
              icon="smart_toy"
              color={APPLE.blue}
              badge="Online"
              badgeColor={APPLE.green}
              chips={['Multi-language', 'Voice', 'Code', 'Analysis']}
              onClick={() => navigate('/hushh-agents/chat')}
            />

            {/* Tamil Voice Agent */}
            <AgentNudge
              title="தமிழ் குரல்"
              subtitle="Voice Agent · Gemini Live"
              description="Speak in Tamil, get responses in Tamil. Real-time voice conversations powered by Google's most advanced AI."
              icon="record_voice_over"
              color={APPLE.orange}
              badge="New"
              badgeColor={APPLE.orange}
              chips={['Real-time', 'Native Tamil', 'Low Latency', 'No Typing']}
              onClick={() => navigate('/hushh-agents/voice?lang=ta-IN')}
            />

            {/* Code Agent */}
            <AgentNudge
              title="Hushh Code"
              subtitle="Code Agent · Extended Thinking"
              description="AI-powered code generation, debugging, explanation, and optimization with step-by-step reasoning."
              icon="terminal"
              color={APPLE.purple}
              badge="Online"
              badgeColor={APPLE.green}
              chips={['Generate', 'Debug', 'Explain', 'TS · PY · GO']}
              onClick={() => navigate('/hushh-agents/code')}
            />
          </div>
        </section>

        {/* ── Capabilities Grid ── */}
        <section className="pb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3 font-medium">
            Capabilities
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'chat', label: 'Chat', desc: 'Natural conversations', color: APPLE.blue },
              { icon: 'translate', label: 'Languages', desc: 'EN · HI · TA', color: APPLE.green },
              { icon: 'mic', label: 'Voice', desc: 'Speak naturally', color: APPLE.orange },
              { icon: 'code', label: 'Code', desc: 'Programming help', color: APPLE.purple },
            ].map((item) => (
              <div
                key={item.icon}
                className="border border-gray-200/60 rounded-2xl p-4 bg-white"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5"
                  style={{ backgroundColor: `${item.color}12` }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: item.color }}>
                    {item.icon}
                  </span>
                </div>
                <h5 className="text-[13px] font-medium text-gray-900">{item.label}</h5>
                <p className="text-[10px] text-gray-400 font-light mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Coming Soon ── */}
        <section className="pb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-3 font-medium">
            Coming Soon
          </p>
          <div className="space-y-3">
            {[
              { name: 'Kai', desc: 'Investment analysis & market insights', icon: 'trending_up', color: APPLE.teal },
              { name: 'Luna', desc: 'Document processing & summaries', icon: 'description', color: APPLE.pink },
            ].map((agent) => (
              <div
                key={agent.name}
                className="border border-gray-200/60 rounded-2xl p-4 flex items-center gap-3.5 opacity-50"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${agent.color}12` }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: agent.color }}>
                    {agent.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
                    {agent.name}
                    <span className="text-[8px] uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full text-gray-400 font-bold">
                      Soon
                    </span>
                  </h5>
                  <p className="text-[11px] text-gray-400 font-light mt-0.5">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Primary CTA ── */}
        <section className="pb-8">
          <HushhTechCta
            onClick={() => navigate('/hushh-agents/chat')}
            variant={HushhTechCtaVariant.BLACK}
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Start Chatting with Hushh
          </HushhTechCta>
        </section>

        {/* ── Trust Footer ── */}
        <section className="pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[14px]" style={{ color: APPLE.blue }}>
              lock
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
              Secure · Private · No Data Stored
            </span>
          </div>
          <p className="text-[10px] text-gray-300 font-light">
            Powered by Hushh Intelligence & Google Cloud AI
          </p>
          <p className="text-[9px] text-gray-300 mt-1">
            © {new Date().getFullYear()} Hushh Technologies
          </p>
        </section>
      </main>
    </div>
  );
}
