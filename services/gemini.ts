import fetch from 'node-fetch';
import { GeneratedContent } from "../types";

// Use GRS AI endpoint (compatible with OpenAI chat/completions)
const API_BASE = process.env.GRSAI_API_BASE ?? 'https://api.grsai.com';
const API_KEY = process.env.GRSAI_API_KEY ?? process.env.OPENAI_API_KEY;

export const generateCreativeContent = async (mood: string, lang: 'en' | 'zh'): Promise<GeneratedContent> => {
  try {
    if (!API_KEY) throw new Error('Missing GRS AI API key. Set process.env.GRSAI_API_KEY or process.env.OPENAI_API_KEY');

    const model = 'gemini-2.5-flash-lite';

    const systemMsg = 'You are a helpful assistant that outputs valid JSON when asked. Do not include any extra commentary.';
    const langInstruction = lang === 'zh'
      ? 'Generate the title and subtitle in Simplified Chinese (zh-CN).'
      : 'Generate the title and subtitle in English.';

    const userPrompt = `Generate a creative design concept for a "Diffuse Gradient" graphic poster based on this mood/theme: "${mood}". ` +
      `${langInstruction} Return a JSON object with the following shape: {\n  \"title\": string (catchy, max 4 words),\n  \"subtitle\": string (poetic/descriptive, max 10 words),\n  \"colors\": [\"#RRGGBB\", ...] (exactly 5 hex color codes)\n}. Respond with ONLY the JSON object.`;

    const body = {
      model,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      stream: false
    } as any;

    const res = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GRSAI API error ${res.status} ${res.statusText}: ${text}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? '';
    if (!raw) throw new Error('No content returned from GRS AI');

    // Try to parse JSON from the assistant response. The assistant may wrap JSON in code fences.
    let parsed: GeneratedContent | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const m = raw.match(/\{[\\s\\S]*\}/);
      if (m) {
        parsed = JSON.parse(m[0]);
      } else {
        throw new Error('Failed to parse JSON from assistant response');
      }
    }

    // Basic validation: ensure title, subtitle, colors exist
    if (!parsed || !parsed.title || !parsed.subtitle || !Array.isArray(parsed.colors) || parsed.colors.length !== 5) {
      throw new Error('Parsed response does not match expected GeneratedContent shape');
    }

    return parsed;
  } catch (error) {
    console.error('Gemini (GRS AI) generation failed:', error);
    return {
      title: lang === 'zh' ? '生成错误' : 'Error Generating',
      subtitle: lang === 'zh' ? '请检查API Key或重试。' : 'Please check your API key or try again.',
      colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff"]
    } as GeneratedContent;
  }
};

export default { generateCreativeContent };