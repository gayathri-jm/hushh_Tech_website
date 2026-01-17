/**
 * ResumeNodeIntro.tsx
 * Narrative intro screen explaining what Resume Node is
 * Shows before user clicks "Connect Now"
 */

import React, { useState, useEffect } from 'react';

interface ResumeNodeIntroProps {
  onConnect: () => void;
}

const FEATURES = [
  {
    icon: 'fa-file-alt',
    title: 'Upload Resume',
    description: 'AI parses every detail from your resume in seconds',
    color: 'blue'
  },
  {
    icon: 'fa-chart-line',
    title: 'Real ATS Score',
    description: 'Get an actual ATS compatibility score, not fake numbers',
    color: 'emerald'
  },
  {
    icon: 'fa-search',
    title: 'Find Matching Jobs',
    description: 'Automatically discover jobs that match your profile',
    color: 'purple'
  },
  {
    icon: 'fa-magic',
    title: 'AI Rewrite',
    description: 'One-click resume optimization for each job',
    color: 'amber'
  },
  {
    icon: 'fa-rocket',
    title: 'Auto Apply',
    description: 'Apply to multiple jobs with tailored resumes',
    color: 'rose'
  },
  {
    icon: 'fa-brain',
    title: 'Neural Detection',
    description: 'AI reads your emotions and adapts in real-time',
    color: 'cyan'
  }
];

const NEURAL_READOUTS = [
  'INITIALIZING CAREER NEURAL MATRIX...',
  'PREPARING RESUME PARSING ENGINE...',
  'LOADING ATS SIMULATION PROTOCOLS...',
  'CALIBRATING EMOTIONAL RESONANCE...',
  'READY FOR SOVEREIGN CONNECTION...'
];

const ResumeNodeIntro: React.FC<ResumeNodeIntroProps> = ({ onConnect }) => {
  const [readoutIndex, setReadoutIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Cycle through readouts
  useEffect(() => {
    const interval = setInterval(() => {
      setReadoutIndex(prev => (prev + 1) % NEURAL_READOUTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#010101] overflow-y-auto">
      {/* Neural Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-900/20 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-900/20 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[140px]"></div>
        
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        
        {/* Neural Status */}
        <div className="mb-12 flex items-center gap-3 px-6 py-3 rounded-full glass border border-white/5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">
            {NEURAL_READOUTS[readoutIndex]}
          </span>
        </div>

        {/* Main Title */}
        <div className="text-center mb-16 max-w-4xl">
          <div className="inline-flex items-center gap-3 mb-8 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
            <i className="fas fa-file-alt text-blue-400"></i>
            <span className="text-[11px] uppercase tracking-[0.3em] text-blue-300 font-black">
              Resume Node • Career Architect
            </span>
          </div>

          <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/20 leading-[1.1]">
            Your AI Career Agent
          </h1>

          <p className="text-xl md:text-2xl text-white/40 leading-relaxed max-w-3xl mx-auto">
            Resume Node doesn't just review your resume —{' '}
            <span className="text-white/70 font-semibold">it gets you the job</span>.
            Neural-powered analysis, real-time emotional detection, and autonomous job applications.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl w-full mb-16">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 md:p-8 rounded-3xl glass border border-white/5 hover:border-white/20 transition-all duration-500 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`
                w-14 h-14 rounded-2xl flex items-center justify-center mb-5
                ${feature.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : ''}
                ${feature.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                ${feature.color === 'purple' ? 'bg-purple-500/10 text-purple-400' : ''}
                ${feature.color === 'amber' ? 'bg-amber-500/10 text-amber-400' : ''}
                ${feature.color === 'rose' ? 'bg-rose-500/10 text-rose-400' : ''}
                ${feature.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' : ''}
                group-hover:scale-110 transition-transform
              `}>
                <i className={`fas ${feature.icon} text-xl`}></i>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="max-w-4xl w-full mb-16">
          <h2 className="text-center text-[10px] uppercase tracking-[0.5em] text-white/30 font-black mb-10">
            How It Works
          </h2>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            {[
              { step: '01', label: 'Connect', icon: 'fa-link' },
              { step: '02', label: 'Upload Resume', icon: 'fa-upload' },
              { step: '03', label: 'Get Analyzed', icon: 'fa-chart-bar' },
              { step: '04', label: 'Find Jobs', icon: 'fa-search' },
              { step: '05', label: 'Auto Apply', icon: 'fa-paper-plane' }
            ].map((item, index, arr) => (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center">
                    <i className={`fas ${item.icon} text-white/50`}></i>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 font-black">{item.step}</span>
                    <p className="text-sm text-white/60 font-medium">{item.label}</p>
                  </div>
                </div>
                {index < arr.length - 1 && (
                  <div className="hidden md:block w-12 h-px bg-gradient-to-r from-white/10 to-white/5"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Connect Button */}
        <div className="text-center">
          <button
            onClick={onConnect}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`
              relative group px-16 py-6 rounded-full font-black text-lg uppercase tracking-[0.3em]
              bg-gradient-to-r from-blue-600 to-blue-500 text-white
              hover:from-blue-500 hover:to-blue-400
              transition-all duration-500 transform hover:scale-105
              shadow-[0_0_60px_rgba(59,130,246,0.4)]
              hover:shadow-[0_0_80px_rgba(59,130,246,0.6)]
            `}
          >
            <span className="relative z-10 flex items-center gap-4">
              <i className={`fas fa-link ${isHovering ? 'animate-pulse' : ''}`}></i>
              Connect Now
            </span>
            
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></span>
          </button>

          <p className="mt-6 text-sm text-white/30">
            <i className="fas fa-camera mr-2"></i>
            Camera + Microphone required for neural connection
          </p>
        </div>

        {/* Neural Emotional Preview */}
        <div className="mt-20 max-w-3xl w-full">
          <div className="p-8 rounded-3xl glass border border-white/5">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
                <i className="fas fa-brain text-2xl text-white/50"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Neural Emotional Detection</h3>
                <p className="text-sm text-white/40 leading-relaxed mb-4">
                  Your AI agent will analyze your facial expressions in real-time. 
                  If you look confused, it will explain differently. If you look excited about a job, 
                  it will prioritize similar opportunities. The agent sees you and adapts.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['😊 Happy', '🤔 Thinking', '😟 Worried', '🎯 Focused'].map(emotion => (
                    <span 
                      key={emotion}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/50"
                    >
                      {emotion}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">
            hushh Resume Node • Career Architect v2.0 • Neural Sovereign
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResumeNodeIntro;
