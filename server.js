// server.js - ES Module Version

import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import sqlite3 from 'sqlite3';

// Helper for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.AI_PORT || 3000;

// --- Configuration ---
const AI_HOME = process.env.AI_HOME || path.join(process.env.HOME, '.ai_agent');
const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(process.env.HOME, 'ai_projects');
const MEMORY_DB = path.join(AI_HOME, 'memory.db');

const AGENT_MODEL = process.env.AGENT_MODEL || 'gemma2:9b';
const REVIEWER_MODEL = process.env.REVIEWER_MODEL || 'llama3:8b';
const COMBINATOR_MODEL = process.env.COMBINATOR_MODEL || 'llama3:8b';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper Functions ---
async function ensureDirs() {
    await fs.mkdir(AI_HOME, { recursive: true });
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

function initDB() {
    const db = new (sqlite3.verbose().Database)(MEMORY_DB);
    db.run(`CREATE TABLE IF NOT EXISTS verbose_history (
        id INTEGER PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        task_id TEXT,
        model TEXT,
        stage TEXT,
        prompt TEXT,
        output TEXT,
        weight REAL
    )`, (err) => {
        if (err) console.error("DB Init Error:", err);
    });
    db.close();
}

function runModel(model, prompt, timeout = 120000) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ollama', ['run', model, prompt]);
        let output = '', error = '';

        proc.stdout.on('data', data => output += data.toString());
        proc.stderr.on('data', data => error += data.toString());

        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error(`Model execution timeout for ${model}`));
        }, timeout);

        proc.on('close', code => {
            clearTimeout(timer);
            if (code === 0) resolve(output.trim());
            else reject(new Error(error || `Model ${model} failed with code ${code}`));
        });
    });
}

async function logVerbose(taskId, model, stage, prompt, output, weight = 0) {
    const db = new (sqlite3.verbose().Database)(MEMORY_DB);
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO verbose_history (task_id, model, stage, prompt, output, weight)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [taskId, model, stage, prompt, output, weight],
            (err) => {
                if (err) {
                    console.error("Verbose logging failed:", err);
                    reject(err);
                } else {
                    resolve();
                }
                db.close();
            }
        );
    });
}

// --- AI Workflow ---
async function runAITask(prompt, taskId) {
    const agentPrompt = `You are an expert developer. Create a detailed, actionable plan and write the necessary code or commands to solve the user's request. User Request: ${prompt}`;
    const reviewerPrompt = `You are a critical code reviewer. Analyze the user's request. Identify potential bugs, security vulnerabilities, and areas for improvement. Propose a refined, more robust solution. User Request: ${prompt}`;

    const promises = [
        runModel(AGENT_MODEL, agentPrompt),
        runModel(REVIEWER_MODEL, reviewerPrompt)
    ];
    const results = await Promise.allSettled(promises);

    const agentOutput = results[0].status === 'fulfilled' ? results[0].value : `Error: ${results[0].reason.message}`;
    const reviewerOutput = results[1].status === 'fulfilled' ? results[1].value : `Error: ${results[1].reason.message}`;

    await logVerbose(taskId, AGENT_MODEL, 'initial_agent', agentPrompt, agentOutput);
    await logVerbose(taskId, REVIEWER_MODEL, 'initial_reviewer', reviewerPrompt, reviewerOutput);

    return [{ model: AGENT_MODEL, output: agentOutput }, { model: REVIEWER_MODEL, output: reviewerOutput }];
}

async function aggregateWithCore(pool, taskId) {
    const poolContext = pool.map(o => `--- Output from ${o.model} ---\n${o.output}`).join('\n\n');
    const controlPrompt = `You are the Core Combinator AI. Synthesize the insights from the Agent and Reviewer. Resolve conflicts and produce a single, complete, and definitive final answer or code solution.\n\n${poolContext}\n\n---
Based on the above, provide the final, executable solution.`;

    const finalOutput = await runModel(COMBINATOR_MODEL, controlPrompt);
    await logVerbose(taskId, COMBINATOR_MODEL, 'final_answer', controlPrompt, finalOutput);
    return finalOutput;
}

// --- API Routes ---
app.post('/api/command', async (req, res) => {
    try {
        const { command } = req.body;
        if (!command) return res.status(400).json({ success: false, error: 'Command is required.' });

        const taskId = `task_${Date.now()}`;
        const taskDir = path.join(PROJECTS_DIR, taskId);
        await fs.mkdir(taskDir, { recursive: true });

        const pool = await runAITask(command, taskId);

        await fs.writeFile(path.join(taskDir, 'pool.json'), JSON.stringify(pool, null, 2));
        res.json({ success: true, pool_task: taskId, message: `Task created with ${pool.length} model outputs` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/pool', async (req, res) => {
    try {
        const taskId = req.query.task;
        if (!taskId) return res.status(400).json({ error: 'Task ID is required.' });
        const data = await fs.readFile(path.join(PROJECTS_DIR, taskId, 'pool.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(404).json({ error: 'Pool not found' });
    }
});

app.post('/api/finalize', async (req, res) => {
    try {
        const { task, pool } = req.body;
        if (!task || !pool) return res.status(400).json({ error: 'Task and pool are required.' });
        const final = await aggregateWithCore(pool, task);
        const taskDir = path.join(PROJECTS_DIR, task);
        await fs.writeFile(path.join(taskDir, 'final.txt'), final);
        res.json({ final });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', async (req, res) => {
    const taskId = req.query.task;
    if (!taskId) return res.status(400).json({ error: 'Task ID is required.' });
    const db = new (sqlite3.verbose().Database)(MEMORY_DB);
    db.all("SELECT * FROM verbose_history WHERE task_id=? ORDER BY timestamp ASC", [taskId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
        db.close();
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
async function startServer() {
    await ensureDirs();
    initDB();
    app.listen(PORT, () => {
        console.log(`🤖 AI DevOps Platform v14.1+ (ESM) running at http://localhost:${PORT}`);
    });
}

startServer();
