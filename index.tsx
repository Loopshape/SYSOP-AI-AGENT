/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';
import hljs from 'highlight.js';

const API_KEY = process.env.API_KEY;

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


if (!API_KEY) {
  output.innerHTML =
    '<div class="error">API key not found. Please set the API_KEY environment variable.</div>';
}

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

  input.value = '';
  input.style.height = 'auto'; // Reset height

  await appendMessage('user', prompt);
  let loadingIndicator = await showLoadingIndicator();

  try {
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
  }
});

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