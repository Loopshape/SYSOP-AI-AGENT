
AI Autonomic Synthesis Platform (v33.0)

A fully autonomous AI CLI platform for task management, trading, project tracking, and automated workflows.

This script is designed to run from ~/bin/ai and integrates multiple AI models, persistent caching, hashing, and streaming output.


---

Table of Contents

1. Features


2. Installation


3. Directory Structure


4. AGI Models & Loops


5. Tools


6. Commands


7. Hashing & MIME Handling


8. Databases


9. Security


10. Logging & Feedback




---

Features

AGI Workflow with 12 loops

Streaming mode always enabled

Models: core, loop, 2244-1

Hashing: strings, files, directories, salted

MIME detection and file processing

Project ingestion & rehashing

QBit task management

Bitcoin market analysis & trading

WebKit repository build

Persistent caching & memory

Full logging and error tracking



---

Installation

1. Clone or copy the ai.sh script to ~/bin/ai:



mkdir -p ~/bin
cp ai.sh ~/bin/ai
chmod +x ~/bin/ai

2. Ensure your path includes ~/bin:



export PATH="$HOME/bin:$PATH"

3. Run ai --help to verify installation:



ai --help


---

Directory Structure

All files and databases are stored under ~/.local_ai:

.local_ai/
├── logs/                  # System logs
├── tmp/                   # Temporary files
├── swap/                  # Compressed large outputs
├── agent_core.db          # AI core memory & tool logs
├── ai_task_manager.db     # Task manager DB (projects, file hashes, events)
├── secret.key             # HMAC secret key

Projects ingested via ai ingest <path> are tracked here.


---

AGI Models & Loops

Models used:

core → Messenger / state analysis

loop → Planner

2244-1 → Executor / decision-making


AGI loops: 12 maximum per workflow

Streaming output: tokens appear live in terminal

Caching: semantic prompt hashing with persistent storage



---

Tools

Project Management

Ingest repositories

Rehash and verify files

MIME-based processing


QBit

Log structured tasks to SQLite


BTC Trading

Analyze market (RSI, MACD, support/resistance, volume)

Buy/sell placeholders


WebKit Builder

Clone & build WebKit locally

Logs build output


Market Analysis

Technical crypto analysis for any asset




---

Commands

ai <prompt>         Run AGI workflow
ai ingest <path>    Ingest project for tracking
ai rehash <hash>    Rehash project files
ai task <prompt>    Create AI task
ai qbit <args>      QBit task
ai btc [action]     BTC trade/analyze
ai webkit           Build WebKit
ai analyze <asset>  Market analysis
ai --help           Show this help

Fallback: Unknown commands automatically trigger AGI workflow.


---

Hashing & MIME Handling

String hashing: SHA256, salted options

File hashing: SHA256, SHA512, MD5

Directory hashing: recursive SHA256 of all files

MIME type detection:

text/* → hash & track

image/* → log for AI processing

application/zip → archive logged

Unknown types trigger warnings




---

Databases

Task DB (ai_task_manager.db):

projects — project hash, path, timestamp

file_hashes — file integrity tracking

events — AI tasks, QBit, other events


Core DB (agent_core.db):

memories — cached AI responses

tool_logs — execution logs of all tools



---

Security

HMAC secret key stored in secret.key

SQLite & log files can be secured via chmod

Data integrity verified via HMAC calculations



---

Logging & Feedback

Color-coded terminal output: INFO, WARN, ERROR, SUCCESS

Logs both to terminal and logs/system.log

AGI workflow loops and tool actions fully logged

Supports streaming live output for AI decisions



---

Example Usage

# Run AGI workflow
ai "Create a React component for dashboard"

# Ingest a project for tracking
ai ingest ~/projects/myapp

# Rehash project files
ai rehash <project_hash>

# Execute QBit task
ai qbit "Generate test plan"

# Analyze Bitcoin market
ai btc analyze

# Build WebKit locally
ai webkit

# Perform technical analysis on ETH/USD
ai analyze ETH/USD


---

This README.md now documents all capabilities, commands, paths, models, tools, and security measures in a clear and structured format for developers or operators.


---

