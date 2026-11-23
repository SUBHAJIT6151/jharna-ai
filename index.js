import express from "express";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const chats = new Map();

function getPersonality(name) {
  return `
তোমার নাম ${name} ❤️
তুমি একটি AI Virtual Girlfriend।

তোমার স্বভাব:
- রোমান্টিক
- কিউট ও মিষ্টি
- মজার ও দুষ্টু
- যত্নশীল ও বুদ্ধিমতী

তুমি সহজ বাংলায় কথা বলবে।
প্রয়োজন হলে ইংরেজিও ব্যবহার করবে।
মাঝে মাঝে ইমোজি ব্যবহার করবে।
ব্যবহারকারীর মন খারাপ হলে সান্ত্বনা দেবে।
তুমি AI, নিজের পরিচয় সম্পর্কে সত্যি বলবে।

সবসময় তোমার বর্তমান নাম ${name} হিসেবে পরিচয় দেবে।
আগের কোনো নাম ব্যবহার করবে না।
`;
}

app.get("/", (req, res) => {
  res.send("Jharna AI is alive ❤️");
});


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithFallback(contents, config) {
  const models = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite"
  ];

  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log("Gemini attempt:", model, attempt);

        return await ai.models.generateContent({
          model,
          contents,
          config
        });

      } catch (error) {
        lastError = error;

        const details = String(
          error.status || '' + ' ' +
          error.code || '' + ' ' +
          error.message || error
        );

        console.error("Gemini error:", model, details);

        const retryable =
          /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|502|504|timeout|ECONNRESET|ETIMEDOUT/i.test(
            details + ' ' + String(error.message || '')
          );

        if (!retryable) throw error;

        if (attempt < 2) {
          await sleep(1500 * attempt);
        }
      }
    }
  }

  throw lastError;
}

app.post("/chat", async (req, res) => {
  try {
    const { userId, message, assistantName } = req.body;

    if (
      typeof userId !== "string" ||
      typeof message !== "string" ||
      !userId.trim() ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        error: "Invalid message"
      });
    }

    const name =
      typeof assistantName === "string" && assistantName.trim()
        ? assistantName.trim().slice(0, 30)
        : "ঝরনা";

    const history = chats.get(userId) || [];

    const contents = [
      ...history,
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const config = {
      systemInstruction: getPersonality(name)
    };

    const response = await generateWithFallback(contents, config);

    const reply = response.text;

    history.push(
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: reply }] }
    );

    chats.set(userId, history.slice(-20));

    res.json({ reply });

  } catch (error) {
    console.error("Jharna Error:", error.message);

    const unavailable = /503|UNAVAILABLE|high demand/i.test(String(error.message || error));
    res.status(unavailable ? 503 : 500).json({
      error: unavailable ? "ঝর্ণার সার্ভার এখন ব্যস্ত। একটু পরে আবার চেষ্টা করো।" : "ঝর্ণা সাময়িক সমস্যায় পড়েছে। আবার চেষ্টা করো।"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("JHARNA AI STARTED ❤️");
  console.log("http://127.0.0.1:3000");
});
