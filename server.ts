import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Minimal proxy for local preview to match Netlify Functions structure
app.post("/.netlify/functions/feedback", async (req, res) => {
  try {
    const { systemInstruction, contents } = req.body;
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-latest"];
    let feedbackText = "";
    
    for (const modelName of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generationConfig: { temperature: 0, topK: 1, topP: 0 },
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: [{ parts: contents }]
            })
          }
        );
        if (response.ok) {
          const data = await response.json();
          feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (feedbackText) break;
        }
      } catch (err) {}
    }
    res.json({ text: feedbackText });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
