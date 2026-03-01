/**
 * Hushh Agents — Home Page
 * Standalone project - separate from main HushhTech app.
 * Custom header/footer without main app navigation.
 */
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HushhTechCta, { HushhTechCtaVariant } from '../../components/hushh-tech-cta/HushhTechCta';
import { useAuth } from '../hooks/useAuth';
import HushhLogo from '../../components/images/Hushhogo.png';

/* ── Playfair heading style ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

export default function AgentsHomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { redirectTo: '/hushh-agents' } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !mounted) {
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
      
      {/* ═══ Custom Agents Header ═══ */}
      <header className="px-6 py-5 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <Link to="/hushh-agents" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ios-dark flex items-center justify-center">
            <img src={HushhLogo} alt="Hushh" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <span className="font-semibold text-sm">Hushh Agents</span>
            <span className="text-[9px] text-hushh-blue block uppercase tracking-widest">AI Platform</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          {user?.name && (
            <span className="text-xs text-gray-500 hidden md:block">
              Hello, {user.name.split(' ')[0]}
            </span>
          )}
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 px-6 pb-16 max-w-2xl mx-auto w-full">
        
        {/* ── Hero Section ── */}
        <section className="pt-12 pb-8">
          <div className="inline-block px-3 py-1 mb-5 border border-hushh-blue/20 rounded-full bg-hushh-blue/5">
            <span className="text-[10px] tracking-widest uppercase font-medium text-hushh-blue flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-hushh-blue rounded-full animate-pulse" />
              AI Agents Platform
            </span>
          </div>
          
          <h1 
            className="text-[2.5rem] md:text-[3rem] leading-[1.1] font-normal text-black tracking-tight font-serif"
            style={playfair}
          >
            Meet Your <br className="md:hidden" />
            <span className="text-gray-400 italic font-light">AI Agents.</span>
          </h1>
          
          <p className="text-gray-500 text-sm font-light mt-4 leading-relaxed max-w-md">
            Intelligent assistants powered by GCP's most advanced AI. 
            Chat in English, Hindi, or Tamil with voice support.
          </p>
        </section>

        {/* ── Agent Card ── */}
        <section className="py-6">
          <div 
            className="group bg-ios-dark text-white p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-300"
            onClick={() => navigate('/hushh-agents/chat')}
            role="button"
            tabIndex={0}
            aria-label="Start chatting with Hushh AI"
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hushh-agents/chat'); }}
          >
            {/* Glow effects */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-hushh-blue/20 rounded-full blur-3xl group-hover:bg-hushh-blue/30 transition-colors" />
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-hushh-blue/10 to-transparent" />

            <div className="relative z-10 flex flex-col gap-6">
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-hushh-blue/20 to-hushh-blue/5 flex items-center justify-center border border-white/10">
                    <img src={HushhLogo} alt="Hushh" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium tracking-widest uppercase text-white/50 block">
                      Primary Agent
                    </span>
                    <h2 className="text-2xl md:text-3xl font-medium font-serif" style={playfair}>
                      Hushh
                    </h2>
                  </div>
                </div>
                <span className="bg-ios-green/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider border border-ios-green/30 text-ios-green">
                  Online
                </span>
              </div>

              {/* Agent Description */}
              <p className="text-white/70 text-sm font-light leading-relaxed">
                Your intelligent AI companion. Ask questions, get help with analysis, 
                creative writing, coding, and more.
              </p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-2">
                {['Multi-language', 'Voice Chat', 'Code Help', 'Analysis'].map((cap) => (
                  <span 
                    key={cap}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-white/60"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Start Chat CTA */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-hushh-blue">
                  Start Conversation
                </span>
                <span className="material-symbols-outlined text-hushh-blue group-hover:translate-x-2 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Tamil Voice Nudge — Gemini Live API ═══ */}
        <section className="py-6">
          <div 
            className="group relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl"
            style={{ 
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B00 100%)',
            }}
            onClick={() => navigate('/hushh-agents/chat?lang=ta-IN&voice=true')}
            role="button"
            tabIndex={0}
            aria-label="Start Tamil voice conversation"
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/hushh-agents/chat?lang=ta-IN&voice=true'); }}
          >
            {/* Animated glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent" />
            
            {/* NEW Badge */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                NEW
              </span>
            </div>
            
            <div className="relative z-10 flex flex-col gap-4">
              {/* Icon & Title */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <span className="material-symbols-outlined text-4xl text-white">record_voice_over</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-white/70 block">
                    Gemini Live API
                  </span>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    தமிழ் குரல் AI
                  </h2>
                  <p className="text-sm text-white/90 font-light">Tamil Voice Assistant</p>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-white/90 text-sm font-light leading-relaxed">
                <span className="font-medium">தமிழில் பேசுங்கள், தமிழில் பதில் பெறுங்கள்!</span><br />
                Speak in Tamil, get responses in Tamil. Real-time voice conversations 
                powered by Google's most advanced AI.
              </p>
              
              {/* Features */}
              <div className="flex flex-wrap gap-2 mt-2">
                {['Real-time Voice', 'Native Tamil', 'Low Latency', 'No Typing'].map((cap) => (
                  <span 
                    key={cap}
                    className="px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-[10px] font-medium uppercase tracking-wider text-white"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              
              {/* CTA */}
              <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white/80">mic</span>
                  <span className="text-sm font-medium text-white">
                    குரலில் பேசத் தொடங்குங்கள்
                  </span>
                </div>
                <span className="material-symbols-outlined text-white group-hover:translate-x-2 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section className="py-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2 font-medium">Features</p>
          <h2 className="text-xl md:text-2xl font-medium mb-6 tracking-tight font-serif" style={playfair}>
            What Hushh Can Do
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: 'chat', color: 'text-hushh-blue', bg: 'bg-hushh-blue/10', title: 'Chat', desc: 'Natural conversations' },
              { icon: 'translate', color: 'text-ios-green', bg: 'bg-ios-green/10', title: 'Languages', desc: 'EN • HI • TA' },
              { icon: 'mic', color: 'text-amber-500', bg: 'bg-amber-500/10', title: 'Voice', desc: 'Speak naturally' },
              { icon: 'code', color: 'text-purple-500', bg: 'bg-purple-500/10', title: 'Code', desc: 'Programming help' },
            ].map((item) => (
              <div 
                key={item.icon} 
                className="bg-ios-gray-bg border border-gray-200/60 p-4 rounded-2xl hover:border-hushh-blue/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                  <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
                </div>
                <h5 className="font-medium text-sm">{item.title}</h5>
                <p className="text-[10px] text-gray-500 font-light mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Coming Soon Section ── */}
        <section className="py-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2 font-medium">Coming Soon</p>
          <h2 className="text-xl md:text-2xl font-medium mb-6 tracking-tight font-serif" style={playfair}>
            More Agents
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Kai', desc: 'Investment analysis & market insights', icon: 'trending_up' },
              { name: 'Luna', desc: 'Document processing & summaries', icon: 'description' },
            ].map((agent) => (
              <div 
                key={agent.name}
                className="bg-ios-gray-bg border border-gray-200/60 p-5 rounded-2xl flex items-center gap-4 opacity-60"
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-200/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400">{agent.icon}</span>
                </div>
                <div>
                  <h5 className="font-medium text-sm flex items-center gap-2">
                    {agent.name}
                    <span className="text-[8px] uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                      Soon
                    </span>
                  </h5>
                  <p className="text-[11px] text-gray-500 font-light mt-0.5">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Primary CTA ── */}
        <section className="py-8">
          <HushhTechCta
            onClick={() => navigate('/hushh-agents/chat')}
            variant={HushhTechCtaVariant.BLACK}
          >
            <span className="material-symbols-outlined">chat</span>
            Start Chatting with Hushh
          </HushhTechCta>
        </section>
      </main>

      {/* ═══ Custom Agents Footer ═══ */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-hushh-blue">lock</span>
            <span className="text-[10px] text-gray-400 tracking-wide uppercase font-medium">
              Secure • Private • No Data Stored
            </span>
          </div>
          <p className="text-[10px] text-gray-400 text-center">
            Powered by Hushh Intelligence & Google Cloud AI
          </p>
          <p className="text-[9px] text-gray-300">
            © {new Date().getFullYear()} Hushh Technologies
          </p>
        </div>
      </footer>
    </div>
  );
}
