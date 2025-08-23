import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { JUDGE0_CONFIG } from '../config';

const TEMPLATES = {
  javascript:
`// Reads from stdin using readLine()
function main() {
  const n = parseInt(readLine() || "0", 10);
  console.log(n * 2);
}
main();`,

  typescript:
`// Reads from stdin using readLine()
function main(): void {
  const n = parseInt(readLine() || "0", 10);
  console.log(n * 2);
}
main();`,

  python:
`# Reads from stdin
n = int(input() or 0)
print(n * 2)`,

  java:
`import java.util.*;
public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    int n = sc.hasNextInt() ? sc.nextInt() : 0;
    System.out.println(n * 2);
  }
}`,

  cpp:
`#include <bits/stdc++.h>
using namespace std;
int main(){
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  long long n = 0;
  if(!(cin >> n)) n = 0;
  cout << (n * 2) << "\\n";
  return 0;
}`,

  csharp:
`using System;
class Program {
  static void Main() {
    var line = Console.ReadLine();
    int n = 0;
    int.TryParse(line, out n);
    Console.WriteLine(n * 2);
  }
}`,

  php:
`<?php
$line = trim(fgets(STDIN));
$n = is_numeric($line) ? intval($line) : 0;
echo ($n * 2) . PHP_EOL;`,

  ruby:
`n = (STDIN.gets || "0").to_i
puts n * 2`,

  go:
`package main
import (
  "bufio"
  "fmt"
  "os"
  "strconv"
  "strings"
)
func main() {
  in := bufio.NewReader(os.Stdin)
  s, _ := in.ReadString('\\n')
  s = strings.TrimSpace(s)
  n, _ := strconv.Atoi(s)
  fmt.Println(n * 2)
}`,

  rust:
`use std::io::{self, Read};
fn main() {
  let mut s = String::new();
  io::stdin().read_to_string(&mut s).unwrap();
  let n: i64 = s.trim().parse().unwrap_or(0);
  println!("{}", n * 2);
}`,

  html:
`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Preview</title></head>
<body>
  <h1>Hello from Syncode</h1>
  <p>Switch to JS/TS/Python/etc to run with input.</p>
</body>
</html>`,

  css:
`/* Paste CSS here */
body { font-family: sans-serif; }`,

  json:
`{ "message": "Valid JSON goes here" }`,

  sql:
`-- Example query (no execution in browser)
SELECT 2 * 2 AS result;`,
};

const CollaborativeEditor = ({ socket, roomCode, userRole, initialSync = null }) => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(TEMPLATES['javascript']);
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'
  );
  const [isConnected, setIsConnected] = useState(false);
  const [output, setOutput] = useState('');
  const [compiling, setCompiling] = useState(false);

  // NEW: stdin state
  const [stdin, setStdin] = useState('');

  const editorRef = useRef(null);
  const lastChangeRef = useRef(null);
  const isLocalChange = useRef(false);
  const socketRef = useRef(null);

  // Judge0
  const JUDGE0_API_URL = JUDGE0_CONFIG.API_URL;
  const JUDGE0_API_KEY = JUDGE0_CONFIG.API_KEY;

  const languageIds = {
    javascript: 63,
    typescript: 74,
    python: 71,
    java: 62,
    cpp: 54,
    csharp: 51,
    php: 68,
    ruby: 72,
    go: 60,
    rust: 73,
    html: 83,
    css: 52,
    json: 82,
    sql: 82,
  };

  useEffect(() => {
    socketRef.current = socket || null;
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('codeChange', (data) => {
      if (data.userId !== socket.userId && data.roomCode === roomCode) {
        isLocalChange.current = true;
        setCode(data.code);
        editorRef.current?.setValue(data.code);
        isLocalChange.current = false;
      }
    });

    socket.on('languageChange', (data) => {
      if (data.roomCode === roomCode) {
        setLanguage(data.language);
        // when language changes remotely, also switch template (non-destructive)
        const tpl = TEMPLATES[data.language] || '';
        setCode(tpl);
        editorRef.current?.setValue(tpl);
      }
    });

    socket.on('themeChange', (data) => {
      if (data.roomCode === roomCode) setTheme(data.theme);
    });

    socket.on('codeSync', (data) => {
      if (data.roomCode === roomCode) {
        setCode(data.code);
        setLanguage(data.language);
        setTheme(data.theme);
        editorRef.current?.setValue(data.code);
      }
    });

    // Also apply any initial sync provided by parent (e.g., received before editor mounted)
    if (initialSync && initialSync.code) {
      try {
        setCode(initialSync.code);
        if (initialSync.language) setLanguage(initialSync.language);
        if (initialSync.theme) setTheme(initialSync.theme);
        // apply to editor if mounted
        editorRef.current?.setValue(initialSync.code);
      } catch (e) {
        console.error('Error applying initialSync:', e);
      }
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('codeChange');
      socket.off('languageChange');
      socket.off('themeChange');
      socket.off('codeSync');
    };
  }, [socket, roomCode]);

  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail?.theme === 'dark' ? 'vs-dark' : 'vs-light';
      setTheme(next);
    };
    window.addEventListener('themechange', handler);
    return () => window.removeEventListener('themechange', handler);
  }, []);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.setValue(code);
    editor.onDidChangeModelContent(() => {
      if (isLocalChange.current) return;
      const currentCode = editor.getValue();
      setCode(currentCode);
      if (lastChangeRef.current) clearTimeout(lastChangeRef.current);
      lastChangeRef.current = setTimeout(() => {
        const s = socketRef.current;
        if (s?.connected) {
          s.emit('codeChange', { roomCode, code: currentCode, timestamp: Date.now() });
        }
      }, 500);
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    // swap in boilerplate (non-destructive: you can choose to guard if code is non-empty)
    const tpl = TEMPLATES[newLanguage] || '';
    setCode(tpl);
    editorRef.current?.setValue(tpl);

    const s = socketRef.current;
    if (s?.connected) {
      s.emit('languageChange', { roomCode, language: newLanguage });
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    const s = socketRef.current;
    if (s?.connected) s.emit('themeChange', { roomCode, theme: newTheme });
  };

  const handleRunCode = async () => {
    try {
      setOutput('');
      setCompiling(true);

      // local JS/TS execution with readLine bound to stdin
      if (language === 'javascript' || language === 'typescript') {
        const logs = [];
        const errors = [];

        const inputLines = (stdin || '').split(/\r?\n/);
        let idx = 0;
        const readLine = () => (idx < inputLines.length ? inputLines[idx++] : '');

        const sandbox = {
          console: {
            log: (...args) => {
              const out = args
                .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
                .join(' ');
              logs.push(out);
            },
            error: (...args) => errors.push(args.join(' ')),
            warn: (...args) => logs.push(`WARNING: ${args.join(' ')}`),
          },
          readLine, // <-- important
          setTimeout,
          setInterval,
          clearTimeout,
          clearInterval,
          Date,
          Math,
          JSON,
          Array,
          Object,
          String,
          Number,
          Boolean,
          RegExp,
          Error,
          Promise,
          alert: (msg) => logs.push(`ALERT: ${msg}`),
          prompt: () => null,
          confirm: () => false,
        };

        const func = new Function(
          'console','readLine','setTimeout','setInterval','clearTimeout','clearInterval',
          'Date','Math','JSON','Array','Object','String','Number','Boolean',
          'RegExp','Error','Promise','alert','prompt','confirm', code
        );

        const result = func(
          sandbox.console, sandbox.readLine, sandbox.setTimeout, sandbox.setInterval,
          sandbox.clearTimeout, sandbox.clearInterval, sandbox.Date, sandbox.Math,
          sandbox.JSON, sandbox.Array, sandbox.Object, sandbox.String, sandbox.Number,
          sandbox.Boolean, sandbox.RegExp, sandbox.Error, sandbox.Promise,
          sandbox.alert, sandbox.prompt, sandbox.confirm
        );

        let out = '';
        if (logs.length) out += `Console Output:\n${logs.join('\n')}\n\n`;
        if (errors.length) out += `Errors:\n${errors.join('\n')}\n\n`;
        if (result !== undefined) out += `Return Value: ${result}`;
        setOutput(out || 'Code executed successfully (no output)');
        return;
      }

      if (language === 'html') {
        const w = window.open('', '_blank');
        w.document.write(code);
        w.document.close();
        setOutput('HTML opened in new tab for preview');
        return;
      }

      if (language === 'css') {
        const styleId = 'temp-css-preview';
        document.getElementById(styleId)?.remove();
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = code;
        document.head.appendChild(style);
        setOutput('CSS applied to current page temporarily. Refresh to remove.');
        setTimeout(() => style.parentNode && style.remove(), 10000);
        return;
      }

      if (language === 'json') {
        try {
          const parsed = JSON.parse(code);
          setOutput(`Valid JSON:\n${JSON.stringify(parsed, null, 2)}`);
        } catch (e) {
          setOutput(`Invalid JSON: ${e.message}`);
        }
        return;
      }

      if (language === 'sql') {
        setOutput('SQL execution requires a DB connection. Use an external client.');
        return;
      }

      // External compilation via Judge0 (C++, Java, Python, etc.)
      if (!JUDGE0_API_KEY) {
        setOutput('Judge0 API key is missing. Check VITE_JUDGE0_API_KEY and restart the dev server.');
        return;
      }

      const languageId = languageIds[language];
      if (!languageId) {
        setOutput(`Language ${language} is not supported for external compilation.`);
        return;
      }

      setOutput(`Compiling ${language} code...`);

      const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': JUDGE0_CONFIG.HOST,
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: stdin || '',
        }),
      });

      if (!submitResponse.ok) {
        throw new Error(`Failed to submit code: ${submitResponse.status} ${submitResponse.statusText}`);
      }

      const submitData = await submitResponse.json();
      const token = submitData.token;

      // poll for result
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        const resultResponse = await fetch(
          `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
          { headers: { 'X-RapidAPI-Key': JUDGE0_API_KEY, 'X-RapidAPI-Host': JUDGE0_CONFIG.HOST } }
        );

        if (!resultResponse.ok) {
          throw new Error(`Failed to get results: ${resultResponse.status} ${resultResponse.statusText}`);
        }

        const resultData = await resultResponse.json();
        if (resultData.status && resultData.status.id > 2) {
          let text = '';
          if (resultData.status.id === 3) {
            text = `✅ Code executed successfully!\n\nOutput:\n${resultData.stdout || '(no output)'}`;
            if (resultData.stderr) text += `\n\nWarnings:\n${resultData.stderr}`;
          } else if (resultData.status.id === 6) {
            text = `🔨 Compilation Error\n\n${resultData.compile_output || 'Unknown compilation error'}`;
          } else {
            text = `❌ ${resultData.status.description}\n\n${resultData.stderr || ''}`;
          }
          setOutput(text);
          break;
        }
        attempts++;
      }

      if (attempts >= maxAttempts) setOutput('⏰ Compilation timeout. Please try again.');
    } catch (error) {
      console.error('Code execution error:', error);
      setOutput(`Code execution failed:\n${error.message}`);
    } finally {
      setCompiling(false);
    }
  };

  const handleSaveCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncode-${roomCode}-${Date.now()}.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
  ];

  const themeOptions = [
    { value: 'vs-dark', label: 'Dark' },
    { value: 'vs-light', label: 'Light' },
    { value: 'hc-black', label: 'High Contrast' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow border border-slate-200 dark:border-slate-700 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Language:</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 rounded text-sm"
            >
              {languageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Theme:</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 rounded text-sm"
            >
              {themeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Synced' : 'Disconnected'}</span>
          </div>

          <button
            onClick={handleRunCode}
            disabled={compiling}
            className={`px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-transform ${
              compiling ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02]'
            }`}
          >
            {compiling ? 'Compiling…' : 'Run Code'}
          </button>

          <button
            onClick={handleSaveCode}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:scale-[1.02] transition-transform"
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="h-96">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={code}
          onChange={setCode}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
            wordWrap: 'on',
            folding: true,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'all',
            mouseWheelZoom: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            parameterHints: { enabled: true },
          }}
        />
      </div>

      {/* NEW: Stdin box */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4">
        <label className="text-sm font-semibold">Input (stdin):</label>
        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          placeholder="Type input lines here. Example:\n5"
          className="mt-2 w-full h-24 p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 text-sm"
        />
      </div>

      {/* Output */}
      {output && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold mb-2">Code Output:</h3>
          <pre className="text-sm bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-900/40 text-xs border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4">
          <span>Room: {roomCode}</span>
          <span>Role: {userRole}</span>
          <span>Language: {language}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Real-time collaboration enabled</span>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
