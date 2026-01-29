import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import { initVimMode } from "monaco-vim";

const CodeEditor = ({ page, socket, roomId, userId }) => {
  const {
    id: pageId,
    language: initialLanguage,
    stdin: initialStdin,
    output: initialOutput,
    code: initialCode,
  } = page;

  /* ---------------- STATE ---------------- */
  const [language, setLanguage] = useState(initialLanguage || "javascript");
  const [stdin, setStdin] = useState(initialStdin || "");
  const [output, setOutput] = useState(initialOutput || "");
  const [loading, setLoading] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);

  /* ---------------- REFS ---------------- */
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const statusBarRef = useRef(null);
  const vimModeRef = useRef(null);

  /** 🔒 Prevent echo loops */
  const isRemoteEditRef = useRef(false);

  /* ---------------- VIM MODE STATE ---------------- */
  const [isVimMode, setIsVimMode] = useState(false);

  /* ---------------- SOCKET: RECEIVE OPS ---------------- */
  useEffect(() => {
    if (!socket) return;

    const handleRemoteOp = ({
      roomId: rId,
      pageId: pId,
      userId: senderId,
      range,
      text,
    }) => {
      if (rId !== roomId) return;
      if (pId !== pageId) return;
      if (senderId === userId) return;

      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      isRemoteEditRef.current = true;

      editor.executeEdits("remote", [
        {
          range: new monaco.Range(
            range.startLineNumber,
            range.startColumn,
            range.endLineNumber,
            range.endColumn
          ),
          text,
        },
      ]);

      isRemoteEditRef.current = false;
    };

    const handleContentUpdate = ({ pageId: pId, userId: senderId, updates }) => {
      if (pId !== pageId) return;
      if (senderId === userId) return;

      if (updates.language !== undefined) {
        setLanguage(updates.language);
      }
      if (updates.stdin !== undefined) {
        setStdin(updates.stdin);
      }
      if (updates.output !== undefined) {
        setOutput(updates.output);
        if (updates.output && updates.output !== "Running...") {
          setShowOutputPanel(true);
        }
      }
    };

    socket.on("editor-op", handleRemoteOp);
    socket.on("content-update", handleContentUpdate);
    
    return () => {
      socket.off("editor-op", handleRemoteOp);
      socket.off("content-update", handleContentUpdate);
    };
  }, [socket, roomId, pageId, userId]);

  /* ---------------- MONACO SETUP ---------------- */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set initial code from page data (or empty string)
    editor.setValue(initialCode || "");

    // Initialize Vim mode if enabled
    if (isVimMode) {
      vimModeRef.current = initVimMode(editor, statusBarRef.current);
    }

    // 🔥 Capture local edits as OPERATIONS
    editor.onDidChangeModelContent((event) => {
      if (isRemoteEditRef.current) return;

      event.changes.forEach((change) => {
        socket.emit("editor-op", {
          roomId,
          pageId,
          userId,
          range: change.range,
          text: change.text,
        });
      });

      // Save code to page state
      const currentCode = editor.getValue();
      socket.emit("content-change", {
        roomId,
        pageId,
        userId,
        updates: { code: currentCode },
      });
    });
  };

  /* ---------------- VIM MODE TOGGLE ---------------- */
  useEffect(() => {
    if (!editorRef.current) return;
    
    if (isVimMode) {
      if (vimModeRef.current) vimModeRef.current.dispose();
      vimModeRef.current = initVimMode(editorRef.current, statusBarRef.current);
    } else {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
      if (statusBarRef.current) statusBarRef.current.innerHTML = "";
    }
  }, [isVimMode]);

  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
    };
  }, []);

  /* ---------------- LANGUAGE CHANGE ---------------- */
  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);

    socket.emit("content-change", {
      roomId,
      pageId,
      userId,
      updates: { language: newLang },
    });
  };

  /* ---------------- INPUT ---------------- */
  const handleInputChange = (e) => {
    const val = e.target.value;
    setStdin(val);

    socket.emit("content-change", {
      roomId,
      pageId,
      userId,
      updates: { stdin: val },
    });
  };

  /* ---------------- RUN CODE ---------------- */
  const runCode = async () => {
    setLoading(true);
    setShowOutputPanel(true);
    setOutput("Running...");

    socket.emit("content-change", {
      roomId,
      pageId,
      userId,
      updates: { output: "Running..." },
    });

    let result = "";
    let isError = false;

    try {
      const code = editorRef.current?.getValue() || "";

      const res = await axios.post(
        "https://emkc.org/api/v2/piston/execute",
        {
          language,
          version: "*",
          files: [{ name: "main", content: code }],
          stdin,
        }
      );

      const stdout = res.data.run?.stdout?.trim();
      const stderr = res.data.run?.stderr?.trim();
      const compileErr = res.data.compile?.stderr?.trim();
      const errorOutput = stderr || compileErr;
      isError = !!errorOutput;
      result = isError ? `Compiler Error:\n${errorOutput}` : stdout || "No output";
    } catch (err) {
      isError = true;
      result = "⚠ Internal Error running code.";
    } finally {
      setLoading(false);
      setOutput(result);

      socket.emit("content-change", {
        roomId,
        pageId,
        userId,
        updates: { output: result },
      });
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="h-full bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-3 pt-2 min-h-0">
        
        {/* EDITOR PANEL (Takes remaining height) */}
        <div className="flex-1 flex flex-col bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700/50">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur px-3 py-2 border-b border-slate-700/50 shrink-0">
            <select
                value={language}
                onChange={handleLangChange}
                className="bg-slate-900 text-white text-xs border border-slate-700 rounded-lg px-2.5 py-1 outline-none focus:border-cyan-500 transition"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
              </select>

            <div className="flex items-center gap-2">
              {/* Vim Mode Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900/50 px-2.5 py-1 rounded-full border border-slate-700/50 hover:border-slate-600 transition">
                <input
                  type="checkbox"
                  checked={isVimMode}
                  onChange={(e) => setIsVimMode(e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600 text-cyan-500 focus:ring-0 bg-slate-800"
                />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Vim Mode</span>
              </label>
              
              {/* Run Button */}
              <button
                onClick={runCode}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg transition-all active:scale-95 ${
                  loading ? "bg-emerald-900/50 text-emerald-200" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {loading ? "Running..." : <><Play size={10} fill="currentColor"/> Run</>}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="relative flex-1 bg-[#1e1e1e] min-h-0">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 15 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Vim Status Bar (Visible only when Vim Mode is ON) */}
          <div 
            ref={statusBarRef} 
            className={`bg-slate-800 text-white text-xs font-bold font-mono px-3 py-1 border-t border-slate-700/50 ${isVimMode ? 'block' : 'hidden'}`}
            style={{ minHeight: '24px' }} 
          />
        </div>

        {/* BOTTOM PANEL (Fixed Height: 140px) */}
        <div className="h-36 flex gap-3 shrink-0 overflow-hidden">
          
          {/* INPUT PANEL (Always Visible) */}
          <motion.div 
            layout
            className="flex flex-col bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg h-full"
            animate={{ width: showOutputPanel ? "50%" : "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          >
            <div className="bg-slate-800/80 px-3 py-1.5 border-b border-slate-700/50">
              <span className="text-[12px] font-bold uppercase text-slate-400 tracking-widest">Input (Stdin)</span>
            </div>
            <textarea
              value={stdin}
              onChange={handleInputChange}
              className="flex-1 w-full p-2.5 bg-transparent text-slate-300 text-xs font-mono resize-none outline-none focus:bg-slate-800/50 transition custom-scrollbar"
              placeholder="Enter input for your code here..."
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#475569 #1e293b'
              }}
            />
          </motion.div>

          {/* OUTPUT PANEL (Conditionally Visible) */}
          <AnimatePresence>
            {showOutputPanel && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "50%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="flex flex-col bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg h-full relative"
              >
                <div className="bg-slate-800/80 px-3 py-1.5 border-b border-slate-700/50 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Output</span>
                  <button 
                    onClick={() => setShowOutputPanel(false)} 
                    className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700"
                  >
                    <X size={12} />
                  </button>
                </div>
                
                <div 
                  className="flex-1 p-2.5 overflow-auto font-mono text-xs bg-slate-900/30"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#475569 #1e293b'
                  }}
                >
                  {output ? (
                    <pre className={`${output.startsWith("Compiler Error") || output.startsWith("⚠") ? "text-rose-400" : "text-emerald-400"}`}>
                      {output}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
                      Waiting for output...
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;