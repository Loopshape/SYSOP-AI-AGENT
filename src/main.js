// src/main.js — frontend logic to call AI API
const appDiv = document.getElementById('app');

// Simple form UI
appDiv.innerHTML = `
  <h1>Local AI Agent</h1>
  <textarea id="prompt" placeholder="Type your prompt"></textarea>
  <button id="askBtn">Ask AI</button>
  <pre id="response"></pre>
`;

const promptEl = document.getElementById('prompt');
const btn = document.getElementById('askBtn');
const respEl = document.getElementById('response');

btn.addEventListener('click', async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) return;

  respEl.textContent = 'Processing...';

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    respEl.textContent = data.response || data.error;
  } catch (err) {
    respEl.textContent = 'Error contacting AI API';
    console.error(err);
  }
});
