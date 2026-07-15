/* ==========================================================
   AI Notes Summarizer — script.js
   Vanilla JS logic + Groq API integration
   ========================================================== */

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------
// NOTE: Storing an API key in client-side JS means anyone who
// views the page source or devtools can see and use it.
// This is fine for local/personal use, but for a public
// deployment, route this request through your own backend
// instead so the key never reaches the browser.
const API_URL = "https://ai-tool-backend-dr0k.onrender.com";
// ------------------------------------------------------------
// DOM REFERENCES
// ------------------------------------------------------------
const notesInput = document.getElementById("notesInput");
const charCounter = document.getElementById("charCounter");
const summaryTypeSelect = document.getElementById("summaryType");
const summaryLengthSelect = document.getElementById("summaryLength");

const summarizeBtn = document.getElementById("summarizeBtn");
const btnSpinner = document.getElementById("btnSpinner");
const clearBtn = document.getElementById("clearBtn");

const resultSection = document.getElementById("resultSection");
const summaryOutput = document.getElementById("summaryOutput");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const toastContainer = document.getElementById("toastContainer");

// ------------------------------------------------------------
// UTILITY: Toast notifications
// ------------------------------------------------------------
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Remove the toast from the DOM after its animation completes
  setTimeout(() => toast.remove(), 3000);
}

// ------------------------------------------------------------
// UTILITY: Auto-resize textarea as the user types
// ------------------------------------------------------------
function autoResizeTextarea() {
  notesInput.style.height = "auto";
  notesInput.style.height = `${notesInput.scrollHeight}px`;
}

// ------------------------------------------------------------
// UTILITY: Live character counter
// ------------------------------------------------------------
function updateCharCounter() {
  const count = notesInput.value.length;
  charCounter.textContent = `${count.toLocaleString()} character${count === 1 ? "" : "s"}`;
}

// ------------------------------------------------------------
// UTILITY: Toggle the loading state of the Summarize button
// ------------------------------------------------------------
function setLoading(isLoading) {
  summarizeBtn.disabled = isLoading;
  summarizeBtn.classList.toggle("loading", isLoading);
  summarizeBtn.querySelector(".btn-label").textContent = isLoading
    ? "Summarizing..."
    : "Summarize Notes";
}

// ------------------------------------------------------------
// UTILITY: Build the prompt sent to the AI
// ------------------------------------------------------------
function buildPrompt(notes, summaryType, summaryLength) {
  return `You are an expert note summarizer.

Summarize the following notes.

Requirements:

Summary Type:
${summaryType}

Summary Length:
${summaryLength}

Use simple English.

Keep important concepts.

Avoid unnecessary information.

Notes:

${notes}`;
}

// ------------------------------------------------------------
// CORE: Call the Groq API and return the summary text
// ------------------------------------------------------------
async function fetchSummary(prompt) {
  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5
      })
    });
  } catch (networkError) {
    // fetch() throws a TypeError when there's no internet connection
    // or the request otherwise never reaches the server
    throw new Error("No internet connection. Please check your network and try again.");
  }

  // ---- Handle HTTP-level errors ----
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Groq API key and try again.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    }
    if (response.status >= 500) {
      throw new Error("The AI server is having issues right now. Please try again shortly.");
    }
    throw new Error(`Something went wrong (error ${response.status}). Please try again.`);
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error("Received an unreadable response from the server. Please try again.");
  }

  const summary = data?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("The AI didn't return a summary. Please try again.");
  }

  return summary;
}

// ------------------------------------------------------------
// CORE: Handle the "Summarize Notes" action
// ------------------------------------------------------------
async function handleSummarize() {
  const notes = notesInput.value.trim();

  // ---- Validation ----
  if (!notes) {
    showToast("Please enter some notes.", "error");
    notesInput.focus();
    return;
  }

  const summaryType = summaryTypeSelect.value;
  const summaryLength = summaryLengthSelect.value;
  const prompt = buildPrompt(notes, summaryType, summaryLength);

  setLoading(true);
  resultSection.hidden = true;

  try {
    const summary = await fetchSummary(prompt);
    summaryOutput.textContent = summary;
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    showToast("Summary generated successfully!", "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLoading(false);
  }
}

// ------------------------------------------------------------
// CORE: Clear the form
// ------------------------------------------------------------
function handleClear() {
  notesInput.value = "";
  autoResizeTextarea();
  updateCharCounter();
  resultSection.hidden = true;
  summaryOutput.textContent = "";
  notesInput.focus();
}

// ------------------------------------------------------------
// CORE: Copy summary to clipboard
// ------------------------------------------------------------
async function handleCopy() {
  const text = summaryOutput.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast("Summary copied to clipboard!", "success");
  } catch (error) {
    showToast("Couldn't copy automatically. Please copy manually.", "error");
  }
}

// ------------------------------------------------------------
// CORE: Download summary as a .txt file
// ------------------------------------------------------------
function handleDownload() {
  const text = summaryOutput.textContent;
  if (!text) return;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "summary.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  showToast("Summary downloaded!", "success");
}

// ------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------
notesInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateCharCounter();
});

summarizeBtn.addEventListener("click", handleSummarize);
clearBtn.addEventListener("click", handleClear);
copyBtn.addEventListener("click", handleCopy);
downloadBtn.addEventListener("click", handleDownload);

// Keyboard shortcut: Ctrl/Cmd + Enter to summarize
document.addEventListener("keydown", (event) => {
  const isCtrlEnter = (event.ctrlKey || event.metaKey) && event.key === "Enter";
  if (isCtrlEnter) {
    event.preventDefault();
    handleSummarize();
  }
});

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
updateCharCounter();
