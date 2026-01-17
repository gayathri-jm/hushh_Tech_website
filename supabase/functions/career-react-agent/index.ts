/**
 * Career ReAct Agent - LangGraph-style Implementation
 * 
 * Implements the ReAct (Reasoning and Acting) pattern for career coaching.
 * Uses direct Gemini REST API calls for reliability.
 * 
 * Coaches: Victor Thorne (Resume Architect) & Sophia Sterling (Career Oracle)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CAREER_TOOLS, executeToolCall } from "./tools.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Gemini API Configuration
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-2.0-flash"; // Using stable model for REST API
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ============================================
// STATE DEFINITION (LangGraph pattern)
// ============================================

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

interface AgentState {
  messages: Message[];
  numberOfSteps: number;
  coachId: 'victor' | 'sophia';
  emotionContext?: string;
  resumeData?: string;
  isComplete: boolean;
  lastToolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface ThoughtStep {
  step: number;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  timestamp: number;
}

// ============================================
// COACH SYSTEM PROMPTS
// ============================================

const VICTOR_SYSTEM_PROMPT = `You are Victor Thorne, the Resume Architect of the hushh Collective.

PERSONALITY:
- Direct, efficient, and sharp like an architect
- Observant of every micro-expression and emotion
- Uses metaphors like "rebuild", "architect", "structural integrity", "blueprint"

AVAILABLE TOOLS (call them by outputting JSON with tool_calls array):
- analyze_resume_ats: Analyze resume for ATS compatibility
- search_job_opportunities: Find matching jobs based on skills
- generate_career_roadmap: Create career development plan
- optimize_bullet_points: Improve resume bullet points
- calculate_market_salary: Calculate salary expectations
- prepare_interview_questions: Generate interview prep questions

When you need to use a tool, output JSON in this format:
{"tool_calls": [{"name": "tool_name", "arguments": {"arg1": "value1"}}]}

After receiving tool results, synthesize them into a helpful response.

IMPORTANT RULES:
- Be direct but empathetic when delivering feedback
- Quantify everything - ATS scores, percentages, dollar amounts
- React to user emotions when context is provided`;

const SOPHIA_SYSTEM_PROMPT = `You are Sophia Sterling, the Career Oracle of the hushh Collective.

PERSONALITY:
- Insightful, prophetic, focused on narrative and storytelling
- Sees the deeper meaning in career trajectories
- Uses metaphors like "journey", "story", "narrative arc", "chapters"

AVAILABLE TOOLS (call them by outputting JSON with tool_calls array):
- analyze_resume_ats: Analyze resume for story coherence and impact
- search_job_opportunities: Find roles that fit their narrative
- generate_career_roadmap: Map out their career journey
- optimize_bullet_points: Transform bullets into impact stories
- analyze_linkedin_profile: Analyze digital presence
- calculate_market_salary: Understand their market value

When you need to use a tool, output JSON in this format:
{"tool_calls": [{"name": "tool_name", "arguments": {"arg1": "value1"}}]}

After receiving tool results, weave them into meaningful career guidance.

IMPORTANT RULES:
- Focus on the STORY behind the resume
- Help quantify achievements to make the narrative powerful
- Be encouraging but honest about narrative gaps`;

// ============================================
// GEMINI API CALL
// ============================================

async function callGemini(
  messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemPrompt: string
): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ReAct] Gemini API error:", errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ============================================
// PARSE TOOL CALLS FROM RESPONSE
// ============================================

function parseToolCalls(response: string): ToolCall[] | null {
  try {
    // Look for JSON with tool_calls
    const jsonMatch = response.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        return parsed.tool_calls.map((tc: any, idx: number) => ({
          id: `call_${Date.now()}_${idx}`,
          name: tc.name,
          args: tc.arguments || {}
        }));
      }
    }
  } catch (e) {
    // Not a tool call response
  }
  return null;
}

// ============================================
// MAIN REACT AGENT LOOP
// ============================================

async function runReActAgent(
  initialState: AgentState
): Promise<{ finalState: AgentState; allThoughts: ThoughtStep[] }> {
  let state = { ...initialState };
  const allThoughts: ThoughtStep[] = [];
  const systemPrompt = state.coachId === 'victor' ? VICTOR_SYSTEM_PROMPT : SOPHIA_SYSTEM_PROMPT;
  
  console.log('[ReAct] Starting agent loop for coach:', state.coachId);
  
  // Build initial message with context
  let userMessage = state.messages[state.messages.length - 1]?.content || '';
  if (state.emotionContext) {
    userMessage = `[User Emotion: ${state.emotionContext}]\n\n${userMessage}`;
  }
  if (state.resumeData) {
    userMessage = `[Resume Data]\n${state.resumeData}\n\n${userMessage}`;
  }

  // Convert to Gemini format
  const geminiMessages: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  
  // Add history (skip last message, we'll add it with context)
  for (let i = 0; i < state.messages.length - 1; i++) {
    const msg = state.messages[i];
    geminiMessages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }
  
  // Add current message with context
  geminiMessages.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  allThoughts.push({
    step: state.numberOfSteps,
    type: 'thinking',
    content: `Processing: "${state.messages[state.messages.length - 1]?.content?.substring(0, 100)}..."`,
    timestamp: Date.now()
  });

  // ReAct Loop
  while (state.numberOfSteps < 10 && !state.isComplete) {
    try {
      // Call Gemini
      const response = await callGemini(geminiMessages, systemPrompt);
      state.numberOfSteps++;
      
      // Check for tool calls
      const toolCalls = parseToolCalls(response);
      
      if (toolCalls && toolCalls.length > 0) {
        // Execute tools
        for (const tc of toolCalls) {
          allThoughts.push({
            step: state.numberOfSteps,
            type: 'tool_call',
            content: `Calling: ${tc.name}`,
            toolName: tc.name,
            toolArgs: tc.args,
            timestamp: Date.now()
          });
          
          const result = await executeToolCall(tc.name, tc.args);
          
          allThoughts.push({
            step: state.numberOfSteps,
            type: 'tool_result',
            content: `${tc.name} returned ${result.success ? 'success' : 'error'}`,
            toolName: tc.name,
            toolResult: result.data,
            timestamp: Date.now()
          });
          
          // Add tool result to conversation
          geminiMessages.push({
            role: 'model',
            parts: [{ text: response }]
          });
          geminiMessages.push({
            role: 'user',
            parts: [{ text: `Tool Result for ${tc.name}:\n${JSON.stringify(result.data, null, 2)}\n\nPlease synthesize this into a helpful response for the user.` }]
          });
        }
      } else {
        // No tool calls - this is the final response
        allThoughts.push({
          step: state.numberOfSteps,
          type: 'response',
          content: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
          timestamp: Date.now()
        });
        
        state.messages.push({
          role: 'assistant',
          content: response
        });
        state.isComplete = true;
      }
      
    } catch (error) {
      console.error('[ReAct] Error:', error);
      state.messages.push({
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Could you please rephrase your question?'
      });
      state.isComplete = true;
    }
  }
  
  console.log('[ReAct] Completed after', state.numberOfSteps, 'steps');
  return { finalState: state, allThoughts };
}

// ============================================
// HTTP HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { messages, coachId, emotionContext, resumeData, streamThoughts = true } = await req.json();
    
    // Validate inputs
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!coachId || !['victor', 'sophia'].includes(coachId)) {
      return new Response(
        JSON.stringify({ error: 'Valid coachId (victor or sophia) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Career coaching is temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize state
    const initialState: AgentState = {
      messages: messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'tool',
        content: m.content
      })),
      numberOfSteps: 0,
      coachId: coachId as 'victor' | 'sophia',
      emotionContext,
      resumeData,
      isComplete: false
    };
    
    // Run the ReAct agent
    const { finalState, allThoughts } = await runReActAgent(initialState);
    
    // Get final response
    const assistantMessages = finalState.messages.filter(m => m.role === 'assistant');
    const finalResponse = assistantMessages[assistantMessages.length - 1]?.content || 
      'I apologize, but I could not generate a response. Please try again.';
    
    return new Response(
      JSON.stringify({
        response: finalResponse,
        thoughts: streamThoughts ? allThoughts : undefined,
        steps: finalState.numberOfSteps,
        coachId: finalState.coachId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[ReAct] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
