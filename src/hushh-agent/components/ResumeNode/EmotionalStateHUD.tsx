/**
 * EmotionalStateHUD.tsx
 * Displays real-time emotional state from neural detection
 */

import React from 'react';
import { EmotionalState } from '../../types/resumeNode';

interface EmotionalStateHUDProps {
  emotion: EmotionalState | null;
}

const EmotionBar: React.FC<{ label: string; value: number; color: string }> = ({ 
  label, 
  value, 
  color 
}) => (
  <div className="flex items-center gap-3">
    <span className="text-[9px] uppercase tracking-wider text-white/40 w-16">{label}</span>
    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-[10px] text-white/30 w-8 text-right">{value}%</span>
  </div>
);

const StatusPill: React.FC<{ label: string; value: string; color?: string }> = ({ 
  label, 
  value,
  color = 'white'
}) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-[8px] uppercase tracking-widest text-white/30">{label}</span>
    <span className={`text-[10px] font-black uppercase tracking-wider ${
      value === 'high' || value === 'intense' ? 'text-green-400' :
      value === 'medium' || value === 'focused' ? 'text-blue-400' :
      'text-white/50'
    }`}>
      {value}
    </span>
  </div>
);

const EmotionalStateHUD: React.FC<EmotionalStateHUDProps> = ({ emotion }) => {
  if (!emotion) {
    return (
      <div className="glass p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-yellow-500/50 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            Calibrating Neural Detection...
          </span>
        </div>
      </div>
    );
  }

  // Determine dominant emotion
  const emotions = [
    { name: 'happy', value: emotion.happy, emoji: '😊', color: 'bg-green-500' },
    { name: 'neutral', value: emotion.neutral, emoji: '😐', color: 'bg-gray-400' },
    { name: 'confused', value: emotion.confused, emoji: '🤔', color: 'bg-yellow-500' },
    { name: 'worried', value: emotion.worried, emoji: '😟', color: 'bg-orange-500' },
    { name: 'frustrated', value: emotion.frustrated, emoji: '😤', color: 'bg-red-500' },
    { name: 'excited', value: emotion.excited, emoji: '🎯', color: 'bg-blue-500' },
  ];

  const dominant = emotions.reduce((a, b) => a.value > b.value ? a : b);

  return (
    <div className="glass p-4 rounded-2xl border border-white/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-black">
          Neural Emotional State
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-lg">{dominant.emoji}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/60 font-bold">
            {dominant.name}
          </span>
        </div>
      </div>
      
      {/* Emotion Bars */}
      <div className="space-y-2">
        <EmotionBar label="Happy" value={emotion.happy} color="bg-green-500" />
        <EmotionBar label="Excited" value={emotion.excited} color="bg-blue-500" />
        <EmotionBar label="Neutral" value={emotion.neutral} color="bg-gray-400" />
        <EmotionBar label="Confused" value={emotion.confused} color="bg-yellow-500" />
        <EmotionBar label="Worried" value={emotion.worried} color="bg-orange-500" />
      </div>
      
      {/* Status Indicators */}
      <div className="pt-3 border-t border-white/5 flex justify-around">
        <StatusPill label="Engagement" value={emotion.engagement} />
        <StatusPill label="Attention" value={emotion.attention} />
        <StatusPill label="Confidence" value={emotion.confidence} />
      </div>
    </div>
  );
};

export default EmotionalStateHUD;
