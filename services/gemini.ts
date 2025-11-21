import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedContent } from "../types";

// Initialize the client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A catchy, short, artistic title for a poster cover (max 4 words).",
    },
    subtitle: {
      type: Type.STRING,
      description: "A poetic or descriptive subtitle (max 10 words).",
    },
    colors: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A hex color code (e.g., #FF5733).",
      },
      description: "A palette of exactly 5 hex colors that match the mood.",
    },
  },
  required: ["title", "subtitle", "colors"],
};

export const generateCreativeContent = async (mood: string): Promise<GeneratedContent> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Generate a creative design concept for a "Diffuse Gradient" graphic poster based on this mood/theme: "${mood}". 
      Return a JSON object with a catchy title, a subtitle, and a palette of 5 distinct, vibrant colors that blend well together.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8, // Slightly creative
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini");

    const data = JSON.parse(jsonText) as GeneratedContent;
    return data;
  } catch (error) {
    console.error("Gemini generation failed:", error);
    // Fallback if API fails
    return {
      title: "Error Generating",
      subtitle: "Please check your API key or try again.",
      colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff"]
    };
  }
};