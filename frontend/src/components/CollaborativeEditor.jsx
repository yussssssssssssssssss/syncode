import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { JUDGE0_CONFIG } from '../config';

const CollaborativeEditor = ({ socket, roomCode, userRole }) => {
  const [code, setCode] = useState('// Welcome to Syncode!\n// Start coding collaboratively with your team.\n\nfunction helloWorld() {\n  console.log("Hello from Syncode!");\n  return "Collaborative coding is awesome!";\n}\n\n// Try editing this code and see it sync in real-time!');
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'));
  const [isConnected, setIsConnected] = useState(false);
  const [output, setOutput] = useState('');
  const [compiling, setCompiling] = useState(false);
  const editorRef = useRef(null);
  const lastChangeRef = useRef(null);
  const isLocalChange = useRef(false);
  const socketRef = useRef(null);

  // Judge0 API configuration for external compilation
  const JUDGE0_API_URL = JUDGE0_CONFIG.API_URL;
  const JUDGE0_API_KEY = JUDGE0_CONFIG.API_KEY;
  
  // Language ID mapping for Judge0 API
  const languageIds = {
    'javascript': 63, // Node.js
    'typescript': 74, // TypeScript
    'python': 71,     // Python 3
    'java': 62,       // Java
    'cpp': 54,        // C++17
    'csharp': 51,     // C#
    'php': 68,        // PHP
    'ruby': 72,       // Ruby
    'go': 60,         // Go
    'rust': 73,       // Rust
    'html': 83,       // HTML
    'css': 52,        // CSS
    'json': 82,       // JSON
    'sql': 82         // SQL (using JSON as fallback)
  };

  useEffect(() => {
    // Keep a fresh reference to the socket to avoid stale closures in editor handlers
    socketRef.current = socket || null;
    if (!socket) return;

    // Track actual socket connection state
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Listen for code changes from other users
    socket.on('codeChange', (data) => {
      if (data.userId !== socket.userId && data.roomCode === roomCode) {
        console.log('📝 Received code change from:', data.userName);
        isLocalChange.current = true;
        setCode(data.code);
        if (editorRef.current) {
          editorRef.current.setValue(data.code);
        }
        isLocalChange.current = false;
      }
    });

    // Listen for language changes
    socket.on('languageChange', (data) => {
      if (data.roomCode === roomCode) {
        console.log('🔤 Language changed to:', data.language);
        setLanguage(data.language);
      }
    });

    // Listen for theme changes
    socket.on('themeChange', (data) => {
      if (data.roomCode === roomCode) {
        console.log('🎨 Theme changed to:', data.theme);
        setTheme(data.theme);
      }
    });

    // Listen for initial code sync
    socket.on('codeSync', (data) => {
      if (data.roomCode === roomCode) {
        console.log('🔄 Syncing code with room');
        setCode(data.code);
        setLanguage(data.language);
        setTheme(data.theme);
        if (editorRef.current) {
          editorRef.current.setValue(data.code);
        }
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('codeChange');
      socket.off('languageChange');
      socket.off('themeChange');
      socket.off('codeSync');
    };
  }, [socket, roomCode]);

  // Sync Monaco theme with app theme changes
  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail?.theme === 'dark' ? 'vs-dark' : 'vs-light';
      setTheme(next);
    };
    window.addEventListener('themechange', handler);
    return () => window.removeEventListener('themechange', handler);
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set initial code
    editor.setValue(code);
    
    // Listen for changes
    editor.onDidChangeModelContent(() => {
      if (isLocalChange.current) return; // Skip if this is a remote change

      const currentCode = editor.getValue();
      const currentTime = Date.now();

      // Update local state
      setCode(currentCode);

      // Debounce changes to avoid too many socket emissions
      if (lastChangeRef.current) {
        clearTimeout(lastChangeRef.current);
      }

      lastChangeRef.current = setTimeout(() => {
        const activeSocket = socketRef.current;
        if (activeSocket && activeSocket.connected) {
          console.log('📤 Sending code change to other users');
          activeSocket.emit('codeChange', {
            roomCode,
            code: currentCode,
            timestamp: currentTime
          });
        }
      }, 500); // 500ms debounce
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    const activeSocket = socketRef.current;
    if (activeSocket && activeSocket.connected) {
      activeSocket.emit('languageChange', {
        roomCode,
        language: newLanguage
      });
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    const activeSocket = socketRef.current;
    if (activeSocket && activeSocket.connected) {
      activeSocket.emit('themeChange', {
        roomCode,
        theme: newTheme
      });
    }
  };

  const handleRunCode = async () => {
    try {
      setOutput('');
      setCompiling(true);
      
      if (language === 'javascript') {
        // Local JavaScript execution (existing logic)
        const logs = [];
        const errors = [];
        
        const sandbox = {
          console: {
            log: (...args) => {
              const output = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' ');
              logs.push(output);
              console.log('Code Output:', output);
            },
            error: (...args) => {
              const output = args.join(' ');
              errors.push(output);
              console.error('Code Error:', output);
            },
            warn: (...args) => {
              const output = args.join(' ');
              logs.push(`WARNING: ${output}`);
              console.warn('Code Warning:', output);
            }
          },
          setTimeout: setTimeout,
          setInterval: setInterval,
          clearTimeout: clearTimeout,
          clearInterval: clearInterval,
          Date: Date,
          Math: Math,
          JSON: JSON,
          Array: Array,
          Object: Object,
          String: String,
          Number: Number,
          Boolean: Boolean,
          RegExp: RegExp,
          Error: Error,
          Promise: Promise,
          alert: (msg) => logs.push(`ALERT: ${msg}`),
          prompt: () => null,
          confirm: () => false
        };

        const func = new Function(
          'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 
          'Date', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 
          'RegExp', 'Error', 'Promise', 'alert', 'prompt', 'confirm', code
        );
        
        const result = func(
          sandbox.console, sandbox.setTimeout, sandbox.setInterval, 
          sandbox.clearTimeout, sandbox.clearInterval, sandbox.Date, 
          sandbox.Math, sandbox.JSON, sandbox.Array, sandbox.Object, 
          sandbox.String, sandbox.Number, sandbox.Boolean, 
          sandbox.RegExp, sandbox.Error, sandbox.Promise,
          sandbox.alert, sandbox.prompt, sandbox.confirm
        );
        
        let outputText = '';
        if (logs.length > 0) {
          outputText += `Console Output:\n${logs.join('\n')}\n\n`;
        }
        if (errors.length > 0) {
          outputText += `Errors:\n${errors.join('\n')}\n\n`;
        }
        if (result !== undefined) {
          outputText += `Return Value: ${result}`;
        }
        
        setOutput(outputText || 'Code executed successfully (no output)');
        
      } else if (language === 'html') {
        // HTML preview
        const htmlContent = code;
        const newWindow = window.open('', '_blank');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        setOutput('HTML opened in new tab for preview');
        
      } else if (language === 'css') {
        // CSS preview (apply to current page temporarily)
        const styleId = 'temp-css-preview';
        let existingStyle = document.getElementById(styleId);
        if (existingStyle) {
          existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = code;
        document.head.appendChild(style);
        
        setOutput('CSS applied to current page temporarily. Refresh to remove.');
        
        // Remove after 10 seconds
        setTimeout(() => {
          if (style.parentNode) {
            style.remove();
          }
        }, 10000);
        
      } else if (language === 'json') {
        // JSON validation
        try {
          const parsed = JSON.parse(code);
          setOutput(`Valid JSON:\n${JSON.stringify(parsed, null, 2)}`);
        } catch (error) {
          setOutput(`Invalid JSON: ${error.message}`);
        }
        
      } else if (language === 'sql') {
        setOutput('SQL execution requires a database connection. Please use an external SQL client.');
        
      } else {
        // External compilation for other languages
        if (JUDGE0_API_KEY === 'your-rapidapi-key') {
          setOutput(`External compilation not configured for ${language}.\n\nTo enable compilation:\n1. Get a RapidAPI key from https://rapidapi.com/judge0-official/api/judge0-ce\n2. Update JUDGE0_API_KEY in the code\n3. Restart the application`);
          return;
        }
        
        const languageId = languageIds[language];
        if (!languageId) {
          setOutput(`Language ${language} is not supported for external compilation.`);
          return;
        }
        
        setOutput(`Compiling ${language} code...`);
        
        // Submit code for compilation
        const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'X-RapidAPI-Host': JUDGE0_CONFIG.HOST
          },
          body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: ''
          })
        });
        
        if (!submitResponse.ok) {
          throw new Error(`Failed to submit code: ${submitResponse.statusText}`);
        }
        
        const submitData = await submitResponse.json();
        const token = submitData.token;
        
        // Poll for results
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}`, {
            headers: {
              'X-RapidAPI-Key': JUDGE0_API_KEY,
              'X-RapidAPI-Host': JUDGE0_CONFIG.HOST
            }
          });
          
          if (!resultResponse.ok) {
            throw new Error(`Failed to get results: ${resultResponse.statusText}`);
          }
          
          const resultData = await resultResponse.json();
          
          if (resultData.status && resultData.status.id > 2) {
            // Compilation/execution completed
            let outputText = '';
            
            if (resultData.status.id === 3) {
              // Accepted
              outputText = `✅ Code executed successfully!\n\nOutput:\n${resultData.stdout || '(no output)'}`;
              if (resultData.stderr) {
                outputText += `\n\nWarnings:\n${resultData.stderr}`;
              }
            } else if (resultData.status.id === 4) {
              // Wrong Answer
              outputText = `❌ Wrong Answer\n\nExpected output doesn't match actual output.`;
            } else if (resultData.status.id === 5) {
              // Time Limit Exceeded
              outputText = `⏰ Time Limit Exceeded\n\nYour code took too long to execute.`;
            } else if (resultData.status.id === 6) {
              // Compilation Error
              outputText = `🔨 Compilation Error\n\n${resultData.compile_output || 'Unknown compilation error'}`;
            } else {
              outputText = `❌ Execution Error\n\nStatus: ${resultData.status.description}\n\nError: ${resultData.stderr || 'Unknown error'}`;
            }
            
            setOutput(outputText);
            break;
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          setOutput('⏰ Compilation timeout. Please try again.');
        }
      }
      
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
    { value: 'typescript', label: 'TypeScript' },
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
    { value: 'sql', label: 'SQL' }
  ];

  const themeOptions = [
    { value: 'vs-dark', label: 'Dark' },
    { value: 'vs-light', label: 'Light' },
    { value: 'hc-black', label: 'High Contrast' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow border border-slate-200 dark:border-slate-700 transition-colors">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Language:</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Theme:</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
            >
              {themeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {isConnected ? 'Synced' : 'Disconnected'}
            </span>
          </div>
          
          <button
            onClick={handleRunCode}
            disabled={compiling}
            className={`px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-transform ${
              compiling 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02]'
            }`}
          >
            {compiling ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Compiling...</span>
              </div>
            ) : (
              'Run Code'
            )}
          </button>
          
          <button
            onClick={handleSaveCode}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:scale-[1.02] transition-transform"
          >
            Save
          </button>
        </div>
      </div>

      {/* Code Editor */}
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
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            glyphMargin: true,
            renderLineHighlight: 'all',
            selectOnLineNumbers: true,
            readOnly: false,
            cursorStyle: 'line',
            contextmenu: true,
            mouseWheelZoom: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            parameterHints: {
              enabled: true
            }
          }}
        />
      </div>

      {/* Output Panel */}
      {output && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 transition-colors">
          <h3 className="text-sm font-semibold mb-2">Code Output:</h3>
          <pre className="text-sm bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-auto max-h-32 whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-900/40 text-xs text-gray-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 transition-colors">
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