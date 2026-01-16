
export type AIMode = 'study' | 'coding' | 'writing' | 'tutor' | 'research';
export type ViewState = 'dashboard' | 'chat' | 'lab' | 'vault' | 'settings' | 'research' | 'tutor' | 'vision' | 'about' | 'analytics' | 'focus_studio';
export type LabTool = 'summary' | 'quiz' | 'slides' | 'flashcards' | 'research' | 'image_analysis';
export type AppTheme = 'default' | 'light' | 'eyecare' | 'custom';
export type TimerMode = 'focus' | 'deep_study' | 'revision' | 'break' | 'stopwatch' | 'custom';

export interface CustomThemeColors {
  bgApp: string;
  bgSurface: string;
  borderBase: string;
  textMain: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultMode: AIMode;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  mode: TimerMode;
  featureUsed?: string;
  topic?: string;
  createdAt: number;
}

export interface ShareRequest {
  request_id: string;
  resource_type: 'asset' | 'vault';
  asset_title: string;
  shared_by_name: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  mode: AIMode;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Slide {
  slideTitle: string;
  bullets: string[];
  speakerNotes: string;
  imageKeyword: string; // Used to fetch relevant imagery
}

export interface LabAsset {
  id: string;
  userId: string;
  title: string;
  type: LabTool;
  content: any; // Can be string (summary), array (quiz), or array (slides)
  sourceName: string;
  timestamp: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface LabState {
  isLoading: boolean;
  currentPackage: any | null;
  error: string | null;
  lastSourceInfo: string | null;
  activeTab?: LabTool;
}

export interface ResearchState {
  isLoading: boolean;
  result: { text: string; groundingChunks: GroundingChunk[] } | null;
  error: string | null;
  query: string;
}

export interface VisionState {
  isLoading: boolean;
  mode: 'analyze' | 'generate';
  image: string | null; // Base64 data URI for preview (Analysis) or Result (Generation)
  generatedImage: string | null; // Specific field for generated results
  mimeType: string;
  prompt: string;
  result: string | null;
  error: string | null;
}

// --- AI INTELLIGENCE TYPES ---

export interface AIStudyCoachResponse {
  diagnosis: string;
  weekly_plan: {
    day: string;
    recommended_minutes: number;
    focus: string;
  }[];
  motivation: string;
}

export interface AIInsightsResponse {
  insights: string[];
  suggestions: string[];
  study_pattern: {
    best_time: 'morning' | 'afternoon' | 'evening' | 'night';
    most_effective_mode: TimerMode;
  };
}

export interface AIProductivityResponse {
  study_iq: number;
  breakdown: {
    focus: number;
    consistency: number;
    variety: number;
  };
  summary: string;
}

export interface AISessionSuggestion {
  recommended_duration: number;
  recommended_mode: TimerMode;
  recommended_feature: 'slides' | 'flashcards' | 'quiz' | 'summary';
  reason: string;
  time_insight: string;
}
