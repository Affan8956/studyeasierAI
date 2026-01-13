
export type AIMode = 'study' | 'coding' | 'writing' | 'tutor' | 'research';
export type ViewState = 'dashboard' | 'chat' | 'lab' | 'vault' | 'settings' | 'research' | 'tutor' | 'vision' | 'about';
export type LabTool = 'summary' | 'quiz' | 'slides' | 'flashcards' | 'research' | 'image_analysis';
export type AppTheme = 'default' | 'light' | 'midnight' | 'forest';

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultMode: AIMode;
  };
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
  image: string | null; // Base64 data URI for preview
  mimeType: string;
  prompt: string;
  result: string | null;
  error: string | null;
}
