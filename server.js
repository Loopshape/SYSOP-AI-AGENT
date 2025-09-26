#!/usr/bin/env node
// tri_stream_server_json.mjs
import http from "http";
import { spawn } from "child_process";
import url from "url";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const AI_BIN = path.resolve(process.env.HOME, "bin/ai");

function workerFromLine(line) {
  if (line.includes("WORKER: MESSENGER")) return "Messenger";
  if (line.includes("WORKER: COMBINATOR")) return "Combinator";
  if (line.includes("WORKER: TRADER")) return "Trader";
  if (line.includes("WORKER: SYSTEM")) return "System";
  return null;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/ai") {
    const userPrompt = parsedUrl.query.prompt || "";
    if (!userPrompt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "missing ?prompt=" }));
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const aiProc = spawn(AI_BIN, [userPrompt], {
      env: { ...process.env, PATH: process.env.PATH },
    });

    let currentWorker = "System";
    let inFinalAnswer = false;

    function sendEvent(eventObj) {
      res.write(`data: ${JSON.stringify(eventObj)}\n\n`);
    }

    aiProc.stdout.on("data", (data) => {
      data.toString().split(/\r?\n/).forEach((line) => {
        if (!line.trim()) return;

        // Detect final answer
        if (line.includes("[FINAL_ANSWER]")) {
          inFinalAnswer = true;
        }

        const detected = workerFromLine(line);
        if (detected) currentWorker = detected;

        sendEvent({
          timestamp: new Date().toISOString(),
          worker: currentWorker,
          final: inFinalAnswer,
          msg: line,
        });
      });
    });

    aiProc.stderr.on("data", (data) => {
      data.toString().split(/\r?\n/).forEach((line) => {
        if (!line.trim()) return;
        sendEvent({
          timestamp: new Date().toISOString(),
          worker: "Error",
          final: false,
          msg: line,
        });
      });
    });

    aiProc.on("close", (code) => {
      sendEvent({
        timestamp: new Date().toISOString(),
        worker: "System",
        final: false,
        msg: `Triumvirate finished with code ${code}`,
      });
      res.end();
    });
  }

  else if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
<!doctype html>
<html>
<head>
  <title>Triumvirate Agent Live JSON</title>
  <style>
    body { font-family: monospace; background:#111; color:#eee; }
    .logbox { padding:6px; margin:4px 0; border:1px solid #444; white-space:pre-wrap; max-height:200px; overflow-y:auto; }
    #Messenger{background:#202b33;color:#9cf;}
    #Combinator{background:#1a1a2e;color:#c9f;}
    #Trader{background:#2e1a1a;color:#fc9;}
    #System{background:#1f1f1f;color:#aaa;}
    #Error{background:#330000;color:#f66;}
    #FinalAnswer{background:#003300;color:#9f9;font-weight:bold;}
  </style>
</head>
<body>
<h1>Triumvirate Mind (Structured JSON UI)</h1>
<form onsubmit="launch(event)">
<input type="text" id="prompt" size="60" placeholder="Enter request" />
<button type="submit">Run</button>
</form>

<div id="System" class="logbox"></div>
<div id="Messenger" class="logbox"></div>
<div id="Combinator" class="logbox"></div>
<div id="Trader" class="logbox"></div>
<div id="Error" class="logbox"></div>
<div id="FinalAnswer" class="logbox"></div>
<button onclick="downloadFinal()">⬇️ Download Final Answer</button>

<script>
function appendLog(id, msg) {
  const box = document.getElementById(id);
  box.innerText += msg + "\\n";
  box.scrollTop = box.scrollHeight;
}

function launch(e) {
  e.preventDefault();
  ["System","Messenger","Combinator","Trader","Error","FinalAnswer"].forEach(id=>document.getElementById(id).innerText="");
  const prompt=document.getElementById("prompt").value;
  const evt=new EventSource("/ai?prompt="+encodeURIComponent(prompt));

  evt.onmessage=(e)=>{
    const obj=JSON.parse(e.data);
    const target=obj.final ? "FinalAnswer" : obj.worker;
    appendLog(target,obj.timestamp+": "+obj.msg);
  };
}

function downloadFinal() {
  const text=document.getElementById("FinalAnswer").innerText.trim();
  if(!text){alert("No Final Answer yet!"); return;}
  const blob=new Blob([text],{type:"text/plain"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="final_answer.txt";
  a.click();
  URL.revokeObjectURL(url);
}
</script>
</body>
</html>`);
  }

  else {
    res.writeHead(404,{ "Content-Type": "text/plain"});
    res.end("404 Not Found");
  }
});

server.listen(PORT,()=>console.log(`Triumvirate JSON SSE server at http://localhost:${PORT}/`));
