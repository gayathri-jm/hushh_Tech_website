/**
 * ReAct Agent Service
 * 
 * Frontend service to interact with the Career ReAct Agent backend.
 * Handles communication with Victor Thorne and Sophia Sterling agents.
 */

import { Coach } from '../types';

// Types
export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ThoughtStep {
  step: number;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  timestamp: number;
}

export interface ReActResponse {
  response: string;
  thoughts?: ThoughtStep[];
  steps: number;
  coachId: 'victor' | 'sophia';
}

export interface ReActRequest {
  messages: Message[];
  coachId: 'victor' | 'sophia';
  emotionContext?: string;
  resumeData?: string;
  streamThoughts?: boolean;
}

// Get Supabase URL from environment
const getSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    console.warn('[ReActAgent] VITE_SUPABASE_URL not set, using fallback');
    return 'https://your-project.supabase.co';
  }
  return url;
};

const getSupabaseAnonKey = (): string => {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
};

/**
 * Call the ReAct Career Agent
 * 
 * This is the main function to interact with Victor or Sophia.
 * Returns the response along with thought steps for visualization.
 */
export async function callReActAgent(request: ReActRequest): Promise<ReActResponse> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  
  console.log('[ReActAgent] Calling agent:', request.coachId);
  console.log('[ReActAgent] Messages:', request.messages.length);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/career-react-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        messages: request.messages,
        coachId: request.coachId,
        emotionContext: request.emotionContext,
        resumeData: request.resumeData,
        streamThoughts: request.streamThoughts ?? true,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ReActAgent] Response received, steps:', data.steps);
    
    return data as ReActResponse;
    
  } catch (error) {
    console.error('[ReActAgent] Error:', error);
    throw error;
  }
}

/**
 * Create a conversation with the ReAct agent
 * 
 * Utility class for managing multi-turn conversations.
 */
export class ReActConversation {
  private messages: Message[] = [];
  private coachId: 'victor' | 'sophia';
  private emotionContext?: string;
  private resumeData?: string;
  private allThoughts: ThoughtStep[] = [];
  
  constructor(coach: Coach) {
    this.coachId = coach.id as 'victor' | 'sophia';
  }
  
  /**
   * Set the user's emotional context from MediaPipe analysis
   */
  setEmotionContext(context: string): void {
    this.emotionContext = context;
  }
  
  /**
   * Set the resume data for analysis
   */
  setResumeData(data: string): void {
    this.resumeData = data;
  }
  
  /**
   * Send a message and get a response
   */
  async sendMessage(content: string): Promise<{
    response: string;
    thoughts: ThoughtStep[];
    totalSteps: number;
  }> {
    // Add user message
    this.messages.push({ role: 'user', content });
    
    // Call the agent
    const result = await callReActAgent({
      messages: this.messages,
      coachId: this.coachId,
      emotionContext: this.emotionContext,
      resumeData: this.resumeData,
      streamThoughts: true,
    });
    
    // Add assistant response
    this.messages.push({ role: 'assistant', content: result.response });
    
    // Track thoughts
    if (result.thoughts) {
      this.allThoughts.push(...result.thoughts);
    }
    
    return {
      response: result.response,
      thoughts: result.thoughts || [],
      totalSteps: result.steps,
    };
  }
  
  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.messages];
  }
  
  /**
   * Get all thought steps
   */
  getAllThoughts(): ThoughtStep[] {
    return [...this.allThoughts];
  }
  
  /**
   * Clear conversation
   */
  clear(): void {
    this.messages = [];
    this.allThoughts = [];
    this.emotionContext = undefined;
    this.resumeData = undefined;
  }
}

/**
 * Format thought steps for display
 */
export function formatThoughtForDisplay(thought: ThoughtStep): {
  icon: string;
  label: string;
  description: string;
  color: string;
} {
  switch (thought.type) {
    case 'thinking':
      return {
        icon: 'fa-brain',
        label: 'REASONING',
        description: thought.content,
        color: 'purple',
      };
    case 'tool_call':
      return {
        icon: 'fa-tools',
        label: `TOOL: ${thought.toolName?.toUpperCase()}`,
        description: thought.content,
        color: 'blue',
      };
    case 'tool_result':
      return {
        icon: 'fa-check-circle',
        label: 'OBSERVATION',
        description: thought.content,
        color: 'green',
      };
    case 'response':
      return {
        icon: 'fa-comment',
        label: 'RESPONSE',
        description: thought.content,
        color: 'white',
      };
    default:
      return {
        icon: 'fa-question',
        label: 'UNKNOWN',
        description: thought.content,
        color: 'gray',
      };
  }
}

/**
 * Get tool-specific display info
 */
export function getToolDisplayInfo(toolName: string): {
  icon: string;
  label: string;
  description: string;
} {
  const toolInfo: Record<string, { icon: string; label: string; description: string }> = {
    analyze_resume_ats: {
      icon: 'fa-file-alt',
      label: 'ATS Analysis',
      description: 'Analyzing resume for ATS compatibility...',
    },
    search_job_opportunities: {
      icon: 'fa-search',
      label: 'Job Search',
      description: 'Searching for matching opportunities...',
    },
    generate_career_roadmap: {
      icon: 'fa-road',
      label: 'Career Roadmap',
      description: 'Generating personalized career path...',
    },
    optimize_bullet_points: {
      icon: 'fa-list',
      label: 'Bullet Optimization',
      description: 'Enhancing resume bullet points...',
    },
    analyze_linkedin_profile: {
      icon: 'fa-linkedin',
      label: 'LinkedIn Analysis',
      description: 'Analyzing LinkedIn profile...',
    },
    prepare_interview_questions: {
      icon: 'fa-question-circle',
      label: 'Interview Prep',
      description: 'Preparing interview questions...',
    },
    calculate_market_salary: {
      icon: 'fa-dollar-sign',
      label: 'Salary Calculator',
      description: 'Calculating market salary range...',
    },
    display_ats_analysis: {
      icon: 'fa-chart-bar',
      label: 'Display Results',
      description: 'Preparing visual analysis...',
    },
  };
  
  return toolInfo[toolName] || {
    icon: 'fa-cog',
    label: toolName,
    description: 'Processing...',
  };
}
