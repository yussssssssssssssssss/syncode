import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

const CollaborativeEditor = ({ socket, roomCode, userRole }) => {
  const [code, setCode] = useState('// Welcome to Syncode!\n// Start coding collaboratively with your team.\n\nfunction helloWorld() {\n  console.log("Hello from Syncode!");\n  return "Collaborative coding is awesome!";\n}\n\n// Try editing this code and see it sync in real-time!');
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');
  const [isConnected, setIsConnected] = useState(false);
  const editorRef = useRef(null);
  const lastChangeRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for code changes from other users
    socket.on('codeChange', (data) => {
      if (data.userId !== socket.userId && data.roomCode === roomCode) {
        console.log('📝 Received code change from:', data.userName);
        setCode(data.code);
      }
    });

    // Listen for cursor position updates
    socket.on('cursorChange', (data) => {
      if (data.userId !== socket.userId && data.roomCode === roomCode) {
        // Handle cursor position updates (can be implemented later)
        console.log('👆 Cursor change from:', data.userName);
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
      }
    });

    setIsConnected(true);

    return () => {
      socket.off('codeChange');
      socket.off('cursorChange');
      socket.off('languageChange');
      socket.off('themeChange');
      socket.off('codeSync');
    };
  }, [socket, roomCode]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set initial code
    editor.setValue(code);
    
    // Listen for changes
    editor.onDidChangeModelContent(() => {
      const currentCode = editor.getValue();
      const currentTime = Date.now();
      
      // Debounce changes to avoid too many socket emissions
      if (lastChangeRef.current) {
        clearTimeout(lastChangeRef.current);
      }
      
      lastChangeRef.current = setTimeout(() => {
        if (socket && isConnected) {
          socket.emit('codeChange', {
            roomCode,
            code: currentCode,
            timestamp: currentTime
          });
        }
      }, 300); // 300ms debounce
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (socket && isConnected) {
      socket.emit('languageChange', {
        roomCode,
        language: newLanguage
      });
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    if (socket && isConnected) {
      socket.emit('themeChange', {
        roomCode,
        theme: newTheme
      });
    }
  };

  const handleRunCode = () => {
    try {
      // Create a safer evaluation environment for JavaScript
      if (language === 'javascript') {
        // Create a sandboxed environment
        const sandbox = {
          console: {
            log: (...args) => {
              const output = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' ');
              alert(`Console Output:\n${output}`);
            },
            error: (...args) => {
              alert(`Error: ${args.join(' ')}`);
            },
            warn: (...args) => {
              alert(`Warning: ${args.join(' ')}`);
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
          Promise: Promise
        };

        // Create a function with the sandboxed environment
        const func = new Function('console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Error', 'Promise', code);
        
        // Execute the function with sandboxed objects
        const result = func(
          sandbox.console, sandbox.setTimeout, sandbox.setInterval, 
          sandbox.clearTimeout, sandbox.clearInterval, sandbox.Date, 
          sandbox.Math, sandbox.JSON, sandbox.Array, sandbox.Object, 
          sandbox.String, sandbox.Number, sandbox.Boolean, 
          sandbox.RegExp, sandbox.Error, sandbox.Promise
        );
        
        if (result !== undefined) {
          alert(`Code executed successfully!\nReturn value: ${result}`);
        }
      } else {
        // For other languages, show a message
        alert(`Code execution is currently only supported for JavaScript.\n\nTo run ${language} code, please use an external compiler or IDE.`);
      }
    } catch (error) {
      console.error('Code execution error:', error);
      alert(`Code execution failed:\n${error.message}`);
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
    <div className="bg-white rounded-lg shadow">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Theme:</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <span className="text-sm text-gray-600">
              {isConnected ? 'Synced' : 'Disconnected'}
            </span>
          </div>
          
          <button
            onClick={handleRunCode}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Run Code
          </button>
          
          <button
            onClick={handleSaveCode}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            automaticLayout: true,
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

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-100 text-xs text-gray-600 border-t">
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