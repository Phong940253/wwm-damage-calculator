import { getGeminiRuntimeSettings } from "@/app/utils/geminiSettings";

export async function callGeminiVision(
  base64Image: string,
  prompt: string,
): Promise<unknown> {
  const { apiKey, model } = getGeminiRuntimeSettings();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Set it in Settings or NEXT_PUBLIC_GEMINI_API_KEY.",
    );
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      }),
    },
  );

  const json = await res.json();

  if (!res.ok) {
    console.error("Gemini error:", json);
    throw new Error(json.error?.message || "Gemini OCR failed");
  }

  // Gemini returns TEXT, not JSON object
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Empty Gemini response");
  }

  return JSON.parse(text);
}
