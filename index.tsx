<<<<<<< HEAD
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
=======
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';
import hljs from 'highlight.js';
>>>>>>> a82d405ed7b34abd96f3ee904fd03991111ba12e

// FIX: Declare types for external libraries loaded via script tags
declare var Chart: any;
declare var Web3Modal: any;
declare var ChartjsPluginAnnotation: any;
declare var dateFns: any;

// --- TYPE DEFINITIONS ---
interface Persona {
  id: string;
  name: string;
  icon: string;
  systemInstruction: string;
}

interface AIProvider {
    id: 'gemini' | 'ollama';
    name: string;
    icon: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type?: 'default' | 'ai-analysis' | 'error';
}

interface TradeDirective {
    asset: string;
    action: "LONG" | "SHORT";
    entry: number;
    target: number;
    stopLoss: number;
    reasoning: string;
}

interface ActiveTrade extends TradeDirective {
    allocation: number;
    currentPrice?: number;
}

interface TradeHistoryEntry {
    asset: string;
    action: "LONG" | "SHORT";
    entryPrice: number;
    closePrice: number;
    pnl: number;
    pnlPercent: number;
    timestamp: string;
}

interface ChartDataPoint {
    x: number; // openTime
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number; // volume
}


// --- MOCK DATA & CONFIG ---
const API_KEY = process.env.API_KEY;
<<<<<<< HEAD
=======

// DOM Elements
const output = document.getElementById('output') as HTMLDivElement;
const form = document.getElementById('prompt-form') as HTMLFormElement;
const input = document.getElementById('prompt-input') as HTMLTextAreaElement;
const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const closeModalButton = document.getElementById('close-modal-button') as HTMLButtonElement;
const systemInstructionForm = document.getElementById('system-instruction-form') as HTMLFormElement;
const systemInstructionInput = document.getElementById('system-instruction-input') as HTMLTextAreaElement;
const instructionHistoryContainer = document.getElementById('instruction-history') as HTMLDivElement;
const clearHistoryButton = document.getElementById('clear-history-button') as HTMLButtonElement;
const webSearchToggle = document.getElementById('web-search-toggle') as HTMLInputElement;
const cicdHelperButton = document.getElementById('cicd-helper-button') as HTMLButtonElement;
const cicdModal = document.getElementById('cicd-modal') as HTMLDivElement;
const closeCicdModalButton = document.getElementById('close-cicd-modal-button') as HTMLButtonElement;
const tabContainer = document.querySelector('.tab-container') as HTMLDivElement;
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const analyzePipelineForm = document.getElementById('analyze-pipeline-form') as HTMLFormElement;
const generatePipelineForm = document.getElementById('generate-pipeline-form') as HTMLFormElement;
const pipelineInput = document.getElementById('pipeline-input') as HTMLTextAreaElement;
const analyzeResult = document.getElementById('analyze-result') as HTMLDivElement;
const generateResult = document.getElementById('generate-result') as HTMLDivElement;
const generateDockerfileForm = document.getElementById('generate-dockerfile-form') as HTMLFormElement;
const dockerfileResult = document.getElementById('dockerfile-result') as HTMLDivElement;
const pipelineTemplateSelect = document.getElementById('pipeline-template-select') as HTMLSelectElement;
const dockerfileTemplateSelect = document.getElementById('dockerfile-template-select') as HTMLSelectElement;
const generateK8sForm = document.getElementById('generate-k8s-form') as HTMLFormElement;
const k8sResult = document.getElementById('k8s-result') as HTMLDivElement;
const k8sTemplateSelect = document.getElementById('k8s-template-select') as HTMLSelectElement;
const gitResult = document.getElementById('git-result') as HTMLDivElement;
const generateCloneBtn = document.getElementById('generate-clone-btn') as HTMLButtonElement;
const generateCommitBtn = document.getElementById('generate-commit-btn') as HTMLButtonElement;
const generateBranchBtn = document.getElementById('generate-branch-btn') as HTMLButtonElement;
const generateLogBtn = document.getElementById('generate-log-btn') as HTMLButtonElement;


// State and Constants
const HISTORY_STORAGE_KEY = 'gemini-devops-assistant-history';
const WEB_SEARCH_STORAGE_KEY = 'gemini-devops-assistant-web-search';
const DEFAULT_SYSTEM_INSTRUCTION =
  'You are an expert AI DevOps assistant. Provide clear, concise, and helpful answers, often with code examples. You are friendly and eager to help.';
let chat: Chat | null = null;
const SVG_ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
const SVG_ICON_COPIED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
const SVG_ICON_DOCS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
const SVG_ICON_REFACTOR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.94 4.94c-.38-.38-1-.38-1.38 0L3.69 12.81c-.38.38-.56.88-.56 1.38V18h3.81c.5 0 1-.18 1.38-.56L16.19 9.56c.38-.38.38-1 0-1.38L12.94 4.94zM7.5 16c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S8.33 16 7.5 16zm12.5-5.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zM19 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM20.71 7.29l-3.42-3.42c-.2-.2-.45-.29-.71-.29s-.51.1-.71.29l-1.53 1.53c-.38.38-.38 1 0 1.38l3.42 3.42c.38.38 1 .38 1.38 0l1.53-1.53c.38-.38.38-1 0-1.38z"/></svg>`;


>>>>>>> a82d405ed7b34abd96f3ee904fd03991111ba12e
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini provider will not work.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

<<<<<<< HEAD
const JSON_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        asset: { type: Type.STRING, description: "The asset pair, e.g., 'BTC/USD'" },
        action: { type: Type.STRING, enum: ["LONG", "SHORT"], description: "The trade action" },
        entry: { type: Type.NUMBER, description: "The suggested entry price" },
        target: { type: Type.NUMBER, description: "The take-profit target price" },
        stopLoss: { type: Type.NUMBER, description: "The stop-loss price" },
        reasoning: { type: Type.STRING, description: "A brief justification for the trade" },
    },
    required: ["asset", "action", "entry", "target", "stopLoss", "reasoning"],
};

const SENTIMENT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        overallSentiment: {
            type: Type.STRING,
            enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"],
            description: "The overall sentiment of the news headlines."
        },
        keyTerms: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING
            },
            description: "A list of 3-5 key terms or short phrases that contributed most to the sentiment."
        }
    },
    required: ["overallSentiment", "keyTerms"]
};

const PERSONAS: Persona[] = [
  {
    id: 'scalper',
    name: 'Scalper',
    icon: 'fa-solid fa-bolt',
    systemInstruction: 'You are an aggressive, high-frequency scalper. Your goal is to identify and execute trades based on short-term market volatility. Prioritize technical indicators like RSI, MACD on 1-minute and 5-minute charts. Provide concise, actionable directives with tight stop-losses.'
  },
  {
    id: 'swing',
    name: 'Swing Trader',
    icon: 'fa-solid fa-wave-square',
    systemInstruction: 'You are a patient swing trader. Your goal is to capture gains in an asset over a period of several days to several weeks. You rely on identifying market trends using daily and 4-hour charts, support/resistance levels, and moving averages. Your reasoning should be clear and based on the medium-term trend.'
  },
  {
    id: 'degen',
    name: 'Degen',
    icon: 'fa-solid fa-rocket',
    systemInstruction: 'You are a high-risk, high-reward "degen" trader. You look for explosive, meme-driven opportunities. Your analysis is based on social media sentiment, hype, and narratives. You are not afraid of high volatility and aim for moonshot trades. Justify your trades with narrative and sentiment, not just technicals.'
  },
  {
    id: 'daytrader',
    name: 'Day Trader',
    icon: 'fa-solid fa-calendar-day',
    systemInstruction: 'You are a disciplined day trader. Your focus is on capturing profits from intraday price movements. Analyze 15-minute and 1-hour charts for patterns like flags, triangles, and head-and-shoulders. Use VWAP and key intraday support/resistance levels to determine entry and exit points. Trades should be opened and closed within the same day.'
  },
  {
    id: 'investor',
    name: 'Investor',
    icon: 'fa-solid fa-piggy-bank',
    systemInstruction: 'You are a long-term value investor. Your perspective spans months to years. Ignore short-term market noise and focus on fundamental analysis, macroeconomic trends, and major market cycles. Your analysis should be based on weekly and monthly charts, identifying deeply undervalued or overvalued conditions for major assets. Your reasoning should reflect a long-term thesis.'
  },
  {
    id: 'quant',
    name: 'Quant',
    icon: 'fa-solid fa-calculator',
    systemInstruction: 'You are a quantitative analyst. Your decisions are purely data-driven, based on statistical models and algorithmic signals. Analyze price action using advanced indicators like Bollinger Bands, Ichimoku Cloud, and Fibonacci retracement levels. Identify statistical arbitrage opportunities and deviations from the mean. Your reasoning must be objective and based on quantitative signals, devoid of emotion or narrative.'
  }
];

const AI_PROVIDERS: AIProvider[] = [
    { id: 'gemini', name: 'Gemini', icon: 'fa-solid fa-star-of-life' },
    { id: 'ollama', name: 'Ollama', icon: 'fa-solid fa-server' }
];

const MOCK_NEWS = [
    "Fed hints at potential rate cuts later this year, market reacts positively.",
    "Major exchange experiences downtime, causing temporary BTC price dip.",
    "New institutional adoption of Bitcoin ETF continues to drive demand.",
    "Whale activity spotted moving large amounts of ETH to cold storage.",
    "Geopolitical tensions in Eastern Europe cause market uncertainty."
];
=======
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- History & Settings Management ---
function getHistory(): string[] {
  const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
  return storedHistory ? JSON.parse(storedHistory) : [];
}

function saveHistory(history: string[]) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function addToHistory(instruction: string) {
  if (!instruction || instruction.trim() === '') return;
  let history = getHistory();
  // Remove if already exists to move it to the top
  history = history.filter((item) => item !== instruction);
  history.unshift(instruction);
  // Keep history to a reasonable size (e.g., 10 items)
  if (history.length > 10) {
    history.pop();
  }
  saveHistory(history);
}

function renderHistory() {
  const history = getHistory();
  instructionHistoryContainer.innerHTML = '';
  if (history.length === 0) {
    instructionHistoryContainer.innerHTML = '<p class="empty-history">No history yet.</p>';
    return;
  }
  history.forEach((instruction) => {
    const item = document.createElement('div');
    item.classList.add('history-item');
    item.textContent = instruction;
    item.title = instruction; // Show full text on hover
    item.addEventListener('click', () => {
      systemInstructionInput.value = instruction;
    });
    instructionHistoryContainer.appendChild(item);
  });
}

function getCurrentInstruction(): string {
  const history = getHistory();
  return history.length > 0 ? history[0] : DEFAULT_SYSTEM_INSTRUCTION;
}

function getWebSearchSetting(): boolean {
    const storedSetting = localStorage.getItem(WEB_SEARCH_STORAGE_KEY);
    return storedSetting ? JSON.parse(storedSetting) : false; // Default to false
}
  
function saveWebSearchSetting(isEnabled: boolean) {
    localStorage.setItem(WEB_SEARCH_STORAGE_KEY, JSON.stringify(isEnabled));
}


// --- Chat and UI Management ---
function applySyntaxHighlighting(element: HTMLElement) {
  element.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });
}

function enhanceCodeBlocks(element: HTMLElement) {
    const codeBlocks = element.querySelectorAll('pre');
    codeBlocks.forEach((pre) => {
      // If it's already wrapped, don't wrap it again
      if (pre.parentElement?.classList.contains('code-block-wrapper')) {
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.parentNode!.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
  
      const copyButton = document.createElement('button');
      copyButton.className = 'code-copy-button';
      copyButton.innerHTML = SVG_ICON_COPY;
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');
      wrapper.appendChild(copyButton);
  
      copyButton.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? '';
        try {
          await navigator.clipboard.writeText(code);
          copyButton.innerHTML = SVG_ICON_COPIED;
          copyButton.classList.add('copied');
          copyButton.setAttribute('aria-label', 'Copied!');
          setTimeout(() => {
            copyButton.innerHTML = SVG_ICON_COPY;
            copyButton.classList.remove('copied');
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code: ', err);
          copyButton.setAttribute('aria-label', 'Error copying');
        }
      });

      const docsButton = document.createElement('button');
      docsButton.className = 'code-docs-button';
      docsButton.innerHTML = SVG_ICON_DOCS;
      docsButton.setAttribute('aria-label', 'Generate documentation');
      wrapper.appendChild(docsButton);

      docsButton.addEventListener('click', () => {
        const codeElement = pre.querySelector('code');
        const code = codeElement?.textContent ?? '';
        const langClass = Array.from(codeElement?.classList ?? []).find(c => c.startsWith('language-'));
        const language = langClass ? langClass.replace('language-', '') : 'code';
        generateDocumentation(code, language, wrapper, docsButton);
      });

      const refactorButton = document.createElement('button');
      refactorButton.className = 'code-refactor-button';
      refactorButton.innerHTML = SVG_ICON_REFACTOR;
      refactorButton.setAttribute('aria-label', 'Refactor code');
      wrapper.appendChild(refactorButton);

      refactorButton.addEventListener('click', () => {
        const codeElement = pre.querySelector('code');
        const code = codeElement?.textContent ?? '';
        const langClass = Array.from(codeElement?.classList ?? []).find(c => c.startsWith('language-'));
        const language = langClass ? langClass.replace('language-', '') : 'code';
        generateRefactoring(code, language, wrapper, refactorButton);
      });
    });
}

async function generateDocumentation(code: string, language: string, wrapper: HTMLElement, button: HTMLButtonElement) {
    button.disabled = true;
    button.setAttribute('aria-label', 'Documentation is being generated');
    wrapper.classList.add('docs-generated');

    const docsContainer = document.createElement('div');
    docsContainer.className = 'docs-container';
    wrapper.insertAdjacentElement('afterend', docsContainer);

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'blinking-cursor';
    docsContainer.appendChild(loadingIndicator);
    
    const prompt = `Generate technical documentation for the following ${language} code snippet. 
Explain its purpose, parameters, return values, and provide a usage example if applicable.
Format the output in clear Markdown. Do not wrap the entire response in a code block.

\`\`\`${language}
${code}
\`\`\``;

    try {
        const result = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let fullResponse = '';
        let isFirstChunk = true;

        for await (const chunk of result) {
            if (isFirstChunk) {
                docsContainer.innerHTML = ''; // Clear loading indicator
                isFirstChunk = false;
            }
            fullResponse += chunk.text;
            docsContainer.innerHTML = await marked.parse(fullResponse);
            applySyntaxHighlighting(docsContainer);
            enhanceCodeBlocks(docsContainer); // Recursively enhance new code blocks
        }
        button.innerHTML = SVG_ICON_COPIED; // Use checkmark icon for success
        button.setAttribute('aria-label', 'Documentation generated');

    } catch (error) {
        console.error("Documentation generation failed:", error);
        docsContainer.innerHTML = '<div class="error-message">Failed to generate documentation.</div>';
        button.disabled = false; // Re-enable on failure
        button.setAttribute('aria-label', 'Generate documentation');
    }
}

async function generateRefactoring(code: string, language: string, wrapper: HTMLElement, button: HTMLButtonElement) {
    button.disabled = true;
    button.setAttribute('aria-label', 'Refactoring code...');
    wrapper.classList.add('refactor-generated');

    const refactorContainer = document.createElement('div');
    refactorContainer.className = 'refactor-container';
    wrapper.insertAdjacentElement('afterend', refactorContainer);

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'blinking-cursor';
    refactorContainer.appendChild(loadingIndicator);
    
    const prompt = `You are an expert software engineer specializing in writing clean, readable, and maintainable code.
Refactor the following ${language} code snippet. Your goals are to:
1. Improve readability and clarity.
2. Suggest more descriptive variable names.
3. Simplify complex logic or expressions.
4. Add concise, helpful comments where the code's purpose is not immediately obvious.
5. Ensure the refactored code maintains the original functionality.

First, provide the complete, refactored code in a single code block.
After the code block, provide a clear, bulleted list explaining the specific changes you made and the reasoning behind them.

Original code:
\`\`\`${language}
${code}
\`\`\``;

    try {
        const result = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let fullResponse = '';
        let isFirstChunk = true;

        for await (const chunk of result) {
            if (isFirstChunk) {
                refactorContainer.innerHTML = ''; // Clear loading indicator
                isFirstChunk = false;
            }
            fullResponse += chunk.text;
            refactorContainer.innerHTML = await marked.parse(fullResponse);
            applySyntaxHighlighting(refactorContainer);
            enhanceCodeBlocks(refactorContainer); // Recursively enhance new code blocks
        }
        button.innerHTML = SVG_ICON_COPIED; // Use checkmark icon for success
        button.setAttribute('aria-label', 'Code refactored');

    } catch (error) {
        console.error("Refactoring failed:", error);
        refactorContainer.innerHTML = '<div class="error-message">Failed to refactor code.</div>';
        button.disabled = false; // Re-enable on failure
        button.setAttribute('aria-label', 'Refactor code');
    }
}


function renderSources(chunks: any[], messageContent: HTMLElement) {
    // Deduplicate sources based on URI
    const uniqueSources = Array.from(new Map(chunks.map(item => [item.web?.uri, item.web])).values()).filter(Boolean);

    if (uniqueSources.length === 0) return;

    const sourcesContainer = document.createElement('div');
    sourcesContainer.className = 'sources-container';

    const heading = document.createElement('h4');
    heading.textContent = 'Sources';
    sourcesContainer.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'sources-list';

    uniqueSources.forEach(source => {
        if (source.uri && source.title) {
            const link = document.createElement('a');
            link.href = source.uri;
            link.textContent = source.title;
            link.className = 'source-link';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            list.appendChild(link);
        }
    });

    sourcesContainer.appendChild(list);
    messageContent.appendChild(sourcesContainer);
}

async function appendMessage(sender: 'user' | 'ai', message: string) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('message-container', `${sender}-message-container`);

  const content = document.createElement('div');
  content.classList.add('message', `${sender}-message`);

  if (sender === 'ai') {
    const aiContent = document.createElement('div');
    aiContent.className = 'ai-content';
    aiContent.innerHTML = await marked.parse(message);
    applySyntaxHighlighting(aiContent);
    enhanceCodeBlocks(aiContent);
    content.appendChild(aiContent);
  } else {
    content.textContent = message;
  }

  messageContainer.appendChild(content);
  output.appendChild(messageContainer);
  output.scrollTop = output.scrollHeight;
  return content;
}

async function appendErrorMessage(message: string) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container', 'ai-message-container');
  
    const content = document.createElement('div');
    content.classList.add('message', 'error-message');
  
    content.textContent = message;
  
    messageContainer.appendChild(content);
    output.appendChild(messageContainer);
    output.scrollTop = output.scrollHeight;
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

async function initializeChat(systemInstruction: string, webSearchEnabled: boolean) {
    const instructionToUse = systemInstruction || DEFAULT_SYSTEM_INSTRUCTION;
  
    const config: any = {
        systemInstruction: instructionToUse,
    };
    
    if (webSearchEnabled) {
        config.tools = [{googleSearch: {}}];
    }

    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: config,
    });
  
    // Clear chat UI and show welcome
    output.innerHTML = '';
    await appendMessage(
      'ai',
      "Welcome to the AI DevOps Assistant! I'm here to help you with your development and operations tasks. How can I assist you today?"
    );
  
    // Update the textarea in the modal as well
    systemInstructionInput.value = instructionToUse;
  }

// --- CI/CD Helper ---

const pipelineTemplates = {
    'node-build-test': {
      platform: 'GitHub Actions',
      triggers: ['on push to main branch', 'on pull request'],
      language: 'Node.js (LTS version)',
      buildCommand: 'npm ci && npm run build',
      testCommand: 'npm test',
      requirements: 'Sets up Node.js, caches npm dependencies for speed, runs tests, and then runs the build command.',
    },
    'python-lint-test': {
      platform: 'GitHub Actions',
      triggers: ['on push to main branch', 'on pull request'],
      language: 'Python (e.g., 3.10)',
      buildCommand: 'pip install -r requirements.txt',
      testCommand: 'pytest',
      requirements: 'Sets up Python, caches pip dependencies, installs dependencies from requirements.txt, runs a linter (like flake8), and then runs tests with pytest.',
    },
    'docker-build-push': {
      platform: 'GitHub Actions',
      triggers: ['on push to main branch'],
      language: 'Docker',
      buildCommand: 'docker build -t ghcr.io/OWNER/IMAGE_NAME:latest .',
      testCommand: '',
      requirements: 'Checks out code, logs into GitHub Container Registry (GHCR), builds a Docker image, and pushes it to GHCR. You need to replace OWNER and IMAGE_NAME.',
    },
};
  
const dockerfileTemplates = {
    'node-prod': {
      language: 'Node.js 18-alpine',
      dependencies: 'package.json, package-lock.json',
      port: 3000,
      buildCommand: 'npm run build',
      startCommand: 'node dist/server.js',
      requirements: 'Uses a multi-stage build. The first stage builds the app with all devDependencies. The second stage creates a small production image by copying only the build output and production dependencies. Non-root user is configured for security.',
    },
    'python-flask': {
      language: 'Python 3.10-slim',
      dependencies: 'requirements.txt',
      port: 5000,
      buildCommand: '',
      startCommand: 'gunicorn --bind 0.0.0.0:5000 myapp:app',
      requirements: 'Uses a slim Python base image, installs dependencies from requirements.txt, and uses Gunicorn as a production-ready web server. You need to replace `myapp:app` with your application module.',
    },
    'go-static': {
      language: 'Golang 1.21',
      dependencies: 'go.mod, go.sum',
      port: 8080,
      buildCommand: 'CGO_ENABLED=0 GOOS=linux go build -o /main .',
      startCommand: '/main',
      requirements: 'Uses a multi-stage build. The first stage uses the full Go SDK to build a statically linked binary. The second stage uses a minimal `scratch` or `alpine` image and just copies the compiled binary, resulting in a very small and secure final image.',
    },
};

const k8sTemplates = {
    'stateless-app': {
      manifestType: 'Deployment + Service',
      appName: 'my-stateless-app',
      image: 'nginx:1.25.3',
      replicas: 3,
      containerPort: 80,
      serviceType: 'LoadBalancer',
      servicePort: 80,
      targetPort: 80,
      requirements: 'A standard stateless web application setup with an external-facing load balancer. The deployment should manage pods running the nginx image, and the service should expose them to the internet.',
    },
    'stateful-app': {
      manifestType: 'StatefulSet',
      appName: 'my-database',
      image: 'postgres:15',
      replicas: 3,
      containerPort: 5432,
      serviceType: 'ClusterIP',
      servicePort: 5432,
      targetPort: 5432,
      requirements: 'A stateful application like a database. Generate a StatefulSet for stable pod identities and persistent storage, and a headless Service for service discovery. Include a VolumeClaimTemplate for storage.',
    },
    'cron-job': {
      manifestType: 'CronJob',
      appName: 'my-nightly-backup',
      image: 'alpine:latest',
      replicas: 0,
      containerPort: 0,
      serviceType: '',
      servicePort: 0,
      targetPort: 0,
      requirements: 'A scheduled task that runs on a cron schedule. The schedule should be "0 2 * * *" (daily at 2 AM). The job should run a simple command like `echo "Backup complete"`.',
    }
  };

async function streamResponseToElement(prompt: string, targetElement: HTMLElement, submitButton: HTMLButtonElement) {
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Generating...';
    targetElement.innerHTML = '<div class="blinking-cursor"></div>';

    try {
        const result = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let fullResponse = '';
        let isFirstChunk = true;

        for await (const chunk of result) {
            if (isFirstChunk) {
                targetElement.innerHTML = ''; // Clear loading indicator
                isFirstChunk = false;
            }
            fullResponse += chunk.text;
            targetElement.innerHTML = await marked.parse(fullResponse);
            applySyntaxHighlighting(targetElement);
            enhanceCodeBlocks(targetElement);
        }
    } catch (error) {
        console.error("Streaming to element failed:", error);
        targetElement.innerHTML = '<div class="error">Failed to get a response. Please try again.</div>';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

async function generateAndExplainCommand(command: string, prompt: string, targetElement: HTMLElement, submitButton: HTMLButtonElement) {
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Generating...';
    targetElement.innerHTML = ''; // Clear previous results

    // 1. Create and display the command block immediately
    const commandWrapper = document.createElement('div');
    commandWrapper.innerHTML = await marked.parse(`\`\`\`sh\n${command}\n\`\`\``);
    applySyntaxHighlighting(commandWrapper);
    enhanceCodeBlocks(commandWrapper); // This will add the copy button etc.
    targetElement.appendChild(commandWrapper);

    // 2. Create a container for the explanation and add a loading indicator
    const explanationContainer = document.createElement('div');
    explanationContainer.className = 'explanation-container';
    explanationContainer.innerHTML = '<hr><div class="blinking-cursor"></div>';
    targetElement.appendChild(explanationContainer);

    // 3. Stream the AI explanation
    try {
        const result = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: 'You are an expert software engineer and Git instructor. Your explanations are clear, concise, and targeted at developers who may be new to Git.'
            }
        });

        let fullResponse = '';
        let isFirstChunk = true;

        for await (const chunk of result) {
            if (isFirstChunk) {
                explanationContainer.innerHTML = '<hr>'; // Clear loading indicator, keep separator
                isFirstChunk = false;
            }
            fullResponse += chunk.text;
            explanationContainer.innerHTML = '<hr>' + await marked.parse(fullResponse);
            applySyntaxHighlighting(explanationContainer);
            enhanceCodeBlocks(explanationContainer); // Enhance any code blocks in the explanation
        }
    } catch (error) {
        console.error("Streaming explanation failed:", error);
        explanationContainer.innerHTML = '<div class="error">Failed to get an explanation. Please try again.</div>';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// --- Event Listeners ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!chat) {
    console.error('Chat is not initialized.');
    return;
  }
  const prompt = input.value.trim();
  if (!prompt) return;
>>>>>>> a82d405ed7b34abd96f3ee904fd03991111ba12e

const MOCK_ORDER_BOOK = {
    bids: [
        { price: 68120.50, amount: 0.75, total: 51090.37 },
        { price: 68119.00, amount: 1.25, total: 85148.75 },
        { price: 68118.50, amount: 0.50, total: 34059.25 },
        { price: 68115.00, amount: 2.10, total: 143041.50 },
        { price: 68112.00, amount: 3.50, total: 238392.00 },
    ],
    asks: [
        { price: 68122.00, amount: 0.90, total: 61309.80 },
        { price: 68123.50, amount: 1.50, total: 102185.25 },
        { price: 68124.00, amount: 0.80, total: 54499.20 },
        { price: 68128.00, amount: 1.75, total: 119224.00 },
        { price: 68130.00, amount: 2.20, total: 149886.00 },
    ],
};

<<<<<<< HEAD
=======
  await appendMessage('user', prompt);
  let loadingIndicator = await showLoadingIndicator();
>>>>>>> a82d405ed7b34abd96f3ee904fd03991111ba12e

// --- STATE MANAGEMENT ---
let selectedPersonaId: string = PERSONAS[0].id;
let selectedProviderId: AIProvider['id'] = 'gemini';
let ollamaModel: string = 'llama3';
let allocation: number = 50;
let currentDirective: TradeDirective | null = null;
let activeTrade: ActiveTrade | null = null;
let tradeHistory: TradeHistoryEntry[] = [];
let logEntries: LogEntry[] = [];
const MAX_LOG_ENTRIES = 100;
let priceData: ChartDataPoint[] = [];
let marketChart: any = null;
let priceUpdaterInterval: number | undefined;

// Chart Drawing State
let drawingMode: 'trendline' | 'annotation' | null = null;
let trendlineStartPoint: { x: number, y: number } | null = null;
let userAnnotations: any = {};
let annotationCounter = 0;

// WalletConnect State
let web3Modal: any = null;
let walletAddress: string | null = null;

// --- PERSISTENCE ---
const saveState = () => {
  try {
<<<<<<< HEAD
    const stateToSave = {
      selectedPersonaId,
      selectedProviderId,
      allocation,
      tradeHistory,
      logEntries,
      activeTrade,
      currentDirective,
      ollamaModel,
      userAnnotations,
      annotationCounter,
    };
    localStorage.setItem('aiBitboyState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
=======
    const result = await chat.sendMessageStream({ message: prompt });
    let fullResponse = '';
    let aiMessageContent: HTMLDivElement | null = null;
    let streamTargetElement: HTMLDivElement | null = null;
    let groundingChunks: any[] = [];

    for await (const chunk of result) {
      if (loadingIndicator?.parentNode) {
        loadingIndicator.remove();
        loadingIndicator = null;
      }
      fullResponse += chunk.text;

      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        groundingChunks.push(...chunk.candidates[0].groundingMetadata.groundingChunks);
      }

      if (!aiMessageContent) {
        aiMessageContent = (await appendMessage('ai', fullResponse)) as HTMLDivElement;
        streamTargetElement = aiMessageContent.querySelector('.ai-content');
      } else if (streamTargetElement){
        streamTargetElement.innerHTML = await marked.parse(fullResponse);
        applySyntaxHighlighting(streamTargetElement);
        enhanceCodeBlocks(streamTargetElement);
      }
      output.scrollTop = output.scrollHeight;
    }

    if (aiMessageContent && groundingChunks.length > 0) {
        renderSources(groundingChunks, aiMessageContent);
    }

  } catch (error) {
    if (loadingIndicator?.parentNode) {
      loadingIndicator.remove();
    }
    // Log the detailed error to the console for debugging
    console.error('API request failed:', error);

    // Display a user-friendly error message in the chat
    await appendErrorMessage(
      'An error occurred while processing your request. Please check the console for details and try again.'
    );
>>>>>>> a82d405ed7b34abd96f3ee904fd03991111ba12e
  }
};

<<<<<<< HEAD
const loadState = (): boolean => {
  const savedStateJSON = localStorage.getItem('aiBitboyState');
  if (savedStateJSON) {
    try {
        const savedState = JSON.parse(savedStateJSON);
        if(!savedState) return false;

        selectedPersonaId = savedState.selectedPersonaId || PERSONAS[0].id;
        selectedProviderId = savedState.selectedProviderId || 'gemini';
        allocation = savedState.allocation || 50;
        tradeHistory = savedState.tradeHistory || [];
        logEntries = savedState.logEntries || [];
        activeTrade = savedState.activeTrade || null;
        currentDirective = savedState.currentDirective || null;
        ollamaModel = savedState.ollamaModel || 'llama3';
        userAnnotations = savedState.userAnnotations || {};
        annotationCounter = savedState.annotationCounter || 0;
        return true;
    } catch (error) {
        console.error("Failed to load state from localStorage:", error);
        localStorage.removeItem('aiBitboyState'); // Clear corrupted state
        return false;
    }
  }
  return false;
};


// --- UI ELEMENT GETTERS ---
const getElem = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T;
const getElems = <T extends HTMLElement>(selector: string): NodeListOf<T> => document.querySelectorAll(selector);

// --- API & DATA FETCHING ---
const fetchInitialChartData = async (symbol = 'BTCUSDT', interval = '1h', limit = 200): Promise<ChartDataPoint[]> => {
    try {
        addLog('Fetching historical market data from Binance...');
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        if (!response.ok) throw new Error(`Binance API error: ${response.statusText}`);
        const klines = await response.json();
        // kline format: [openTime, open, high, low, close, volume, ...]
        addLog('Historical data received.');
        return klines.map((k: any[]) => ({
            x: k[0],
            o: parseFloat(k[1]),
            h: parseFloat(k[2]),
            l: parseFloat(k[3]),
            c: parseFloat(k[4]),
            v: parseFloat(k[5]),
        }));
    } catch (error: any) {
        console.error("Failed to fetch initial chart data:", error);
        addLog(`Failed to fetch chart data: ${error.message}`, 'error');
        showNotification('Could not load live chart data.', 'error');
        return [];
    }
};

// --- UI UPDATE & RENDERING FUNCTIONS ---

const addLog = (message: string, type: LogEntry['type'] = 'default') => {
    const timestamp = new Date().toLocaleTimeString();
    logEntries.unshift({ timestamp, message, type });
    if (logEntries.length > MAX_LOG_ENTRIES) {
        logEntries.pop();
    }
    renderLog();
    saveState();
};

const renderLog = () => {
    const logContainer = getElem('#ai-log');
    if (!logEntries.length) {
        logContainer.innerHTML = `<div class="placeholder">Log is clear.</div>`;
        return;
    }
    logContainer.innerHTML = logEntries.map(entry => `
        <div class="log-item log-type-${entry.type || 'default'}">
            <span class="timestamp">${entry.timestamp}</span>
            <span class="message">${entry.message}</span>
        </div>
    `).join('');
};

const renderPersonas = () => {
    const container = getElem('#persona-selector');
    container.innerHTML = PERSONAS.map(p => `
        <div class="persona-card ${selectedPersonaId === p.id ? 'active' : ''}" data-id="${p.id}" role="button" aria-pressed="${selectedPersonaId === p.id}">
            <div class="persona-avatar"><i class="${p.icon}"></i></div>
            <div class="persona-name">${p.name}</div>
        </div>
    `).join('');
};

const renderAiProviders = () => {
    const container = getElem('#provider-selector');
    container.innerHTML = AI_PROVIDERS.map(p => `
        <div class="provider-card ${selectedProviderId === p.id ? 'active' : ''}" data-id="${p.id}" role="button" aria-pressed="${selectedProviderId === p.id}">
            <div class="provider-avatar"><i class="${p.icon}"></i></div>
            <div class="provider-name">${p.name}</div>
        </div>
    `).join('');
    getElem('#local-model-container').style.display = selectedProviderId === 'ollama' ? 'block' : 'none';
    getElem<HTMLInputElement>('#local-model-input').value = ollamaModel;
};

const renderTradeHistory = () => {
    const container = getElem('#trade-history');
    if (!tradeHistory.length) {
        container.innerHTML = `<div class="placeholder">No trades completed yet.</div>`;
        return;
    }
    container.innerHTML = tradeHistory.map(t => `
        <div class="trade-item">
            <span>${t.asset} [${t.action}]</span>
            <span class="trade-item-pnl ${t.pnl >= 0 ? 'positive' : 'negative'}">
                ${t.pnl.toFixed(2)} (${t.pnlPercent.toFixed(2)}%)
            </span>
        </div>
    `).join('');
};

const renderOrderBook = () => {
    const container = getElem('#order-book-container');
    const { bids, asks } = MOCK_ORDER_BOOK;

    const maxTotal = Math.max(...[...bids, ...asks].map(o => o.total));

    const bidsHtml = bids.map(bid => `
        <div class="order-book-row">
            <div class="depth-bar" style="width: ${ (bid.total / maxTotal) * 100}%"></div>
            <span>${bid.price.toFixed(2)}</span>
            <span>${bid.amount.toFixed(4)}</span>
            <span>${(bid.total / 1000).toFixed(1)}K</span>
        </div>
    `).join('');

    const asksHtml = asks.map(ask => `
        <div class="order-book-row">
            <div class="depth-bar" style="width: ${ (ask.total / maxTotal) * 100}%"></div>
            <span>${ask.price.toFixed(2)}</span>
            <span>${ask.amount.toFixed(4)}</span>
            <span>${(ask.total / 1000).toFixed(1)}K</span>
        </div>
    `).join('');

    const spread = asks[0].price - bids[0].price;

    container.innerHTML = `
        <h3 class="order-book-title">ORDER BOOK :: BTC/USD</h3>
        <div class="order-book-layout">
            <div class="order-book-column order-book-bids">
                <div class="order-book-header">
                    <span>PRICE (USD)</span>
                    <span>AMOUNT (BTC)</span>
                    <span>TOTAL</span>
                </div>
                <div class="order-book-rows">${bidsHtml}</div>
            </div>
            <div class="order-book-spread">
                <span class="spread-value">${spread.toFixed(2)}</span>
                <span class="spread-label">SPREAD</span>
            </div>
            <div class="order-book-column order-book-asks">
                <div class="order-book-header">
                    <span>PRICE (USD)</span>
                    <span>AMOUNT (BTC)</span>
                    <span>TOTAL</span>
                </div>
                <div class="order-book-rows">${asksHtml}</div>
            </div>
        </div>
    `;
};

const renderNews = () => {
    const feed = getElem('#news-feed');
    feed.innerHTML = MOCK_NEWS.map(item => `<div class="news-item">${item}</div>`).join('');
};

const renderSentiment = (sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL", keywords: string[]) => {
    const sentimentOutput = getElem('#sentiment-output');
    const sentimentClass = sentiment.toLowerCase();
    const keywordsHtml = keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('');

    sentimentOutput.innerHTML = `
        <span class="sentiment-tag ${sentimentClass}">${sentiment}</span>
        ${keywordsHtml}
    `;
};

const updateAIStatus = (text: string, isError = false, isWorking = false) => {
    const statusText = getElem('#ai-status-text');
    const statusLight = getElem('#status-light');
    statusText.textContent = text;
    statusLight.classList.toggle('error', isError);
    statusLight.classList.toggle('pulse', !isError && isWorking);
};

const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const container = getElem('#notification-container');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${message}`;
    notif.setAttribute('role', type === 'error' ? 'alert' : 'status');
    container.appendChild(notif);
    
    // Animate in
    setTimeout(() => notif.classList.add('show'), 10);
    // Animate out and remove
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, 5000);
};

const renderDirectiveConfirmation = () => {
    if (!currentDirective) return;
    const { asset, action, entry, target, stopLoss, reasoning } = currentDirective;
    const output = getElem('#directive-output');
    output.innerHTML = `
        <div id="trade-confirmation" class="content-fade-in">
            <p class="reasoning-text">"${reasoning}"</p>
            <div class="confirmation-details-grid">
                <div class="confirmation-detail-item"><strong>ASSET:</strong> <span>${asset}</span></div>
                <div class="confirmation-detail-item"><strong>ACTION:</strong> <span class="action-${action.toLowerCase()}">${action}</span></div>
                <div class="confirmation-detail-item"><strong>ENTRY:</strong> <span>${entry.toFixed(2)}</span></div>
                <div class="confirmation-detail-item"><strong>ALLOCATION:</strong> <span>${allocation}%</span></div>
                <div class="confirmation-detail-item"><strong>TARGET:</strong> <span>${target.toFixed(2)}</span></div>
                <div class="confirmation-detail-item"><strong>STOP:</strong> <span>${stopLoss.toFixed(2)}</span></div>
            </div>
        </div>`;

    const btnGroup = getElem('.btn-group');
    btnGroup.innerHTML = `
        <button id="reject-directive-btn" class="btn btn-sell">REJECT</button>
        <button id="execute-directive-btn" class="btn btn-buy">EXECUTE</button>
    `;

    getElem('#execute-directive-btn').addEventListener('click', executeTrade);
    getElem('#reject-directive-btn').addEventListener('click', () => {
        addLog('Directive rejected by user.');
        currentDirective = null;
        renderInitialDirectivePanel();
        saveState();
    });
};

const renderActiveTrade = () => {
    if (!activeTrade) return;

    const { asset, action, entry, target, stopLoss, allocation, currentPrice } = activeTrade;
    const price = currentPrice || entry;
    
    const pnl = action === 'LONG' ? (price - entry) * allocation : (entry - price) * allocation;
    const pnlPercent = (pnl / (entry * allocation)) * 100 * 100; // Simplified PnL %

    const output = getElem('#directive-output');
    output.innerHTML = `
        <div id="live-trade-monitor" class="content-fade-in">
            <div class="trade-monitor-header">
                <span class="trade-monitor-asset">${asset}</span>
                <span class="trade-monitor-direction direction-${action.toLowerCase()}">${action}</span>
            </div>
            <div class="pnl-display">
                <div class="pnl-value ${pnl >= 0 ? 'positive' : 'negative'}">${pnl.toFixed(2)} USD</div>
                <div class="pnl-percent ${pnl >= 0 ? 'positive' : 'negative'}">${pnlPercent.toFixed(2)}%</div>
            </div>
            <div class="trade-details-grid">
                <div class="trade-detail-item"><strong>ENTRY:</strong> <span>${entry.toFixed(2)}</span></div>
                <div class="trade-detail-item"><strong>CURRENT:</strong> <span>${price.toFixed(2)}</span></div>
            </div>
            <div class="trade-progress-bar" id="tp-progress">
                <div class="progress-label"><span>ENTRY</span><span>TARGET: ${target.toFixed(2)}</span></div>
                <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, Math.max(0, (price - entry) / (target - entry) * 100))}%;"></div></div>
            </div>
            <div class="trade-progress-bar" id="sl-progress">
                <div class="progress-label"><span>STOP: ${stopLoss.toFixed(2)}</span><span>ENTRY</span></div>
                <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, Math.max(0, (entry - price) / (entry - stopLoss) * 100))}%;"></div></div>
            </div>
        </div>
    `;

    const btnGroup = getElem('.btn-group');
    btnGroup.innerHTML = `<button id="close-trade-btn" class="btn btn-sell">CLOSE TRADE</button>`;
    getElem('#close-trade-btn').addEventListener('click', () => closeTrade(price));
};

const renderInitialDirectivePanel = () => {
    getElem('#directive-output').innerHTML = `<span class="placeholder">Select a persona and generate a directive...</span>`;
    getElem('.btn-group').innerHTML = `<button id="generate-directive-btn" class="btn btn-buy">GENERATE DIRECTIVE</button>`;
    getElem('#generate-directive-btn').addEventListener('click', generateDirective);
    updateAIStatus('AWAITING DIRECTIVE');
};


// --- WALLETCONNECT ---
const disconnectWallet = async () => {
    if (web3Modal) {
        await web3Modal.disconnect();
    }
    walletAddress = null;
    addLog('Wallet disconnected.');
    renderWalletConnector();
};

const renderWalletConnector = () => {
    const container = getElem('#wallet-connector');
    if (walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        container.innerHTML = `
            <div class="wallet-info">
                <span class="wallet-address" title="${walletAddress}">${truncatedAddress}</span>
                <button id="disconnect-wallet-btn" class="btn-icon" aria-label="Disconnect Wallet" title="Disconnect Wallet">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
        getElem('#disconnect-wallet-btn').addEventListener('click', disconnectWallet);
    } else {
        container.innerHTML = `
            <div class="connect-wallet-container">
                <button id="connect-wallet-btn">
                    <i class="fas fa-wallet"></i> CONNECT WALLET
                </button>
                <div class="recommended-wallets" title="Exodus and Trust Wallet are recommended">
                    <img src="https://www.exodus.com/img/icons/logo-icon-exodus.svg" alt="Exodus">
                    <img src="https://trustwallet.com/assets/images/media/assets/logo.svg" alt="Trust Wallet">
                </div>
            </div>
        `;
        getElem('#connect-wallet-btn').addEventListener('click', () => web3Modal?.open());
    }
};

const initializeWalletConnect = () => {
    // IMPORTANT: Replace with your own projectId from https://cloud.walletconnect.com
    const projectId = '1a2b3c4d5e6f7g8h9i0j0k1l2m3n4o5p6q7r'; // THIS IS A PLACEHOLDER

    if (!projectId || projectId === '1a2b3c4d5e6f7g8h9i0j0k1l2m3n4o5p6q7r') {
        const msg = 'WalletConnect projectId not set. Please get a valid ID from cloud.walletconnect.com';
        console.warn(msg);
        addLog(msg, 'error');
        getElem('#wallet-connector').innerHTML = `<span class="wallet-address">WC Not Configured</span>`;
        return;
    }

    const chains = [{
        chainId: 1,
        name: 'Ethereum',
        currency: 'ETH',
        explorerUrl: 'https://etherscan.io',
        rpcUrl: 'https://cloudflare-eth.com'
    }];
    
    // Prioritize wallets requested by the user, IDs from https://walletconnect.com/explorer
    const explorerRecommendedWalletIds = [
      '1ae92b26df02f0abca6304df07deb48179f9f484fa8e3babce58e348037386d3', // Exodus
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    ];

    web3Modal = new Web3Modal.Standalone({ projectId, chains, explorerRecommendedWalletIds });

    web3Modal.on('connect', (session: { address?: string }) => {
        if (session.address) {
            walletAddress = session.address;
            addLog(`Wallet connected: ${walletAddress}`);
            showNotification('Wallet Connected!', 'success');
            renderWalletConnector();
        }
    });

    web3Modal.on('disconnect', () => {
        walletAddress = null;
        addLog('Wallet disconnected.');
        showNotification('Wallet Disconnected', 'success');
        renderWalletConnector();
    });

    // Check for existing session
    if (web3Modal.getIsConnected()) {
        walletAddress = web3Modal.getAddress();
        if (walletAddress) {
            addLog(`Restored wallet connection: ${walletAddress}`);
        }
    }
};


// --- CORE LOGIC & EVENT HANDLERS ---

const validateDirective = (data: any): { isValid: boolean, error?: string } => {
    const requiredKeys: (keyof TradeDirective)[] = ["asset", "action", "entry", "target", "stopLoss", "reasoning"];
    const missingKeys = requiredKeys.filter(key => !(key in data));
    
    if (missingKeys.length > 0) {
        return { isValid: false, error: `Response is missing required field(s): ${missingKeys.join(', ')}` };
    }

    if (data.action !== "LONG" && data.action !== "SHORT") {
        return { isValid: false, error: `Invalid value for 'action': received '${data.action}', expected 'LONG' or 'SHORT'.` };
    }

    const numericKeys: (keyof TradeDirective)[] = ['entry', 'target', 'stopLoss'];
    for (const key of numericKeys) {
        if (typeof data[key] !== 'number') {
            return { isValid: false, error: `Invalid type for '${key}': received '${typeof data[key]}', expected 'number'.` };
        }
    }

    return { isValid: true };
};

const applyManualOverrides = () => {
    if (!currentDirective) return;
    const tpOverride = parseFloat(getElem<HTMLInputElement>('#manual-tp-input').value);
    const slOverride = parseFloat(getElem<HTMLInputElement>('#manual-sl-input').value);
    if (!isNaN(tpOverride) && tpOverride > 0) currentDirective.target = tpOverride;
    if (!isNaN(slOverride) && slOverride > 0) currentDirective.stopLoss = slOverride;
};

const analyzeNewsSentiment = async () => {
    const sentimentOutput = getElem('#sentiment-output');
    sentimentOutput.innerHTML = `<div class="sentiment-output-placeholder">Analyzing feed...</div>`;
    addLog('Initiating sentiment analysis of news feed...');

    try {
        const newsContent = MOCK_NEWS.join(' ');
        const prompt = `Analyze the sentiment of the following financial news headlines and provide an overall sentiment and key contributing terms. Headlines: "${newsContent}"`;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: SENTIMENT_SCHEMA,
            },
        });

        addLog('Sentiment analysis response received.', 'ai-analysis');
        const sentimentData = JSON.parse(response.text.trim());

        if (!sentimentData.overallSentiment || !Array.isArray(sentimentData.keyTerms)) {
            throw new Error("Invalid sentiment data structure from AI.");
        }

        renderSentiment(sentimentData.overallSentiment, sentimentData.keyTerms);

    } catch (error: any) {
        console.error("Sentiment analysis failed:", error);
        addLog(`Error during sentiment analysis: ${error.message}`, 'error');
        sentimentOutput.innerHTML = `<div class="sentiment-output-error">Analysis failed.</div>`;
    }
};

const testOllamaConnection = async () => {
    const testBtn = getElem<HTMLButtonElement>('#test-ollama-btn');
    testBtn.disabled = true;
    testBtn.textContent = '...';

    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();
        showNotification('Ollama connection successful!', 'success');

        const modelExists = data.models.some((m: {name: string}) => m.name.startsWith(ollamaModel));
        if (modelExists) {
            addLog(`Ollama connection test OK. Model "${ollamaModel}" found on server.`);
        } else {
            const availableModels = data.models.length > 0
                ? data.models.map((m: {name: string}) => m.name.split(':')[0]).join(', ')
                : 'none';
            addLog(`Ollama connection test OK, but model "${ollamaModel}" not found. Available: ${availableModels}`, 'default');
        }
    } catch (error) {
        console.error('Ollama connection test failed:', error);
        showNotification('Ollama connection failed. Check server is running.', 'error');
        addLog('Ollama connection failed. Ensure the server is running and CORS is configured for browser access. You may need to set the OLLAMA_ORIGINS environment variable before starting the Ollama server.', 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test';
    }
};

const generateDirective = async () => {
    getElem<HTMLButtonElement>('#generate-directive-btn').disabled = true;
    getElem('.btn-group').innerHTML = `<button id="generate-directive-btn" class="btn btn-buy" disabled>SYNTHESIZING...</button>`;
    getElem('#directive-output').innerHTML = `
        <div class="synthesizing-indicator">
             <span>SYNTHESIZING</span>
             <div class="cursor"></div>
        </div>`;
    updateAIStatus('SYNTHESIZING DIRECTIVE...', false, true);

    const selectedPersona = PERSONAS.find(p => p.id === selectedPersonaId)!;
    addLog(`Engaging ${selectedProviderId.toUpperCase()} with ${selectedPersona.name} persona...`);

    let directiveJson: any;
    let rawResponseText: string | undefined;

    try {
        const prompt = `Analyze the current market conditions and provide a trade directive. Current news: ${MOCK_NEWS.join(' ')}`;
        
        if (selectedProviderId === 'gemini') {
            if (!API_KEY) throw new Error("Gemini API key is not configured.");
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: selectedPersona.systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: JSON_SCHEMA,
                },
            });
            addLog(`AI analysis complete. Parsing response...`, 'ai-analysis');
            rawResponseText = response.text.trim();
        } else if (selectedProviderId === 'ollama') {
            addLog(`Connecting to local Ollama instance with model: ${ollamaModel}...`);
            try {
                const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: ollamaModel,
                        system: `${selectedPersona.systemInstruction}\n\nYou MUST respond with a single, valid JSON object that conforms to the schema provided. Do not include any other text, markdown, or explanations before or after the JSON object.`,
                        prompt: `The user's request is: "${prompt}". The required JSON schema is: ${JSON.stringify(JSON_SCHEMA)}`,
                        format: 'json',
                        stream: false
                    })
                });

                if (!ollamaResponse.ok) {
                    const errorText = await ollamaResponse.text();
                    throw new Error(`Ollama request failed: ${ollamaResponse.status} - ${errorText}`);
                }
                
                const ollamaResult = await ollamaResponse.json();
                if (!ollamaResult.response) {
                    throw new Error('Ollama response is missing the "response" field.');
                }

                addLog(`Ollama analysis complete. Parsing response...`, 'ai-analysis');
                rawResponseText = ollamaResult.response;

            } catch (fetchError: any) {
                 if (fetchError.message.includes('Failed to fetch')) {
                     throw new Error('Connection to local Ollama instance failed. Ensure it is running and CORS is configured for browser access. You may need to set the OLLAMA_ORIGINS environment variable before starting the Ollama server.');
                 }
                 throw fetchError; // Re-throw other errors
            }
        } else {
            throw new Error(`Unsupported AI provider: ${selectedProviderId}`);
        }

        if (!rawResponseText) {
            throw new Error("AI provider returned an empty response.");
        }

        try {
            directiveJson = JSON.parse(rawResponseText);
        } catch (parseError) {
            addLog(`Raw AI Response:\n${rawResponseText}`, 'error');
            throw new Error(
                'AI response was not valid JSON. This can happen if the model includes explanatory text or if the request is unfulfillable. Check the logs for the raw response.'
            );
        }

        const { isValid, error } = validateDirective(directiveJson);
        if (!isValid) {
            throw new Error(`AI response validation failed: ${error} The JSON structure is correct, but required data is missing or invalid.`);
        }
        
        updateAIStatus('DIRECTIVE RECEIVED');
        currentDirective = directiveJson as TradeDirective;
        applyManualOverrides();
        renderDirectiveConfirmation();
        saveState();

    } catch (error: any) {
        console.error("Directive generation failed:", error);
        addLog(`Error: ${error.message}`, 'error');
        updateAIStatus('SYNTHESIS FAILED', true);
        getElem('#directive-output').innerHTML = `
            <div class="error-message">
                <h4>SYNTHESIS FAILED</h4>
                <p>${error.message.replace(/\n/g, '<br>')}</p>
                <p class="error-subtext">Check logs for more details.</p>
            </div>`;
        showNotification('Directive generation failed.', 'error');
        setTimeout(renderInitialDirectivePanel, 5000);
    } 
};


const executeTrade = () => {
    if (!currentDirective) return;
    activeTrade = {
        ...currentDirective,
        allocation: allocation / 100, // as a factor
    };
    // Set initial price from the last known chart price
    activeTrade.currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].c : activeTrade.entry;
    
    currentDirective = null;
    addLog(`Executing ${activeTrade.action} on ${activeTrade.asset} at ${activeTrade.entry} with ${allocation}% allocation.`);
    showNotification(`Trade Executed: ${activeTrade.action} ${activeTrade.asset}`, 'success');
    renderActiveTrade();
    saveState();
};

const closeTrade = (closePrice: number) => {
    if (!activeTrade) return;
    const { asset, action, entryPrice, allocation } = { ...activeTrade, entryPrice: activeTrade.entry };

    const pnl = action === 'LONG' ? (closePrice - entryPrice) * allocation : (entryPrice - closePrice) * allocation;
    const pnlPercent = (pnl / (entryPrice * allocation)) * 100 * 100;

    tradeHistory.unshift({
        asset,
        action,
        entryPrice,
        closePrice,
        pnl,
        pnlPercent,
        timestamp: new Date().toISOString()
    });

    addLog(`Trade closed on ${asset}. PnL: ${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
    showNotification(`Trade Closed. PnL: ${pnl.toFixed(2)} USD`, 'success');

    activeTrade = null;
    renderTradeHistory();
    renderInitialDirectivePanel();
    saveState();
};

const startLivePriceUpdates = () => {
    if (priceUpdaterInterval) return; // Already running

    priceUpdaterInterval = window.setInterval(async () => {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
            if (!response.ok) {
                // Silently fail to avoid spamming logs/notifications on temporary network issues
                console.warn(`Failed to fetch live price: ${response.statusText}`);
                return;
            }
            const data = await response.json();
            const currentPrice = parseFloat(data.lastPrice);

            // Update chart data
            if (marketChart && priceData.length > 0) {
                // Just update the last point for a real-time feel
                priceData[priceData.length - 1].c = currentPrice;
                marketChart.data.datasets[0].data = priceData;
                marketChart.update('none'); // Update without animation for smoothness
            }

            // Update 24h Volume in the UI
            const volumeEl = getElem('#data-point-volume');
            if (volumeEl) {
                const volumeInMillions = (parseFloat(data.quoteVolume) / 1_000_000).toFixed(1);
                volumeEl.textContent = `$${volumeInMillions}M`;
            }

            // Update active trade if it exists
            if (activeTrade) {
                activeTrade.currentPrice = currentPrice;
                
                // Check for TP/SL hit
                if (activeTrade.action === 'LONG' && currentPrice >= activeTrade.target) {
                    addLog(`Take profit hit for ${activeTrade.asset}!`);
                    closeTrade(activeTrade.target);
                } else if (activeTrade.action === 'LONG' && currentPrice <= activeTrade.stopLoss) {
                    addLog(`Stop loss hit for ${activeTrade.asset}.`, 'error');
                    closeTrade(activeTrade.stopLoss);
                } else if (activeTrade.action === 'SHORT' && currentPrice <= activeTrade.target) {
                    addLog(`Take profit hit for ${activeTrade.asset}!`);
                    closeTrade(activeTrade.target);
                } else if (activeTrade.action === 'SHORT' && currentPrice >= activeTrade.stopLoss) {
                    addLog(`Stop loss hit for ${activeTrade.asset}.`, 'error');
                    closeTrade(activeTrade.stopLoss);
                } else {
                     renderActiveTrade(); // Only render if trade is still active
                }
            }

        } catch (error) {
            // Also silent fail here
            console.warn("Error fetching live price:", error);
        }
    }, 3000); // Fetch every 3 seconds for a responsive feel
};

// --- CHARTING ---

const showDataPointModal = (dataPoint: ChartDataPoint) => {
    const modal = getElem('#chart-data-modal');
    const modalBody = getElem('#modal-body');
    const change = dataPoint.c - dataPoint.o;
    const changePercent = (change / dataPoint.o) * 100;

    modalBody.innerHTML = `
        <div class="data-detail-row">
            <span class="label">Time</span>
            <span class="value">${dateFns.format(new Date(dataPoint.x), 'MMM dd, yyyy HH:mm:ss')}</span>
        </div>
        <div class="data-detail-row">
            <span class="label">Open</span>
            <span class="value">${dataPoint.o.toFixed(2)}</span>
        </div>
        <div class="data-detail-row">
            <span class="label">High</span>
            <span class="value">${dataPoint.h.toFixed(2)}</span>
        </div>
        <div class="data-detail-row">
            <span class="label">Low</span>
            <span class="value">${dataPoint.l.toFixed(2)}</span>
        </div>
        <div class="data-detail-row">
            <span class="label">Close</span>
            <span class="value">${dataPoint.c.toFixed(2)}</span>
        </div>
        <div class="data-detail-row">
            <span class="label">Change</span>
            <span class="value ${change >= 0 ? 'positive' : 'negative'}">
                ${change.toFixed(2)} (${changePercent.toFixed(2)}%)
            </span>
        </div>
        <div class="data-detail-row">
            <span class="label">Volume</span>
            <span class="value">${dataPoint.v.toFixed(2)}</span>
        </div>
    `;

    modal.classList.add('show');
};

const closeDataPointModal = () => {
    getElem('#chart-data-modal').classList.remove('show');
};

const handleChartClick = (evt: any) => {
    if (!drawingMode) return;
    
    const canvasPosition = Chart.helpers.getRelativePosition(evt, marketChart);
    const dataX = marketChart.scales.x.getValueForPixel(canvasPosition.x);
    const dataY = marketChart.scales.y.getValueForPixel(canvasPosition.y);
    
    if (drawingMode === 'trendline') {
        if (!trendlineStartPoint) {
            trendlineStartPoint = { x: dataX, y: dataY };
            addLog('Trendline start point set. Click to set end point.');
        } else {
            const annotationName = `trendline_${annotationCounter++}`;
            userAnnotations[annotationName] = {
                type: 'line',
                xMin: trendlineStartPoint.x,
                yMin: trendlineStartPoint.y,
                xMax: dataX,
                yMax: dataY,
                borderColor: '#E6DB74', // accent-yellow
                borderWidth: 2,
            };
            marketChart.options.plugins.annotation.annotations = userAnnotations;
            marketChart.update();
            addLog('Trendline created.');
            trendlineStartPoint = null;
            saveState();
            setDrawingMode(null);
        }
    } else if (drawingMode === 'annotation') {
        const text = prompt('Enter annotation text:');
        if (text) {
            const annotationName = `label_${annotationCounter++}`;
            userAnnotations[annotationName] = {
                type: 'label',
                xValue: dataX,
                yValue: dataY,
                content: text,
                backgroundColor: 'rgba(39, 40, 34, 0.8)',
                color: '#F8F8F2',
                font: { size: 12, family: 'Roboto Mono' },
                padding: 6,
                borderRadius: 4,
            };
            marketChart.options.plugins.annotation.annotations = userAnnotations;
            marketChart.update();
            addLog(`Annotation added: "${text}"`);
            saveState();
        }
        setDrawingMode(null);
    }
};

const chartClickHandler = (evt: any, elements: any[]) => {
    // If drawing mode is active, let the drawing handler take precedence.
    if (drawingMode) {
        handleChartClick(evt);
        return;
    }

    // If not drawing and a data point was clicked, show the modal.
    if (elements.length > 0) {
        const firstPoint = elements[0];
        const dataPoint = marketChart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index] as ChartDataPoint;
        showDataPointModal(dataPoint);
    }
};

const initializeChart = async () => {
    const ctx = getElem<HTMLCanvasElement>('#marketChart').getContext('2d');
    if (!ctx) return;
    
    priceData = await fetchInitialChartData();

    const chartConfig = {
        type: 'line',
        data: {
            datasets: [{
                label: 'BTC/USD',
                data: priceData,
                parsing: {
                    yAxisKey: 'c' // Use the 'c' (close) property for the y-axis
                },
                borderColor: '#66D9EF', // accent-cyan
                backgroundColor: 'rgba(102, 217, 239, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        tooltipFormat: 'MMM dd, HH:mm',
                        displayFormats: { hour: 'HH:mm' }
                    },
                    grid: { color: 'rgba(73, 72, 62, 0.5)' }, // border-color
                    ticks: { color: '#75715E' } // text-secondary
                },
                y: {
                    grid: { color: 'rgba(73, 72, 62, 0.5)' }, // border-color
                    ticks: { color: '#75715E' } // text-secondary
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#272822', // bg-dark
                    titleFont: { family: 'Roboto Mono' },
                    bodyFont: { family: 'Roboto Mono' },
                    padding: 10,
                    callbacks: {
                        title: function(context: any[]) {
                            const date = new Date(context[0].parsed.x);
                            return dateFns.format(date, 'MMM dd, yyyy HH:mm');
                        },
                        label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                zoom: {
                    pan: { enabled: true, mode: 'xy' },
                    zoom: { wheel: { enabled: true }, mode: 'xy' }
                },
                annotation: {
                    annotations: userAnnotations
                }
            },
            onClick: chartClickHandler
        }
    };
    
    marketChart = new Chart(ctx, chartConfig);
};

const setDrawingMode = (mode: 'trendline' | 'annotation' | null) => {
    drawingMode = mode;
    trendlineStartPoint = null; // Reset on tool change
    
    // Update button styles
    getElems('.chart-tool-btn').forEach(btn => btn.classList.remove('active'));
    if (mode) {
        getElem(`#${mode === 'trendline' ? 'draw-trendline' : 'add-annotation'}-btn`).classList.add('active');
        addLog(`Drawing mode activated: ${mode}.`);
    } else {
        addLog('Drawing mode deactivated.');
    }
};

// --- INITIALIZATION ---
const setupEventListeners = () => {
    // Persona Selector
    getElem('#persona-selector').addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>('.persona-card');
        if (card && card.dataset.id) {
            selectedPersonaId = card.dataset.id;
            renderPersonas();
            saveState();
        }
    });

    // Provider Selector
    getElem('#provider-selector').addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>('.provider-card');
        if (card && card.dataset.id) {
            selectedProviderId = card.dataset.id as AIProvider['id'];
            renderAiProviders();
            saveState();
        }
    });

    // Ollama model input
    getElem('#local-model-input').addEventListener('change', (e) => {
        ollamaModel = (e.target as HTMLInputElement).value.trim();
        addLog(`Ollama model set to: ${ollamaModel}`);
        saveState();
    });
    
    getElem('#test-ollama-btn').addEventListener('click', testOllamaConnection);

    // Allocation slider
    const allocSlider = getElem<HTMLInputElement>('#allocation-slider');
    const allocValue = getElem('#allocation-value');
    allocSlider.addEventListener('input', () => {
        allocation = parseInt(allocSlider.value);
        allocValue.textContent = `${allocation}%`;
    });
    allocSlider.addEventListener('change', saveState);

    // Chart controls
    getElem('#reset-zoom-btn').addEventListener('click', () => marketChart?.resetZoom());
    getElem('#draw-trendline-btn').addEventListener('click', () => setDrawingMode('trendline'));
    getElem('#add-annotation-btn').addEventListener('click', () => setDrawingMode('annotation'));
    getElem('#clear-drawings-btn').addEventListener('click', () => {
        userAnnotations = {};
        annotationCounter = 0;
        marketChart.options.plugins.annotation.annotations = userAnnotations;
        marketChart.update();
        addLog('Cleared all drawings from chart.');
        setDrawingMode(null);
        saveState();
    });

    // Modal controls
    const modal = getElem('#chart-data-modal');
    getElem('#modal-close-btn').addEventListener('click', closeDataPointModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDataPointModal();
        }
    });
};

const initializeApp = async () => {
    const stateLoaded = loadState();

    addLog('AI-BITBOY-DEX Strategic Synthesis Core initialized.');
    if (stateLoaded) {
        addLog('Previous session settings restored.');
    }
    
    getElem<HTMLInputElement>('#allocation-slider').value = String(allocation);
    getElem('#allocation-value').textContent = `${allocation}%`;
    
    initializeWalletConnect();
    renderWalletConnector();
    renderPersonas();
    renderAiProviders();
    renderNews();
    analyzeNewsSentiment();
    renderOrderBook();
    renderLog();
    renderTradeHistory();
    await initializeChart();

    if (activeTrade) {
        renderActiveTrade();
    } else {
        renderInitialDirectivePanel();
    }

    setupEventListeners();
    startLivePriceUpdates();
};


document.addEventListener('DOMContentLoaded', initializeApp);
=======
// Auto-resize textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight}px`;
});

// Settings Modal event listeners
settingsButton.addEventListener('click', () => {
    systemInstructionInput.value = getCurrentInstruction();
    webSearchToggle.checked = getWebSearchSetting();
    renderHistory();
    settingsModal.hidden = false;
});
  
closeModalButton.addEventListener('click', () => {
    settingsModal.hidden = true;
});
  
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.hidden = true;
    }
});

systemInstructionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newInstruction = systemInstructionInput.value.trim();
    const webSearchEnabled = webSearchToggle.checked;
    
    if (newInstruction) {
      addToHistory(newInstruction);
    }
    saveWebSearchSetting(webSearchEnabled);

    await initializeChat(newInstruction || getCurrentInstruction(), webSearchEnabled);
    settingsModal.hidden = true;
});
  
clearHistoryButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the instruction history?')) {
        saveHistory([]);
        renderHistory();
    }
});

// CI/CD Modal event listeners
cicdHelperButton.addEventListener('click', () => {
    cicdModal.hidden = false;
});

closeCicdModalButton.addEventListener('click', () => {
    cicdModal.hidden = true;
});

cicdModal.addEventListener('click', (e) => {
    if (e.target === cicdModal) {
        cicdModal.hidden = true;
    }
});

tabContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('tab-button')) {
        const tabId = target.dataset.tab;
        if (tabId) {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            target.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        }
    }
});

pipelineTemplateSelect.addEventListener('change', (e) => {
    const selectedValue = (e.target as HTMLSelectElement).value;
    if (!selectedValue) return;

    const template = pipelineTemplates[selectedValue as keyof typeof pipelineTemplates];
    if (!template) return;

    (document.getElementById('pipeline-platform') as HTMLSelectElement).value = template.platform;
    (document.getElementById('project-language') as HTMLInputElement).value = template.language;
    (document.getElementById('build-command') as HTMLInputElement).value = template.buildCommand;
    (document.getElementById('test-command') as HTMLInputElement).value = template.testCommand;
    (document.getElementById('additional-requirements') as HTMLTextAreaElement).value = template.requirements;

    // Handle checkboxes
    const triggerCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="pipeline-triggers"]');
    triggerCheckboxes.forEach(cb => {
        cb.checked = template.triggers.includes(cb.value);
    });
});

dockerfileTemplateSelect.addEventListener('change', (e) => {
    const selectedValue = (e.target as HTMLSelectElement).value;
    if (!selectedValue) return;
    
    const template = dockerfileTemplates[selectedValue as keyof typeof dockerfileTemplates];
    if (!template) return;
    
    (document.getElementById('docker-language') as HTMLInputElement).value = template.language;
    (document.getElementById('docker-dependencies') as HTMLInputElement).value = template.dependencies;
    (document.getElementById('docker-port') as HTMLInputElement).value = String(template.port);
    (document.getElementById('docker-build-command') as HTMLInputElement).value = template.buildCommand;
    (document.getElementById('docker-start-command') as HTMLInputElement).value = template.startCommand;
    (document.getElementById('docker-requirements') as HTMLTextAreaElement).value = template.requirements;
});

analyzePipelineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pipelineYml = pipelineInput.value.trim();
    if (!pipelineYml) return;

    const prompt = `You are an expert CI/CD and DevOps engineer. Analyze the following pipeline configuration.
Identify potential issues, suggest improvements for security, efficiency, and best practices.
Provide a summary of your findings, and then provide the revised configuration with your suggested changes clearly explained using comments in the code or a list of changes.

Here is the pipeline configuration:
\`\`\`yaml
${pipelineYml}
\`\`\``;
    
    const submitButton = analyzePipelineForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    await streamResponseToElement(prompt, analyzeResult, submitButton);
});

generatePipelineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const platform = (document.getElementById('pipeline-platform') as HTMLSelectElement).value;
    
    const triggerCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="pipeline-triggers"]:checked');
    const triggers = Array.from(triggerCheckboxes).map(cb => cb.value);
    const triggerText = triggers.length > 0 ? triggers.join(', ') : 'Not specified';

    const language = (document.getElementById('project-language') as HTMLInputElement).value;
    const buildCommand = (document.getElementById('build-command') as HTMLInputElement).value;
    const testCommand = (document.getElementById('test-command') as HTMLInputElement).value;
    const requirements = (document.getElementById('additional-requirements') as HTMLTextAreaElement).value;

    const prompt = `You are an expert CI/CD and DevOps engineer. Generate a complete CI/CD pipeline configuration file.
    
Here are the project details:
- Platform: ${platform}
- Pipeline Triggers: ${triggerText}
- Language/Framework: ${language}
- Build Command: ${buildCommand || 'Not specified'}
- Test Command: ${testCommand || 'Not specified'}
- Additional Requirements: ${requirements || 'None'}

Provide the complete and valid YAML file in a single code block. After the code block, briefly explain the key stages and steps in the pipeline.`;

    const submitButton = generatePipelineForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    await streamResponseToElement(prompt, generateResult, submitButton);
});

generateDockerfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const language = (document.getElementById('docker-language') as HTMLInputElement).value;
    const dependencies = (document.getElementById('docker-dependencies') as HTMLInputElement).value;
    const port = (document.getElementById('docker-port') as HTMLInputElement).value;
    const buildCommand = (document.getElementById('docker-build-command') as HTMLInputElement).value;
    const startCommand = (document.getElementById('docker-start-command') as HTMLInputElement).value;
    const requirements = (document.getElementById('docker-requirements') as HTMLTextAreaElement).value;

    if (!language || !dependencies || !startCommand) return;

    const prompt = `You are a Docker expert. Generate a complete and optimized Dockerfile for the following project.
The Dockerfile should be well-commented, explaining each step.
Use best practices, such as multi-stage builds where appropriate, to keep the final image size small.

Project Details:
- Language/Framework: ${language}
- Dependencies/Package Manager File: ${dependencies}
- Port to Expose: ${port || 'Not specified'}
- Build Command: ${buildCommand || 'Not specified'}
- Start Command: ${startCommand}
- Additional Requirements: ${requirements || 'None'}

Provide the complete Dockerfile in a single Dockerfile code block.
After the code block, briefly explain the key choices made, such as the base image selection and the rationale behind the build stages.`;

    const submitButton = generateDockerfileForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    await streamResponseToElement(prompt, dockerfileResult, submitButton);
});

k8sTemplateSelect.addEventListener('change', (e) => {
    const selectedValue = (e.target as HTMLSelectElement).value;
    if (!selectedValue) return;

    const template = k8sTemplates[selectedValue as keyof typeof k8sTemplates];
    if (!template) return;

    (document.getElementById('k8s-manifest-type') as HTMLSelectElement).value = template.manifestType;
    (document.getElementById('app-name') as HTMLInputElement).value = template.appName;
    (document.getElementById('docker-image') as HTMLInputElement).value = template.image;
    (document.getElementById('replicas') as HTMLInputElement).value = String(template.replicas || 1);
    (document.getElementById('container-port') as HTMLInputElement).value = String(template.containerPort || '');
    if (template.serviceType) {
      (document.getElementById('service-type') as HTMLSelectElement).value = template.serviceType;
    }
    (document.getElementById('service-port') as HTMLInputElement).value = String(template.servicePort || '');
    (document.getElementById('target-port') as HTMLInputElement).value = String(template.targetPort || '');
    (document.getElementById('k8s-requirements') as HTMLTextAreaElement).value = template.requirements;
});

generateK8sForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const manifestType = (document.getElementById('k8s-manifest-type') as HTMLSelectElement).value;
    const appName = (document.getElementById('app-name') as HTMLInputElement).value;
    const image = (document.getElementById('docker-image') as HTMLInputElement).value;
    const replicas = (document.getElementById('replicas') as HTMLInputElement).value;
    const containerPort = (document.getElementById('container-port') as HTMLInputElement).value;
    const serviceType = (document.getElementById('service-type') as HTMLSelectElement).value;
    const servicePort = (document.getElementById('service-port') as HTMLInputElement).value;
    const targetPort = (document.getElementById('target-port') as HTMLInputElement).value;
    const requirements = (document.getElementById('k8s-requirements') as HTMLTextAreaElement).value;

    if (!appName) return;

    const prompt = `You are a Kubernetes expert and DevOps engineer. Generate a complete and valid Kubernetes YAML manifest file.
The file should be well-commented, explaining each major section and important field.
Use best practices, such as defining labels for selectors and specifying API versions correctly.

Project Details:
- Manifest Type(s) to Generate: ${manifestType}
- Application Name: ${appName}
- Docker Image: ${image || 'Not specified'}
- Number of Replicas: ${replicas || 'Not specified, use sensible default'}
- Container Port: ${containerPort || 'Not specified'}
- Service Type: ${serviceType || 'Not specified'}
- Service Port: ${servicePort || 'Not specified'}
- Target Port: ${targetPort || 'Defaults to Container Port'}
- Additional Requirements: ${requirements || 'None'}

Provide the complete YAML file in a single YAML code block.
After the code block, briefly explain the key choices made, such as why a certain API version was used or the purpose of the created resources.`;

    const submitButton = generateK8sForm.querySelector('button[type="submit"]') as HTMLButtonElement;
    await streamResponseToElement(prompt, k8sResult, submitButton);
});

generateCloneBtn.addEventListener('click', async () => {
    const repoUrl = (document.getElementById('git-repo-url') as HTMLInputElement).value;
    if (!repoUrl) return;

    const command = `git clone ${repoUrl}`;
    const prompt = `Explain the following Git command for a beginner. What does it do? What are some common options or best practices associated with it?

\`\`\`sh
${command}
\`\`\``;
    await generateAndExplainCommand(command, prompt, gitResult, generateCloneBtn);
});

generateCommitBtn.addEventListener('click', async () => {
    const message = (document.getElementById('git-commit-message') as HTMLInputElement).value;
    const addAll = (document.getElementById('git-add-all') as HTMLInputElement).checked;
    if (!message) return;

    const commands = [];
    if (addAll) {
        commands.push('git add -A');
    }
    commands.push(`git commit -m "${message}"`);
    const commandBlock = commands.join('\n');

    const prompt = `Explain the following sequence of Git commands for a beginner. What does each line do? Why is it important to write good commit messages?

\`\`\`sh
${commandBlock}
\`\`\``;
    await generateAndExplainCommand(commandBlock, prompt, gitResult, generateCommitBtn);
});

generateBranchBtn.addEventListener('click', async () => {
    const branchName = (document.getElementById('git-branch-name') as HTMLInputElement).value;
    const checkout = (document.getElementById('git-checkout-branch') as HTMLInputElement).checked;
    if (!branchName) return;

    const command = checkout ? `git checkout -b ${branchName}` : `git branch ${branchName}`;
    const prompt = `Explain the following Git command for a beginner. What does it do? What's the difference between 'git branch' and 'git checkout -b'?

\`\`\`sh
${command}
\`\`\``;
    await generateAndExplainCommand(command, prompt, gitResult, generateBranchBtn);
});

generateLogBtn.addEventListener('click', async () => {
    const count = (document.getElementById('git-log-count') as HTMLInputElement).value;
    
    let command = 'git log --oneline --graph --decorate';
    if (count && parseInt(count, 10) > 0) {
        command += ` -n ${parseInt(count, 10)}`;
    }

    const prompt = `Explain the following Git command for a beginner. What does each flag (--oneline, --graph, --decorate) do? Why is this a useful way to view commit history?

\`\`\`sh
${command}
\`\`\``;
    await generateAndExplainCommand(command, prompt, gitResult, generateLogBtn);
});

// Initial Load
window.addEventListener('load', () => {
    const currentInstruction = getCurrentInstruction();
    const webSearchEnabled = getWebSearchSetting();
    initializeChat(currentInstruction, webSearchEnabled);
});
>>>>>>> a82d405ed7b34abd96f3ee904fd03991111ba12e
