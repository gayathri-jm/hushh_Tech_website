/**
 * AgentThinkingPanel.tsx
 * 
 * Visualizes the ReAct agent's thinking process in real-time.
 * Shows the THINK → ACT → OBSERVE loop with animated steps.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { ThoughtStep, formatThoughtForDisplay, getToolDisplayInfo } from '../../services/reactAgentService';

interface AgentThinkingPanelProps {
  thoughts: ThoughtStep[];
  isLoading: boolean;
  currentToolName: string | null;
  isThinking: boolean;
  coachName: string;
  compact?: boolean;
}

const AgentThinkingPanel: React.FC<AgentThinkingPanelProps> = ({
  thoughts,
  isLoading,
  currentToolName,
  isThinking,
  coachName,
  compact = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to latest thought
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);
  
  // Get recent thoughts (last 10)
  const recentThoughts = useMemo(() => {
    return thoughts.slice(-10);
  }, [thoughts]);
  
  // Get step summary
  const stepSummary = useMemo(() => {
    const thinkSteps = thoughts.filter(t => t.type === 'thinking').length;
    const toolCalls = thoughts.filter(t => t.type === 'tool_call').length;
    const responses = thoughts.filter(t => t.type === 'response').length;
    return { thinkSteps, toolCalls, responses };
  }, [thoughts]);
  
  const getThoughtColor = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking': return 'purple';
      case 'tool_call': return 'blue';
      case 'tool_result': return 'green';
      case 'response': return 'white';
      default: return 'gray';
    }
  };
  
  const getThoughtIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'thinking': return 'fa-brain';
      case 'tool_call': return 'fa-tools';
      case 'tool_result': return 'fa-check-circle';
      case 'response': return 'fa-comment';
      default: return 'fa-question';
    }
  };
  
  if (compact) {
    // Compact mode - just show current status
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-full glass border border-white/10">
        {isLoading ? (
          <>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              isThinking ? 'bg-purple-500' : 
              currentToolName ? 'bg-blue-500' : 'bg-white/50'
            }`} />
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-black">
              {isThinking 
                ? 'REASONING...' 
                : currentToolName 
                  ? `EXECUTING: ${currentToolName.toUpperCase()}`
                  : 'PROCESSING...'}
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-black">
              {stepSummary.toolCalls > 0 
                ? `${stepSummary.toolCalls} TOOLS USED` 
                : 'READY'}
            </span>
          </>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full glass rounded-[32px] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isLoading ? 'bg-purple-500/20' : 'bg-white/5'
            }`}>
              <i className={`fas fa-brain text-${isLoading ? 'purple-400' : 'white/40'} text-sm ${
                isLoading ? 'animate-pulse' : ''
              }`}></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{coachName}'s Mind</h3>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-black">
                REACT AGENT
              </span>
            </div>
          </div>
          
          {/* Step counters */}
          <div className="flex gap-2">
            <div className="px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
              <span className="text-[8px] font-black text-purple-300">
                {stepSummary.thinkSteps} THINK
              </span>
            </div>
            <div className="px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
              <span className="text-[8px] font-black text-blue-300">
                {stepSummary.toolCalls} ACT
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Thought Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
      >
        {recentThoughts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <i className="fas fa-brain text-4xl text-white/20 mb-4"></i>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              Waiting for first thought...
            </p>
          </div>
        ) : (
          recentThoughts.map((thought, idx) => (
            <div 
              key={`${thought.timestamp}-${idx}`}
              className={`animate-in slide-in-from-left-4 fade-in duration-500`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <ThoughtBubble thought={thought} />
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl glass border border-white/10 animate-pulse">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isThinking ? 'bg-purple-500/20' : 'bg-blue-500/20'
            }`}>
              <i className={`fas ${isThinking ? 'fa-brain' : 'fa-cog fa-spin'} text-sm ${
                isThinking ? 'text-purple-400' : 'text-blue-400'
              }`}></i>
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-black">
                {isThinking 
                  ? 'REASONING...' 
                  : currentToolName 
                    ? `EXECUTING: ${getToolDisplayInfo(currentToolName).label}`
                    : 'PROCESSING...'}
              </span>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Current Tool Details (if executing) */}
      {currentToolName && (
        <div className="p-4 border-t border-white/5 bg-blue-500/5">
          <ToolExecutionCard toolName={currentToolName} />
        </div>
      )}
    </div>
  );
};

// Individual thought bubble component
const ThoughtBubble: React.FC<{ thought: ThoughtStep }> = ({ thought }) => {
  const display = formatThoughtForDisplay(thought);
  
  const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', icon: 'text-purple-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', icon: 'text-blue-400' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300', icon: 'text-green-400' },
    white: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/60', icon: 'text-white/50' },
    gray: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/40', icon: 'text-white/30' },
  };
  
  const colors = colorClasses[display.color] || colorClasses.gray;
  
  return (
    <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colors.bg}`}>
          <i className={`fas ${display.icon} text-xs ${colors.icon}`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${colors.text}`}>
              {display.label}
            </span>
            <span className="text-[8px] text-white/20">
              Step {thought.step}
            </span>
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
            {display.description}
          </p>
          
          {/* Tool Args Preview */}
          {thought.toolArgs && Object.keys(thought.toolArgs).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(thought.toolArgs).slice(0, 3).map(([key, value]) => (
                <span 
                  key={key}
                  className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] text-white/40"
                >
                  {key}: {typeof value === 'string' ? value.substring(0, 15) : '...'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Tool execution card
const ToolExecutionCard: React.FC<{ toolName: string }> = ({ toolName }) => {
  const toolInfo = getToolDisplayInfo(toolName);
  
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
        <i className={`fas ${toolInfo.icon} text-blue-400`}></i>
      </div>
      <div className="flex-1">
        <h4 className="text-xs font-bold text-white">{toolInfo.label}</h4>
        <p className="text-[10px] text-white/50">{toolInfo.description}</p>
      </div>
      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-blue-400 text-xs"></i>
      </div>
    </div>
  );
};

// Floating thinking indicator (for overlay on video)
export const FloatingThinkingIndicator: React.FC<{
  isThinking: boolean;
  currentToolName: string | null;
  lastThought: ThoughtStep | null;
}> = ({ isThinking, currentToolName, lastThought }) => {
  if (!isThinking && !currentToolName && !lastThought) return null;
  
  return (
    <div className="absolute bottom-20 left-6 z-30 animate-in slide-in-from-left-4 duration-500">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-purple-500/30 bg-black/80 max-w-xs">
        {isThinking ? (
          <>
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <i className="fas fa-brain text-purple-400 animate-pulse"></i>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-purple-300 font-black block">
                REASONING
              </span>
              <span className="text-[10px] text-white/50">
                Analyzing your request...
              </span>
            </div>
          </>
        ) : currentToolName ? (
          <>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <i className={`fas ${getToolDisplayInfo(currentToolName).icon} text-blue-400`}></i>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-blue-300 font-black block">
                {getToolDisplayInfo(currentToolName).label.toUpperCase()}
              </span>
              <span className="text-[10px] text-white/50">
                {getToolDisplayInfo(currentToolName).description}
              </span>
            </div>
          </>
        ) : lastThought ? (
          <>
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <i className="fas fa-check text-green-400"></i>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-green-300 font-black block">
                COMPLETE
              </span>
              <span className="text-[10px] text-white/50 line-clamp-1">
                {lastThought.content.substring(0, 40)}...
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AgentThinkingPanel;
