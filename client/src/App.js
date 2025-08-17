import React, { useState, useEffect } from "react";
import "./App.css";
// Optional: install lucide-react → npm install lucide-react
import { Copy, Send, Trash } from "lucide-react";

function App() {
  const [transcript, setTranscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setTranscript(event.target.result);
    reader.readAsText(file);
  };

  const generateSummary = async () => {
    if (!transcript || !prompt) {
      alert("Please enter transcript and prompt");
      return;
    }
    setLoadingSummary(true);
    try {
      const res = await fetch(`${API_URL}/api/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, prompt }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "No summary returned");
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setSummary("⚠️ Error: " + err.message);
    }
    setLoadingSummary(false);
  };

  const sendEmail = async () => {
    if (!summary || !email) {
      alert("Please enter summary and recipient email");
      return;
    }
    setLoadingEmail(true);
    try {
      const res = await fetch(`${API_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary, to: email }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Email failed");
      setMessage("✅ Email sent successfully!");
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Error: " + err.message);
    }
    setLoadingEmail(false);
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    setMessage("📋 Summary copied to clipboard!");
  };

  return (
    <div className="App">
      <div className="container">
        <h2>CONDENSIFY AI SUMMARIZER</h2>

        <label>Upload Transcript (.txt):</label>
        <input type="file" accept=".txt" onChange={handleFileUpload} />

        <label>Or paste transcript:</label>
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            e.target.style.height = "auto"; // auto-expand
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          style={{ overflow: "hidden" }}
        />

        {/* 🔹 Clear Transcript button */}
        {transcript && (
          <button
            type="button"
            className="secondary"
            onClick={() => setTranscript("")}
          >
            <Trash className="icon" /> Clear Transcript
          </button>
        )}

        <label>Prompt:</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Summarize in bullet points for executives"
        />

        <button onClick={generateSummary} disabled={loadingSummary}>
          {loadingSummary ? "Generating..." : "Generate Summary"}
        </button>

        {summary && (
          <>
            <h3>Summary (editable):</h3>
            <div
              className="summary-box"
              contentEditable
              suppressContentEditableWarning={true}
              onInput={(e) => setSummary(e.currentTarget.innerText)}
            >
              {summary}
            </div>

            {/* 🔹 Toolbar for summary actions */}
            <div className="summary-toolbar">
              <button onClick={copySummary}>
                <Copy className="icon" /> Copy Summary
              </button>

              <div style={{ flex: 1 }} />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Recipient email"
              />
              <button onClick={sendEmail} disabled={loadingEmail}>
                <Send className="icon" />
                {loadingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>

            {message && <p className="message">{message}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
