/**
 * Resume Node Types
 * Neural-powered career agent with emotional detection
 */

// Emotional state detected from camera
export interface EmotionalState {
  happy: number;      // 0-100
  neutral: number;    // 0-100
  confused: number;   // 0-100
  worried: number;    // 0-100
  frustrated: number; // 0-100
  excited: number;    // 0-100
  engagement: 'low' | 'medium' | 'high';
  attention: 'distracted' | 'focused' | 'intense';
  confidence: 'low' | 'moderate' | 'high';
}

// Parsed resume data from Document AI
export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications?: string[];
  languages?: string[];
  rawText: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  location?: string;
  description: string[];
  isQuantified: boolean; // Has numbers/metrics
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
  gpa?: string;
}

// ATS Analysis result
export interface ATSAnalysis {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    structure: number;
    content: number;
    keywords: number;
    impact: number;
    formatting: number;
  };
  criticalIssues: ATSIssue[];
  warnings: ATSIssue[];
  strengths: string[];
  missingKeywords: string[];
  recommendations: string[];
}

export interface ATSIssue {
  type: 'critical' | 'warning';
  category: 'structure' | 'content' | 'keywords' | 'impact' | 'formatting';
  description: string;
  suggestion: string;
  lineReference?: string; // Which part of resume
}

// Job matching types
export interface JobPreferences {
  targetRoles: string[];
  locations: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  workType: 'onsite' | 'remote' | 'hybrid' | 'any';
  preferredCompanies?: string[];
  excludedCompanies?: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'any';
}

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  matchScore: number; // 0-100
  source: 'linkedin' | 'naukri' | 'indeed' | 'company';
  postedDate: string;
  url: string;
  description: string;
  requiredSkills: string[];
  missingSkills: string[];
  keywordMatch: number;
}

// Application tracking
export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'pending' | 'applied' | 'viewed' | 'callback' | 'interview' | 'offer' | 'rejected';
  appliedAt: Date;
  tailoredResumeId?: string;
  coverLetterId?: string;
  notes?: string;
  lastUpdate: Date;
}

// Resume Node session state
export type ResumeNodeStep = 
  | 'intro'           // What is Resume Node
  | 'connecting'      // Initializing neural uplink
  | 'welcome'         // Agent welcomes, asks for resume
  | 'upload'          // User uploading resume
  | 'parsing'         // Document AI parsing
  | 'analysis'        // ATS analysis + recommendations
  | 'rewrite'         // AI rewrite comparison
  | 'preferences'     // Job preferences input
  | 'matching'        // Finding matching jobs
  | 'applying'        // Auto-apply in progress
  | 'dashboard';      // Mission control

export interface ResumeNodeState {
  step: ResumeNodeStep;
  emotionalState: EmotionalState | null;
  parsedResume: ParsedResumeData | null;
  atsAnalysis: ATSAnalysis | null;
  rewrittenResume: ParsedResumeData | null;
  jobPreferences: JobPreferences | null;
  jobMatches: JobMatch[];
  applications: JobApplication[];
  agentMessages: AgentMessage[];
  isAgentSpeaking: boolean;
  isProcessing: boolean;
  error: string | null;
}

export interface AgentMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  timestamp: Date;
  emotionalContext?: string; // What emotion was detected when this was said
}

// Agent tool declarations for Gemini
export interface ResumeNodeTools {
  displayATSScore: (score: number, breakdown: ATSAnalysis['breakdown']) => void;
  showJobMatches: (matches: JobMatch[]) => void;
  startAutoApply: (jobIds: string[]) => void;
  updateEmotionalState: (state: Partial<EmotionalState>) => void;
  showRewriteComparison: (before: string, after: string) => void;
}
