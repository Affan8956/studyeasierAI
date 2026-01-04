
import { GoogleGenAI, Type } from "@google/genai";
import { Message, AIMode } from "../types";

const PRO_MODEL = "gemini-3-pro-preview";
const IMAGE_MODEL = "gemini-2.5-flash-image";

const MATH_INSTRUCTION = "For mathematical formulas or equations, ALWAYS use LaTeX brackets: '\\(' and '\\)' for inline math, and '\\[' and '\\]' for block math. NEVER use single or double dollar signs ($ or $$) as they interfere with currency formatting. STRICT RULES: 1. Escape all currency symbols (e.g., \\$1,000). 2. Ensure all LaTeX is syntactically correct.";

const SYSTEM_PROMPTS: Record<AIMode, string> = {
  study: `You are an expert academic tutor. Break down complex topics into simple analogies. Use markdown headers. Always respond in English. Provide deep, structured reasoning. ${MATH_INSTRUCTION}`,
  coding: "You are a senior software engineer. Provide high-quality, documented code blocks. Be concise. Always respond in English.",
  writing: "You are a creative editor. Help users draft prose. Focus on tone, style, and structure. Always respond in English.",
  tutor: `You are a Socratic teacher. Guide users with questions instead of giving direct answers. Always respond in English. ${MATH_INSTRUCTION}`,
  research: `You are a technical analyst. Provide dense, data-driven explanations with structured evidence. Always respond in English. ${MATH_INSTRUCTION}`
};

// --- CHAT STREAMING ---
export const streamChatResponse = async (
  history: Message[],
  currentMessage: string,
  mode: AIMode,
  onChunk: (text: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  })).concat([{ role: 'user', parts: [{ text: currentMessage }] }]);

  try {
    const stream = await ai.models.generateContentStream({
      model: PRO_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPTS[mode],
        thinkingConfig: { thinkingBudget: 15000 },
        maxOutputTokens: 30000,
        temperature: 0.7
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error: any) {
    throw new Error(error.message || "AI Engine Error");
  }
};

// --- SLIDE IMAGE GENERATION ---
export const generateSlideImage = async (title: string, context: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const visualPrompt = `Generate a professional educational visual for a lecture slide.
  Subject: ${title}
  Context: ${context}
  Style: Academic, high-quality render, no text.`;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: visualPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("No candidate returned");

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response");
  } catch (err) {
    console.error("Image generation failed:", err);
    return `https://loremflickr.com/1280/720/${encodeURIComponent(title || 'education')}`;
  }
};

// --- UNIFIED LAB PROCESSING ---
export const processUnifiedLabContent = async (
  source: { file?: { base64: string; mimeType: string }; url?: string }
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const instruction = `You are a world-class academic content architect. 
  
  PROCESS:
  1. Analyze ${source.url ? 'URL' : 'file'}. Use Search for URLs.
  2. Language: English.
  
  OUTPUT:
  - TITLE: Course title.
  - MASTER SUMMARY: Structured markdown.
  - MATHEMATICAL NOTATION: ${MATH_INSTRUCTION}
  - QUIZ: 10 MCQ with explanations.
  - SLIDES (12 Slides): Bullets, script, image keyword.

  JSON FORMAT ONLY.`;

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
    required: ["title", "summary", "quiz", "slides"]
  };

  const parts: any[] = [];
  if (source.file) {
    parts.push({ inlineData: { data: source.file.base64, mimeType: source.file.mimeType } });
  } else if (source.url) {
    parts.push({ text: `Analyze source: ${source.url}` });
  }
  parts.push({ text: instruction });

  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema,
      tools: source.url ? [{ googleSearch: {} }] : [],
      thinkingConfig: { thinkingBudget: 25000 },
      maxOutputTokens: 30000,
      temperature: 0.1
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    throw new Error("Failed to parse AI response.");
  }
};
