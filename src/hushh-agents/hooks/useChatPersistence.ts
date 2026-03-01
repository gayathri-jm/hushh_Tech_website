/**
 * useChatPersistence — Persist chat sessions to localStorage
 * 
 * Provides:
 * - Auto-save thread on every change
 * - Restore thread on page load
 * - Multiple sessions with history sidebar
 * - Works for any agent (code, chat, voice)
 */

/** A single message in any conversation */
export interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  explanation?: string;
  thinking?: string;
  timestamp: number;
  mode?: string;
  language?: string;
}

/** A saved conversation session */
export interface ChatSession {
  id: string;
  agentId: string;       // 'code' | 'hushh' | 'voice' etc.
  title: string;         // Auto-generated from first message
  messages: PersistedMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'hushh-agents-sessions';
const MAX_SESSIONS = 50; // Keep last 50 sessions per agent

/** Get all sessions from localStorage */
const getAllSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
};

/** Save all sessions to localStorage */
const saveAllSessions = (sessions: ChatSession[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save chat sessions:', e);
  }
};

/** Generate a title from the first user message */
const generateTitle = (messages: PersistedMessage[]): string => {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const text = firstUser.content.trim();
  // Truncate to 60 chars
  return text.length > 60 ? text.slice(0, 57) + '...' : text;
};

/** Generate a unique session ID */
const genSessionId = () =>
  `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Hook: useChatPersistence
 * 
 * @param agentId — which agent this is for ('code', 'hushh', 'voice')
 */
export const useChatPersistence = (agentId: string) => {

  /** Get sessions for this agent, sorted newest first */
  const getSessions = (): ChatSession[] => {
    return getAllSessions()
      .filter((s) => s.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };

  /** Get a specific session by ID */
  const getSession = (sessionId: string): ChatSession | null => {
    return getAllSessions().find((s) => s.id === sessionId) || null;
  };

  /** Get the most recent session (to auto-restore) */
  const getLatestSession = (): ChatSession | null => {
    const sessions = getSessions();
    return sessions.length > 0 ? sessions[0] : null;
  };

  /** Save or update a session */
  const saveSession = (
    sessionId: string,
    messages: PersistedMessage[]
  ): string => {
    const allSessions = getAllSessions();
    const existingIdx = allSessions.findIndex((s) => s.id === sessionId);

    if (existingIdx >= 0) {
      // Update existing
      allSessions[existingIdx].messages = messages;
      allSessions[existingIdx].updatedAt = Date.now();
      allSessions[existingIdx].title = generateTitle(messages);
    } else {
      // Create new
      const newSession: ChatSession = {
        id: sessionId,
        agentId,
        title: generateTitle(messages),
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      allSessions.push(newSession);
    }

    // Trim old sessions for this agent
    const agentSessions = allSessions
      .filter((s) => s.agentId === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (agentSessions.length > MAX_SESSIONS) {
      const toRemoveIds = new Set(
        agentSessions.slice(MAX_SESSIONS).map((s) => s.id)
      );
      const trimmed = allSessions.filter((s) => !toRemoveIds.has(s.id));
      saveAllSessions(trimmed);
    } else {
      saveAllSessions(allSessions);
    }

    return sessionId;
  };

  /** Create a new empty session and return its ID */
  const createSession = (): string => {
    return genSessionId();
  };

  /** Delete a session */
  const deleteSession = (sessionId: string) => {
    const allSessions = getAllSessions().filter((s) => s.id !== sessionId);
    saveAllSessions(allSessions);
  };

  /** Delete all sessions for this agent */
  const clearAllSessions = () => {
    const allSessions = getAllSessions().filter((s) => s.agentId !== agentId);
    saveAllSessions(allSessions);
  };

  return {
    getSessions,
    getSession,
    getLatestSession,
    saveSession,
    createSession,
    deleteSession,
    clearAllSessions,
  };
};
