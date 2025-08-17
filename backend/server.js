import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// -------------------- Helper: chunk transcript --------------------
function chunkText(text, maxLength = 1000, overlap = 100) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    chunks.push(text.slice(start, end));
    start += maxLength - overlap;
  }
  return chunks;
}

// -------------------- Helper: format bullets --------------------
function formatAsBullets(text) {
  return text
    .split(/(?<=[.!?])\s+/) // split by sentences
    .filter((s) => s && s.length > 3)
    .map((s) => `- ${s.trim().replace(/^[\-\*]\s*/, "")}`)
    .join("\n");
}

// -------------------- AI SUMMARY ENDPOINT --------------------
app.post("/api/summary", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.json({ success: false, error: "Missing transcript" });
    }

    // Split transcript into smaller pieces
    const chunks = chunkText(transcript, 1000, 100);
    let combinedSummary = [];

    for (const chunk of chunks) {
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/philschmid/bart-large-cnn-samsum", // meeting-friendly model
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: chunk }),
        }
      );

      if (!hfResponse.ok) {
        const errorText = await hfResponse.text();
        throw new Error(`HuggingFace API error: ${errorText}`);
      }

      const data = await hfResponse.json();
      const rawSummary =
        data[0]?.summary_text || data[0]?.generated_text || "";

      if (rawSummary) {
        combinedSummary.push(rawSummary);
      }
    }

    // Join summaries & format into bullets
    const fullSummary = combinedSummary.join(" ");
    const bulletSummary = formatAsBullets(fullSummary);

    res.json({ success: true, summary: bulletSummary });
  } catch (err) {
    console.error("Summary error:", err);
    res.json({ success: false, error: err.message });
  }
});

// -------------------- EMAIL ENDPOINT --------------------
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,      // e.g. smtp.gmail.com
  port: process.env.EMAIL_PORT,      // e.g. 587
  secure: process.env.EMAIL_PORT == 465, // true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/send-email", async (req, res) => {
  try {
    const { text, to } = req.body;
    if (!text || !to) {
      return res.json({ success: false, error: "Missing text or recipient" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: "📄 Condensify AI Summary",
      text,
      html: `<pre style="font-family: Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6;">${text}</pre>`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.json({ success: false, error: err.message });
  }
});

// -------------------- HEALTH CHECK --------------------
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
