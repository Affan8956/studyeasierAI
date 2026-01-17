
export interface User {
  id: string;
  email: string;
  name: string;
  preferences?: {
    theme?: string;
    defaultMode?: string;
  };
}

export type AIMode = 'study' | 'coding' | 'tutor' | 'research' | 'live';

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

export type ViewState = 'dashboard' | 'chat' | 'tutor' | 'lab' | 'research' | 'vision' | 'vault' | 'analytics' | 'focus_studio' | 'about' | 'live';

export type LabTool = 'summary' | 'quiz' | 'flashcards' | 'slides';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface Slide {
  slideTitle: string;
  bullets: string[];
  speakerNotes: string;
  imageKeyword: string;
}

export interface LabPackage {
  title: string;
  summary: { content: string };
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  slides: Slide[];
}

export interface LabAsset {
  id: string;
  userId: string;
  title: string;
  type: 'summary' | 'quiz' | 'flashcards' | 'slides' | 'research' | 'image_analysis';
  content: any;
  sourceName: string;
  timestamp: number;
}

export interface LabState {
  isLoading: boolean;
  currentPackage: LabPackage | null;
  error: string | null;
  lastSourceInfo: string | null;
  activeTab: LabTool;
}

export interface ResearchResult {
  text: string;
  groundingChunks: { web?: { uri: string; title: string } }[];
}

export interface ResearchState {
  isLoading: boolean;
  result: ResearchResult | null;
  error: string | null;
  query: string;
}

export interface VisionState {
  isLoading: boolean;
  mode: 'analyze' | 'generate';
  image: string | null;
  generatedImage: string | null;
  mimeType: string;
  prompt: string;
  result: string | null;
  error: string | null;
}

export type AppTheme = 'default' | 'light' | 'eyecare' | 'midnight' | 'forest' | 'custom';

export interface CustomThemeColors {
  bgApp: string;
  bgSurface: string;
  borderBase: string;
  textMain: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface ShareRequest {
  request_id: string;
  resource_type: 'asset' | 'vault';
  asset_title: string;
  shared_by_name: string;
  created_at: string;
}

export type TimerMode = 'focus' | 'deep_study' | 'revision' | 'break' | 'stopwatch' | 'custom';

export interface StudentProfileData {
  careerGoal: string;
  fieldOfStudy: string;
  institution: string;
  degreeType: string;
  wakeUpTime: string;
  bedTime: string;
  lectureTimes: string;
  detailedSchedule: string;
}

export interface AIStudyCoachResponse {
  diagnosis: string;
  daily_schedule: {
    time_block: string;
    activity: string;
    type: 'study' | 'class' | 'break' | 'lifestyle';
    notes: string;
  }[];
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

export interface StudySession {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  mode: TimerMode;
  featureUsed: string;
  topic: string;
  createdAt: number;
}
