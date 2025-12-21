const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

export async function callGeminiVision(
  base64Image: string,
  prompt: string
): Promise<any> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
      process.env.NEXT_PUBLIC_GEMINI_API_KEY,
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
    }
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
