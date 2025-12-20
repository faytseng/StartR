
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, USER_PROMPT_TEMPLATE } from "../constants";
import { ExpressionItem } from "../types";

// 初始化 GoogleGenAI 實例
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateExpressionImage(
  base64Image: string,
  expressionEn: string,
  mimeType: string,
  isCuteAnime: boolean = false,
  isSituational: boolean = false,
  stickerText: string = "",
  autoText: boolean = false
): Promise<string> {
  const dataOnly = base64Image.split(',')[1] || base64Image;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: dataOnly,
            mimeType: mimeType,
          },
        },
        {
          text: USER_PROMPT_TEMPLATE(expressionEn, isCuteAnime, isSituational, stickerText, autoText),
        },
      ],
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      imageConfig: {
        aspectRatio: "1:1"
      }
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from model.");
}

export async function translateExpression(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following expression description to a short English phrase suitable for an AI image prompt: "${text}". Only return the translation.`,
  });
  return response.text?.trim() || text;
}

/**
 * 根據主題生成一組表情清單
 */
export async function generateThemedExpressions(theme: string): Promise<Partial<ExpressionItem>[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `請針對主題「${theme}」生成 8 個適合做成 LINE 貼圖的表情或動作清單。
    每個項目需要包含：
    1. name: 繁體中文名稱 (例如: "拍美照", "迷路了")
    2. en: 詳細的英文描述，用於 AI 繪圖 Prompt (例如: "excited expression while taking a photo with a camera")
    
    請以 JSON 格式輸出。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            en: { type: Type.STRING },
          },
          required: ["name", "en"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse themed expressions", e);
    return [];
  }
}
