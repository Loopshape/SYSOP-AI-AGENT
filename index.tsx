/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';

const API_KEY = process.env.API_KEY;

const output = document.getElementById('output') as HTMLDivElement;
const form = document.getElementById('prompt-form') as HTMLFormElement;
const input = document.getElementById('prompt-input') as HTMLTextAreaElement;

if (!API_KEY) {
  output.innerHTML =
    '<div class="error">API key not found. Please set the API_KEY environment variable.</div>';
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const chat: Chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction:
      'You are an expert AI DevOps assistant. Provide clear, concise, and helpful answers, often with code examples. You are friendly and eager to help.',
  },
});

async function appendMessage(sender: 'user' | 'ai', message: string) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('message-container', `${sender}-message-container`);

  const content = document.createElement('div');
  content.classList.add('message', `${sender}-message`);
  
  if (sender === 'ai') {
    // Use a temporary streaming element
    const streamingContent = document.createElement('div');
    streamingContent.innerHTML = await marked.parse(message);
    content.appendChild(streamingContent);
  } else {
    content.textContent = message;
  }
  
  messageContainer.appendChild(content);
  output.appendChild(messageContainer);
  output.scrollTop = output.scrollHeight;
  return content;
}

async function showLoadingIndicator() {
  const loadingContainer = document.createElement('div');
  loadingContainer.classList.add('message-container', 'ai-message-container', 'loading');
  loadingContainer.innerHTML = `
    <div class="message ai-message">
      <div class="blinking-cursor"></div>
    </div>
  `;
  output.appendChild(loadingContainer);
  output.scrollTop = output.scrollHeight;
  return loadingContainer;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;

  input.value = '';
  input.style.height = 'auto'; // Reset height

  await appendMessage('user', prompt);
  const loadingIndicator = await showLoadingIndicator();

  try {
    const result = await chat.sendMessageStream({ message: prompt });
    let fullResponse = '';
    let aiMessageContent: HTMLDivElement | null = null;

    for await (const chunk of result) {
       if (loadingIndicator && loadingIndicator.parentNode) {
         loadingIndicator.remove();
       }
       fullResponse += chunk.text;
       if (!aiMessageContent) {
         const aiMessageContainer = await appendMessage('ai', fullResponse);
         aiMessageContent = aiMessageContainer as HTMLDivElement;
       } else {
         aiMessageContent.innerHTML = await marked.parse(fullResponse);
       }
       output.scrollTop = output.scrollHeight;
    }
  } catch (error) {
    if (loadingIndicator && loadingIndicator.parentNode) {
      loadingIndicator.remove();
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    await appendMessage('ai', `**Error:** ${message}`);
    console.error(error);
  }
});

// Auto-resize textarea
input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
});

// Welcome message
window.addEventListener('load', () => {
    appendMessage(
        'ai',
        "Welcome to the AI DevOps Assistant! I'm here to help you with your development and operations tasks. How can I assist you today?"
    );
});
