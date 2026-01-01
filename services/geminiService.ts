
import { GoogleGenAI, Type } from "@google/genai";
import { Message, AIMode } from "../types";

const PRO_MODEL = "gemini-3-pro-preview";
const IMAGE_MODEL = "gemini-2.5-flash-image";

const MATH_INSTRUCTION = "When using mathematical formulas, scientific notation, or equations, ALWAYS use standard LaTeX formatting. Use '$' for inline math and '$$' for block math (equations on their own line).";

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
  
  const visualPrompt = `A high-resolution, professional, and educational 3D render or cinematic photograph for a lecture slide.
  Subject: ${title}
  Content Context: ${context}
  Visual Style: Modern, clean, academic aesthetic, 4K, realistic textures, volumetric lighting. 
  Requirement: NO TEXT in the image. Scientific and instructional vibes. Highly relatable to the subject matter.`;

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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
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
  
  const instruction = `You are a world-class academic researcher and content architect. 

  CORE RESEARCH PROTOCOL (CRITICAL):
  1. SOURCE ANALYSIS: Exhaustively analyze the provided ${source.url ? 'URL' : 'file'}. 
  2. GROUNDING (URLs): If a URL is provided, YOU MUST USE GOOGLE SEARCH to retrieve:
     - The official video transcript or subtitles.
     - Detailed video descriptions and metadata.
     - Verified third-party summaries of the content.
  3. ANTI-HALLUCINATION: Do NOT invent content based on the URL slug or video title alone. If the search tool returns no transcript or content data, report an error: "CONTENT_UNAVAILABLE".
  4. LANGUAGE: Translate all extracted data into academic English.

  STRICT OUTPUT REQUIREMENTS:
  - TITLE: Concise, professional course title.
  - MASTER SUMMARY: 1200+ words of structured markdown. Use H1, H2, H3. Bold key concepts.
  - MATHEMATICAL NOTATION: ${MATH_INSTRUCTION}
  - QUIZ: 10 complex Multiple Choice Questions with high-value explanations.
  - SLIDES (12 Slides): 
    * 8+ bullet points per slide.
    * 250+ word expert script (speaker notes) per slide.
    * Descriptive keyword for high-res educational imagery.

  JSON FORMAT: Respond ONLY with a valid JSON object matching the responseSchema.`;

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
    parts.push({ 
      text: `DEEP RESEARCH TASK: Retrieve and analyze the full content of this source: ${source.url}. 
      Start by searching for the transcript: "transcript for ${source.url}" and "detailed summary of ${source.url}". 
      Ensure the analysis is 100% grounded in the retrieved text. Proceed with full package generation.` 
    });
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
    const text = response.text || "{}";
    if (text.includes("CONTENT_UNAVAILABLE")) {
      throw new Error("The AI could not securely retrieve the video content. This link might be private or restricted.");
    }
    return JSON.parse(text);
  } catch (e: any) {
    throw new Error(e.message || "Deep analysis pass failed. Content might be too large or complex for extraction.");
  }
};
