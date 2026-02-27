import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateRecipe = async (ingredients: string, seasonings: string, method: string) => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `你是一个米其林三星大厨。请根据以下信息生成一个详细且好吃的食谱。
    食材: ${ingredients}
    调味料: ${seasonings}
    偏好做法: ${method}
    
    请以Markdown格式输出，包含：
    1. 菜名 (富有吸引力)
    2. 难度与耗时
    3. 详细步骤
    4. 大厨贴士 (如何更好吃的秘诀)
    5. 营养简析`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "抱歉，暂时无法生成食谱。";
  } catch (error) {
    console.error("Recipe generation error:", error);
    return "生成食谱时发生错误，请稍后再试。";
  }
};

export const searchEncyclopedia = async (query: string) => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `你是一个食谱百科全书。请搜索并解释关于 "${query}" 的食谱或烹饪知识。
    如果是具体菜名，请提供经典做法。如果是食材，请提供挑选和处理建议。
    请用专业、亲切的语气回答。`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "未找到相关百科内容。";
  } catch (error) {
    console.error("Encyclopedia search error:", error);
    return "搜索百科时发生错误。";
  }
};

export const generateFoodImage = async (prompt: string, size: "1K" | "2K" | "4K" = "1K") => {
  try {
    // Switch to gemini-2.5-flash-image for free tier compatibility
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A professional food photography of ${prompt}, high resolution, appetizing, warm lighting, top-down view or 45 degree angle, bokeh background.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        },
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      return null;
    }

    const parts = response.candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        // Strictly clean base64 data to prevent "The string did not match the expected pattern"
        // Also ensure it's not already a data URL
        let rawData = part.inlineData.data;
        if (rawData.startsWith('data:')) {
          const commaIndex = rawData.indexOf(',');
          if (commaIndex !== -1) {
            rawData = rawData.substring(commaIndex + 1);
          }
        }
        const cleanData = rawData.replace(/[^A-Za-z0-9+/=]/g, '');
        if (cleanData.length > 0) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${cleanData}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating food image:", error);
    return null;
  }
};
