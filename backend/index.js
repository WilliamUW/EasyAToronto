const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const PORT = 3001;

// Get API key from environment variable
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL = "gemini-2.0-flash";
const GEMINI_IMAGE_MODEL = "gemini-2.0-flash";

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post("/api/generate-answer", async (req, res) => {
  const { prompt } = req.body;

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });

  const generationConfig = {
    temperature: 0.9,
    topP: 1,
    topK: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  ];

  try {
    console.log("Generating answer...");
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: prompt
        }]
      }],
      generationConfig,
      safetySettings,
    });
    console.log(result.response.text());

    res.json({ answer: result.response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate answer." });
  }
});

// Endpoint to verify interview email image
app.post("/api/verify-interview-email", async (req, res) => {
  const { prompt, imageBase64 } = req.body;
  if (!prompt || !imageBase64) {
    return res.status(400).json({ error: "Missing prompt or imageBase64" });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_IMAGE_MODEL });

  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: imageBase64.replace(/^data:image\/\w+;base64,/, "") } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    });
    const text = result.response.text();
    const isVerified = /^\s*yes\b/i.test(text);
    res.json({ verified: isVerified, response: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify interview email." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});