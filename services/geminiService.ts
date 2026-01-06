
import { GoogleGenAI, Type } from "@google/genai";
import { Message, AIMode } from "../types";

// --- CONFIGURATION ---
const GEMINI_MODEL = "gemini-3-pro-preview";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

// Backup Models
const DEEPSEEK_MODEL = "deepseek-chat"; 
const OPENAI_MODEL = "gpt-4o";

const MATH_INSTRUCTION = "When using mathematical formulas, scientific notation, or equations, ALWAYS use standard LaTeX formatting. Use '$' for inline math and '$$' for block math (equations on their own line).";

const SYSTEM_PROMPTS: Record<AIMode, string> = {
  study: `You are an expert academic tutor. Break down complex topics into simple analogies. Use markdown headers. Always respond in English. Provide deep, structured reasoning. ${MATH_INSTRUCTION}`,
  coding: "You are a senior software engineer. Provide high-quality, documented code blocks. Be concise. Always respond in English.",
  writing: "You are a creative editor. Help users draft prose. Focus on tone, style, and structure. Always respond in English.",
  tutor: `You are a Socratic teacher. Guide users with questions instead of giving direct answers. Always respond in English. ${MATH_INSTRUCTION}`,
  research: `You are a technical analyst. Provide dense, data-driven explanations with structured evidence. Always respond in English. ${MATH_INSTRUCTION}`
};

// --- HELPER: OpenAI-Compatible Fetcher (For DeepSeek/OpenAI/Groq etc) ---
const fetchOpenAICompatible = async (
  apiKey: string,
  baseUrl: string,
  modelName: string,
  messages: any[],
  temperature: number,
  onChunk?: (text: string) => void,
  jsonMode: boolean = false
): Promise<string> => {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: temperature,
        stream: !!onChunk,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Backup API Error (${modelName}): ${err}`);
    }

    // Handle Streaming
    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.replace("data: ", ""));
              const content = json.choices[0]?.delta?.content || "";
              if (content) {
                fullText += content;
                onChunk(fullText);
              }
            } catch (e) { /* ignore parse errors on partial chunks */ }
          }
        }
      }
      return fullText;
    } 
    // Handle Non-Streaming
    else {
      const json = await response.json();
      return json.choices[0]?.message?.content || "";
    }
  } catch (error: any) {
    throw new Error(error.message || "Backup Provider Failed");
  }
};

// --- CHAT STREAMING ---
export const streamChatResponse = async (
  history: Message[],
  currentMessage: string,
  mode: AIMode,
  onChunk: (text: string) => void
) => {
  // 1. Convert History for Gemini
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  })).concat([{ role: 'user', parts: [{ text: currentMessage }] }]);

  // --- ATTEMPT 1: GOOGLE GEMINI ---
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
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
    console.warn("Gemini Failed. Attempting Backups...", error);
    
    // Construct Standard Messages for OpenAI/DeepSeek
    const standardMessages = [
      { role: "system", content: SYSTEM_PROMPTS[mode] },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: currentMessage }
    ];

    // --- ATTEMPT 2: DEEPSEEK ---
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        onChunk("⚠️ Switching to DeepSeek v3 (Backup)... \n\n");
        return await fetchOpenAICompatible(
          process.env.DEEPSEEK_API_KEY,
          "https://api.deepseek.com",
          DEEPSEEK_MODEL,
          standardMessages,
          0.7,
          onChunk
        );
      } catch (dsError) {
        console.warn("DeepSeek Failed:", dsError);
      }
    }

    // --- ATTEMPT 3: OPENAI ---
    if (process.env.OPENAI_API_KEY) {
      try {
        onChunk("⚠️ Switching to OpenAI GPT-4o (Backup)... \n\n");
        return await fetchOpenAICompatible(
          process.env.OPENAI_API_KEY,
          "https://api.openai.com/v1",
          OPENAI_MODEL,
          standardMessages,
          0.7,
          onChunk
        );
      } catch (oaError) {
        console.warn("OpenAI Failed:", oaError);
      }
    }

    throw new Error("All AI providers failed. Please try again later.");
  }
};

// --- SLIDE IMAGE GENERATION ---
export const generateSlideImage = async (title: string, context: string): Promise<string> => {
  // We strictly use Gemini for Images as text models can't generate images.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const visualPrompt = `A high-resolution, professional, and educational 3D render or cinematic photograph for a lecture slide.
  Subject: ${title}
  Content Context: ${context}
  Visual Style: Modern, clean, academic aesthetic, 4K, realistic textures, volumetric lighting. 
  Requirement: NO TEXT in the image. Scientific and instructional vibes. Highly relatable to the subject matter.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: { parts: [{ text: visualPrompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return `https://loremflickr.com/1280/720/${encodeURIComponent(title || 'education')}`;
  } catch (err) {
    console.error("Image generation failed:", err);
    return `https://loremflickr.com/1280/720/${encodeURIComponent(title || 'education')}`;
  }
};

// --- UNIFIED LAB PROCESSING ---
export const processUnifiedLabContent = async (
  source: { file?: { base64: string; mimeType: string }; url?: string }
): Promise<any> => {
  const instruction = `You are a world-class academic researcher and content architect. 

  CORE RESEARCH PROTOCOL (CRITICAL):
  1. SOURCE ANALYSIS: Exhaustively analyze the provided ${source.url ? 'URL' : 'file'}. 
  2. GROUNDING (URLs): If a URL is provided, YOU MUST USE GOOGLE SEARCH to retrieve verified data.
  3. ANTI-HALLUCINATION: Do NOT invent content.
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

  JSON FORMAT: Respond ONLY with a valid JSON object matching the requested schema.`;

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

  // --- ATTEMPT 1: GOOGLE GEMINI ---
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [];
    if (source.file) {
      parts.push({ inlineData: { data: source.file.base64, mimeType: source.file.mimeType } });
    } else if (source.url) {
      parts.push({ 
        text: `DEEP RESEARCH TASK: Retrieve and analyze the full content of this source: ${source.url}. 
        Start by searching for the transcript. Ensure the analysis is 100% grounded in the retrieved text.` 
      });
    }
    parts.push({ text: instruction });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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

    const text = response.text || "{}";
    if (text.includes("CONTENT_UNAVAILABLE")) throw new Error("Content Unavailable");
    return JSON.parse(text);

  } catch (geminiError: any) {
    console.warn("Gemini Lab Processing Failed. Attempting Backups...", geminiError);

    // If source is a file/image, backups (DeepSeek/OpenAI) often require specific handling.
    // For this generic backup, we will only fallback if it's text/url based or if the user provided text.
    // NOTE: Sending raw PDFs/Audio to OpenAI/DeepSeek API directly via fetch is complex.
    // We will attempt a text-only fallback or fail if it requires file processing not supported by the simple backup fetcher.
    
    if (source.file) {
       throw new Error("Gemini File Analysis failed. Backup providers do not currently support direct file uploads in this mode. Please try again.");
    }

    const backupPrompt = `${instruction} \n\n RESPONSE MUST BE RAW JSON.`;
    const messages = [
        { role: 'system', content: "You are a JSON-only API. Output strict JSON." },
        { role: 'user', content: source.url ? `Analyze this URL: ${source.url}. ${backupPrompt}` : backupPrompt }
    ];

    // --- ATTEMPT 2: DEEPSEEK ---
    if (process.env.DEEPSEEK_API_KEY) {
        try {
            const raw = await fetchOpenAICompatible(
                process.env.DEEPSEEK_API_KEY, 
                "https://api.deepseek.com", 
                DEEPSEEK_MODEL, 
                messages, 
                0.1, 
                undefined, 
                true // json mode
            );
            return JSON.parse(raw);
        } catch (e) { console.warn("DeepSeek Lab Failed", e); }
    }

    // --- ATTEMPT 3: OPENAI ---
    if (process.env.OPENAI_API_KEY) {
        try {
            const raw = await fetchOpenAICompatible(
                process.env.OPENAI_API_KEY, 
                "https://api.openai.com/v1", 
                OPENAI_MODEL, 
                messages, 
                0.1, 
                undefined, 
                true // json mode
            );
            return JSON.parse(raw);
        } catch (e) { console.warn("OpenAI Lab Failed", e); }
    }

    throw new Error(geminiError.message || "All AI providers failed processing.");
  }
};
