/**
 * useReActAgent Hook
 * 
 * React hook for interacting with the ReAct Career Agent.
 * Manages conversation state, thoughts visualization, and emotion context.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { Coach } from '../types';
import {
  Message,
  ThoughtStep,
  callReActAgent,
  formatThoughtForDisplay,
  getToolDisplayInfo,
} from '../services/reactAgentService';

export interface UseReActAgentOptions {
  coach: Coach;
  onThoughtUpdate?: (thoughts: ThoughtStep[]) => void;
  onResponse?: (response: string) => void;
  onError?: (error: Error) => void;
}

export interface UseReActAgentReturn {
  // State
  messages: Message[];
  thoughts: ThoughtStep[];
  isLoading: boolean;
  error: string | null;
  totalSteps: number;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  setEmotionContext: (context: string) => void;
  setResumeData: (data: string) => void;
  clearConversation: () => void;
  
  // Utilities
  formatThought: typeof formatThoughtForDisplay;
  getToolInfo: typeof getToolDisplayInfo;
  lastThought: ThoughtStep | null;
  isThinking: boolean;
  currentToolName: string | null;
}

export function useReActAgent(options: UseReActAgentOptions): UseReActAgentReturn {
  const { coach, onThoughtUpdate, onResponse, onError } = options;
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSteps, setTotalSteps] = useState(0);
  
  // Refs for context
  const emotionContextRef = useRef<string | undefined>();
  const resumeDataRef = useRef<string | undefined>();
  
  // Derived state
  const lastThought = useMemo(() => {
    return thoughts.length > 0 ? thoughts[thoughts.length - 1] : null;
  }, [thoughts]);
  
  const isThinking = useMemo(() => {
    return isLoading && lastThought?.type === 'thinking';
  }, [isLoading, lastThought]);
  
  const currentToolName = useMemo(() => {
    if (!isLoading) return null;
    const toolCalls = thoughts.filter(t => t.type === 'tool_call');
    const toolResults = thoughts.filter(t => t.type === 'tool_result');
    if (toolCalls.length > toolResults.length) {
      return toolCalls[toolCalls.length - 1]?.toolName || null;
    }
    return null;
  }, [isLoading, thoughts]);
  
  // Set emotion context
  const setEmotionContext = useCallback((context: string) => {
    emotionContextRef.current = context;
  }, []);
  
  // Set resume data
  const setResumeData = useCallback((data: string) => {
    resumeDataRef.current = data;
  }, []);
  
  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    // Add user message immediately
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Call the ReAct agent
      const result = await callReActAgent({
        messages: [...messages, userMessage],
        coachId: coach.id as 'victor' | 'sophia',
        emotionContext: emotionContextRef.current,
        resumeData: resumeDataRef.current,
        streamThoughts: true,
      });
      
      // Update thoughts
      if (result.thoughts) {
        setThoughts(prev => [...prev, ...result.thoughts!]);
        onThoughtUpdate?.(result.thoughts);
      }
      
      // Add assistant response
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update step count
      setTotalSteps(prev => prev + result.steps);
      
      // Callback
      onResponse?.(result.response);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      
      // Add error message to conversation
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
      }]);
      
    } finally {
      setIsLoading(false);
    }
  }, [messages, coach.id, isLoading, onThoughtUpdate, onResponse, onError]);
  
  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setThoughts([]);
    setError(null);
    setTotalSteps(0);
    emotionContextRef.current = undefined;
    resumeDataRef.current = undefined;
  }, []);
  
  return {
    // State
    messages,
    thoughts,
    isLoading,
    error,
    totalSteps,
    
    // Actions
    sendMessage,
    setEmotionContext,
    setResumeData,
    clearConversation,
    
    // Utilities
    formatThought: formatThoughtForDisplay,
    getToolInfo: getToolDisplayInfo,
    lastThought,
    isThinking,
    currentToolName,
  };
}

/**
 * Format thoughts for display as a timeline
 */
export function useThoughtTimeline(thoughts: ThoughtStep[]) {
  return useMemo(() => {
    const grouped = new Map<number, ThoughtStep[]>();
    
    for (const thought of thoughts) {
      const step = thought.step;
      if (!grouped.has(step)) {
        grouped.set(step, []);
      }
      grouped.get(step)!.push(thought);
    }
    
    return Array.from(grouped.entries()).map(([step, stepThoughts]) => ({
      step,
      thoughts: stepThoughts,
      startTime: Math.min(...stepThoughts.map(t => t.timestamp)),
      endTime: Math.max(...stepThoughts.map(t => t.timestamp)),
      hasToolCall: stepThoughts.some(t => t.type === 'tool_call'),
      hasResponse: stepThoughts.some(t => t.type === 'response'),
    }));
  }, [thoughts]);
}

export default useReActAgent;
