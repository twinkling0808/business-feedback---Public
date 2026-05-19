import { Handler } from "@netlify/functions";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { systemInstruction, contents } = JSON.parse(event.body || "{}");

    if (!contents) {
      return { statusCode: 400, body: JSON.stringify({ error: "Contents are required" }) };
    }

    // Attempt Gemini with fallback models
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-latest"];
    let feedbackText = "";
    let lastError = "";

    for (const modelName of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generationConfig: {
                temperature: 0,
                topK: 1,
                topP: 0
              },
              system_instruction: {
                parts: [{ text: systemInstruction }]
              },
              contents: [{
                parts: contents
              }]
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        if (feedbackText) break;
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!feedbackText) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: `AI 모델 연결 실패: ${lastError}` }) 
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text: feedbackText }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
