
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { 
  StudentProfileData, 
  AIStudyCoachResponse, 
  AIInsightsResponse, 
  StudySession, 
  LabPackage, 
  AISessionSuggestion,
  TimerMode
} from '../types';

const PRO_MODEL = 'gemini-3-pro-preview';
const FLASH_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const SEARCH_MODEL = 'gemini-3-flash-preview';

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(r => setTimeout(r, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
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
  - SPECIFIC WEEKLY SCHEDULE (Classes/Commitments): 
    "${studentProfile.detailedSchedule || studentProfile.lectureTimes}"
  ` : "No specific student profile provided.";

  const instruction = `You are an elite Academic Performance Coach & Scheduler.
  
  YOUR TASK:
  1. Analyze the student's usage data (${analyticsSummary}) and their DETAILED PROFILE.
  2. Create a HIGHLY SPECIFIC, HOUR-BY-HOUR Daily Schedule for tomorrow.
     - CRITICAL: You MUST strictly adhere to their "SPECIFIC WEEKLY SCHEDULE". Do not schedule study during their classes/work.
     - If they listed specific times for Mon/Tue/etc, identify what day tomorrow is and plan accordingly.
     - Balance deep study blocks for their major around their existing commitments.
     - Include breaks, meals, and sleep based on their wake/sleep times.
  3. Provide a diagnosis of their current habits.
  
  OUTPUT FORMAT:
  JSON only. Strict schema.
  
  TONE: Professional, encouraging, highly specific to their major.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      diagnosis: { type: Type.STRING },
      daily_schedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time_block: { type: Type.STRING, description: "e.g. '07:00 AM - 08:00 AM'" },
            activity: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["study", "class", "break", "lifestyle"] },
            notes: { type: Type.STRING, description: "Specific advice for this block" }
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

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: PRO_MODEL, // Upgraded to PRO for complex scheduling
      contents: { parts: [{ text: instruction }, { text: `Analytics: ${analyticsSummary}\n${profileContext}` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 4096 }
      }
    })) as GenerateContentResponse;

    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    console.error("Coach gen failed", e);
    throw new Error("Coach unavailable");
  }
};

export const generateStudyInsights = async (sessions: StudySession[]): Promise<AIInsightsResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const dataStr = JSON.stringify(sessions.slice(0, 50)); // Last 50 sessions
  
  const instruction = `Analyze these study sessions. Provide key insights and suggest optimization. Return JSON.`;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      insights: { type: Type.ARRAY, items: { type: Type.STRING } },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      study_pattern: {
        type: Type.OBJECT,
        properties: {
            best_time: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening', 'night'] },
            most_effective_mode: { type: Type.STRING, enum: ['focus', 'deep_study', 'revision', 'break', 'stopwatch', 'custom'] }
        },
        required: ["best_time", "most_effective_mode"]
      }
    },
    required: ["insights", "suggestions", "study_pattern"]
  };

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: FLASH_MODEL,
      contents: { parts: [{ text: instruction }, { text: `Data: ${dataStr}` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema
      }
    })) as GenerateContentResponse;

    return JSON.parse(response.text || "{}");
  } catch (e) {
    // Fallback default
    return {
      insights: ["Keep studying to generate insights."],
      suggestions: ["Try a Pomodoro timer."],
      study_pattern: { best_time: 'morning', most_effective_mode: 'focus' }
    };
  }
};

export const processUnifiedLabContent = async (
  sourcePayload: { file?: { base64: string; mimeType: string }; url?: string }
): Promise<LabPackage> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let parts: any[] = [];
    if (sourcePayload.file) {
        parts.push({
            inlineData: {
                data: sourcePayload.file.base64,
                mimeType: sourcePayload.file.mimeType
            }
        });
    } else if (sourcePayload.url) {
        // Note: For YouTube URLs, typically we need transcript text. 
        // Assuming the 'url' is passed as text for the model to "browse" or analyze if possible, 
        // OR we just pass the URL string and hope the model knows it (it can't browse directly without tools, but for this mock we pass context).
        // Since we can't fetch YT transcript client-side easily without a proxy, we'll pass the URL as text.
        parts.push({ text: `Source URL: ${sourcePayload.url}. (If this is a video, assume context from general knowledge of the topic).` });
    }

    const instruction = `
    Analyze the provided content (document or context). 
    Generate a comprehensive study package containing:
    1. A detailed Markdown summary.
    2. A quiz with 5-10 questions.
    3. 5-10 Flashcards.
    4. A plan for 3-5 presentation slides.
    
    Return strict JSON.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            summary: { 
                type: Type.OBJECT,
                properties: { content: { type: Type.STRING } },
                required: ["content"]
            },
            quiz: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.INTEGER },
                        explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "correctAnswer", "explanation"]
                }
            },
            flashcards: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING }
                    },
                    required: ["front", "back"]
                }
            },
            slides: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        slideTitle: { type: Type.STRING },
                        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                        speakerNotes: { type: Type.STRING },
                        imageKeyword: { type: Type.STRING }
                    },
                    required: ["slideTitle", "bullets", "speakerNotes", "imageKeyword"]
                }
            }
        },
        required: ["title", "summary", "quiz", "flashcards", "slides"]
    };

    parts.push({ text: instruction });

    const response = await retryWithBackoff(() => ai.models.generateContent({
        model: PRO_MODEL,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema,
            thinkingConfig: { thinkingBudget: 2048 }
        }
    }));

    return JSON.parse(response.text || "{}");
};

export const performDeepResearch = async (query: string): Promise<{ text: string; groundingChunks: any[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
        model: SEARCH_MODEL,
        contents: `Research this topic in depth: ${query}`,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    // The output response.text may not be in JSON format; do not attempt to parse it as JSON.
    // We return the text and the grounding metadata chunks for the UI to display citations.
    return {
        text: response.text || "No results found.",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
};

export const analyzeImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64,
                        mimeType: mimeType
                    }
                },
                { text: prompt || "Analyze this image." }
            ]
        }
    });
    
    return response.text || "Analysis failed.";
};

export const generateStudyImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-2.5-flash-image for generation as per guidelines "Generate images using gemini-2.5-flash-image by default"
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: prompt }] },
        config: {
            // responseMimeType is not supported for nano banana series models.
        }
    });

    // Extract image from response
    // The output response may contain both image and text parts; iterate through parts.
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
                 return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
             }
        }
    }
    
    throw new Error("No image generated");
};

export const streamChatResponse = async (
    history: any[], 
    newMessage: string, 
    mode: string, 
    onChunk: (chunk: string) => void
): Promise<void> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let systemInstruction = "You are a helpful AI study assistant.";
    if (mode === 'tutor') systemInstruction = "You are a Socratic tutor. Guide the student with questions.";
    if (mode === 'coding') systemInstruction = "You are a senior software engineer helper.";

    // Convert history format if necessary, assuming simple {role, content} objects
    const chatHistory = history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
    }));

    const chat: Chat = ai.chats.create({
        model: FLASH_MODEL,
        history: chatHistory,
        config: { systemInstruction }
    });

    const responseStream = await chat.sendMessageStream({ message: newMessage });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
            fullText += text;
            onChunk(fullText);
        }
    }
};

export const generateSlideImage = async (slideTitle: string, bulletPoints: string): Promise<string> => {
    // Generate a visual for the slide
    return generateStudyImage(`A clean, educational illustration for a presentation slide titled "${slideTitle}". Context: ${bulletPoints}`);
};

export const generateSessionSuggestion = async (): Promise<AISessionSuggestion> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const now = new Date();
    const hour = now.getHours();
    
    const instruction = `
      It is currently ${hour}:00. 
      Suggest an optimal study session configuration.
      Return JSON.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recommended_duration: { type: Type.INTEGER },
            recommended_mode: { type: Type.STRING, enum: ['focus', 'deep_study', 'revision', 'break'] },
            recommended_feature: { type: Type.STRING, enum: ['slides', 'flashcards', 'quiz', 'summary'] },
            reason: { type: Type.STRING },
            time_insight: { type: Type.STRING }
        },
        required: ["recommended_duration", "recommended_mode", "recommended_feature", "reason", "time_insight"]
    };

    try {
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: instruction,
            config: {
                responseMimeType: "application/json",
                responseSchema
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return {
            recommended_duration: 25,
            recommended_mode: 'focus',
            recommended_feature: 'summary',
            reason: "Defaulting to Focus mode.",
            time_insight: "Any time is good for a quick session."
        };
    }
};
