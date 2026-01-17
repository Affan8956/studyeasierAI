
import { GoogleGenAI, Type, GenerateContentResponse, Chat, LiveServerMessage, Modality } from "@google/genai";
import { 
  StudentProfileData, 
  AIStudyCoachResponse, 
  AIInsightsResponse, 
  StudySession, 
  LabPackage, 
  AISessionSuggestion,
  TimerMode,
  AIMode,
  Message
} from '../types';

const PRO_MODEL = 'gemini-3-pro-preview';
const FLASH_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const SEARCH_MODEL = 'gemini-3-flash-preview';
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries === 0) throw err;
    // Retry on 429 (Quota) or 503 (Service Unavailable)
    if (err.status === 429 || err.status === 503 || (err.message && err.message.includes('429'))) {
        await new Promise(r => setTimeout(r, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export const generateStudyCoach = async (
  analyticsSummary: string, 
  studentProfile?: StudentProfileData
): Promise<AIStudyCoachResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const profileContext = studentProfile ? `
  STUDENT PROFILE:
  - Career Goal: ${studentProfile.careerGoal}
  - Major/Field: ${studentProfile.fieldOfStudy}
  - Institution: ${studentProfile.institution} (${studentProfile.degreeType})
  - Wake Up: ${studentProfile.wakeUpTime}, Sleep: ${studentProfile.bedTime}
  - SPECIFIC WEEKLY SCHEDULE: "${studentProfile.detailedSchedule || studentProfile.lectureTimes}"
  ` : "No specific student profile provided.";

  const instruction = `You are an elite Academic Performance Coach. Analyze data and create a specific schedule. Return JSON.`;
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      diagnosis: { type: Type.STRING },
      daily_schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time_block: { type: Type.STRING },
            activity: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["study", "class", "break", "lifestyle"] },
            notes: { type: Type.STRING }
          },
          required: ["time_block", "activity", "type", "notes"]
        }
      },
      weekly_plan: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING },
            recommended_minutes: { type: Type.INTEGER },
            focus: { type: Type.STRING }
          },
          required: ["day", "recommended_minutes", "focus"]
        }
      },
      motivation: { type: Type.STRING }
    },
    required: ["diagnosis", "daily_schedule", "weekly_plan", "motivation"]
  };

  // Using FLASH_MODEL to conserve quota
  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: FLASH_MODEL,
    contents: { parts: [{ text: instruction }, { text: `Analytics: ${analyticsSummary}\n${profileContext}` }] },
    config: { responseMimeType: "application/json", responseSchema }
  }));
  return JSON.parse(response.text || "{}");
};

export const generateStudyInsights = async (sessions: StudySession[]): Promise<AIInsightsResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: FLASH_MODEL,
    contents: `Analyze: ${JSON.stringify(sessions.slice(0, 50))}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          study_pattern: {
            type: Type.OBJECT,
            properties: {
                best_time: { type: Type.STRING },
                most_effective_mode: { type: Type.STRING }
            },
            required: ["best_time", "most_effective_mode"]
          }
        },
        required: ["insights", "suggestions", "study_pattern"]
      }
    }
  }));
  return JSON.parse(response.text || "{}");
};

export const processUnifiedLabContent = async (
  sourcePayload: { file?: { base64: string; mimeType: string }; url?: string }
): Promise<LabPackage> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let parts: any[] = [];
    if (sourcePayload.file) {
        parts.push({ inlineData: { data: sourcePayload.file.base64, mimeType: sourcePayload.file.mimeType } });
    } else if (sourcePayload.url) {
        parts.push({ text: `Context: ${sourcePayload.url}` });
    }
    parts.push({ text: "Generate study package: summary, quiz, flashcards, slides. Return strict JSON." });
    
    // Using FLASH_MODEL to conserve quota for large context tasks
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: FLASH_MODEL,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.OBJECT, properties: { content: { type: Type.STRING } }, required: ["content"] },
                    quiz: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["question", "options", "correctAnswer", "explanation"] } },
                    flashcards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }, required: ["front", "back"] } },
                    slides: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { slideTitle: { type: Type.STRING }, bullets: { type: Type.ARRAY, items: { type: Type.STRING } }, speakerNotes: { type: Type.STRING }, imageKeyword: { type: Type.STRING } }, required: ["slideTitle", "bullets", "speakerNotes", "imageKeyword"] } }
                },
                required: ["title", "summary", "quiz", "flashcards", "slides"]
            }
        }
    }));
    return JSON.parse(response.text || "{}");
};

export const performDeepResearch = async (query: string): Promise<{ text: string; groundingChunks: any[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: SEARCH_MODEL,
        contents: `Research: ${query}`,
        config: { tools: [{ googleSearch: {} }] }
    }));
    return {
        text: response.text || "No results.",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
};

export const analyzeImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: FLASH_MODEL,
        contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt || "Analyze." }] }
    }));
    return response.text || "Analysis failed.";
};

export const generateStudyImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: prompt }] }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No image.");
};

export const generateSlideImage = async (title: string, bullets: string): Promise<string> => {
    return generateStudyImage(`Diagram for ${title}: ${bullets}`);
};

export const generateSessionSuggestion = async (): Promise<AISessionSuggestion> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
    model: FLASH_MODEL,
    contents: "Suggest study mode.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { recommended_duration: { type: Type.INTEGER }, recommended_mode: { type: Type.STRING }, recommended_feature: { type: Type.STRING }, reason: { type: Type.STRING }, time_insight: { type: Type.STRING } },
        required: ["recommended_duration", "recommended_mode", "recommended_feature", "reason", "time_insight"]
      }
    }
  }));
  return JSON.parse(response.text || "{}");
};

export const streamChatResponse = async (history: Message[], input: string, mode: AIMode, onChunk: (chunk: string) => void) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let systemInstruction = "";
  // Specific System Prompts for Study vs Tutor
  switch (mode) {
    case 'tutor':
      systemInstruction = `You are a Socratic AI Tutor.
      YOUR GOAL: Help the student arrive at the answer themselves through deep reasoning.
      
      STRICT RULES FOR TUTOR MODE:
      1. NEVER provide the direct answer immediately.
      2. If the user asks a question, reply with a guiding question or a hint.
      3. Break down complex problems into smaller steps and ask the user to solve the first step.
      4. Only provide the full solution if the user has failed multiple attempts and explicitly asks for the answer.
      5. Tone: Patient, encouraging, professor-like.
      
      Example Interaction:
      User: "What is the derivative of x^2?"
      Tutor: "Think about the power rule. What happens to the exponent when you differentiate?"`;
      break;
    case 'coding':
      systemInstruction = `You are a Senior Software Engineer.
      YOUR GOAL: Provide efficient, clean, and modern code solutions.
      RULES:
      1. Write production-ready code with comments.
      2. Explain the logic, time complexity, and trade-offs.
      3. Prefer modern syntax and best practices.`;
      break;
    case 'study':
    default:
      systemInstruction = `You are StudyEasierAI, a comprehensive academic assistant.
      YOUR GOAL: Provide direct, detailed, and accurate knowledge instantly.
      
      STRICT RULES FOR STUDY MODE:
      1. Give straightforward, comprehensive, and detailed answers immediately.
      2. Do NOT ask follow-up questions unless clarification is strictly needed.
      3. Use bullet points, bold text, and clear headings to structure long answers.
      4. Use LaTeX for math equations (e.g., $E=mc^2$).
      5. Explain complex concepts with simple analogies after the technical definition.`;
      break;
  }

  // Use FLASH_MODEL for chat as well to avoid 429 Resource Exhausted on Pro
  const chat = ai.chats.create({
    model: FLASH_MODEL,
    config: { systemInstruction },
    history: history.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
  });

  // Retry logic specifically for the stream connection
  let response;
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      response = await chat.sendMessageStream({ message: input });
      break;
    } catch (e: any) {
      if (retries === 1) throw e;
      if (e.status === 429 || e.status === 503 || e.message?.includes('429')) {
         await new Promise(r => setTimeout(r, delay));
         delay *= 2;
         retries--;
      } else {
        throw e;
      }
    }
  }

  if (!response) throw new Error("Failed to connect to AI service.");
  
  // FIX: Accumulate text chunks to ensure proper streaming display
  let fullText = "";
  for await (const chunk of response) {
    const c = chunk as GenerateContentResponse;
    const delta = c.text || "";
    fullText += delta;
    onChunk(fullText);
  }
};

export class GeminiLiveClient {
  private sessionPromise: Promise<any> | null = null;
  private ai: GoogleGenAI | null = null;

  async connect(config: { voiceName: string; systemInstruction: string }, callbacks: any) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.sessionPromise = this.ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } }
        },
        systemInstruction: config.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks
    });
    await this.sessionPromise;
  }

  async disconnect() {
    if (this.sessionPromise) {
      try {
        const session = await this.sessionPromise;
        await session.close();
      } catch(e) {}
      this.sessionPromise = null;
    }
  }

  sendAudioChunk(base64: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        session.sendRealtimeInput({
          media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      }).catch(() => {});
    }
  }

  sendImageFrame(base64: string, mimeType: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then((session) => {
        session.sendRealtimeInput({
          media: { data: base64, mimeType }
        });
      }).catch(() => {});
    }
  }
}
