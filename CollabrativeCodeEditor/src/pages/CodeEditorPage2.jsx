
import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareCode, X, ChevronDown, Play } from "lucide-react";
import AISidebar from "../components/AISidebar";
import { useAuth } from "../context/AuthContext.jsx";
import { initVimMode } from "monaco-vim";

const getErrorCategory = (err) => {
  if (!err) return "Unknown";
  const text = err.toLowerCase();
  if (text.includes("syntax") || text.includes("indentation")) return "Syntax";
  if (text.includes("reference") || text.includes("not defined")) return "Reference";
  if (text.includes("typeerror")) return "Type";
  if (text.includes("import") || text.includes("module")) return "Import";
  if (text.includes("time") || text.includes("limit")) return "Timeout";
  
  return "Runtime"; // Default fallback
};

// API helper
const logRunToDatabase = async (runData) => {
  try {
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/log-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(runData),
    });
  } catch (err) {
    console.error("Failed to log run:", err);
  }
};

const CodeEditorPage2 = ({
  language = "python",
  code = "",
  stdin = "",
  output = "",
  onUpdate = () => {},
}) => {
  // Editor State
  const [currentLang, setCurrentLang] = useState(sessionStorage.getItem("language") || language);
  const [currentCode, setCurrentCode] = useState(sessionStorage.getItem("code") || code);
  const [currentInput, setCurrentInput] = useState(stdin);
  const [currentOutput, setCurrentOutput] = useState(output);
  const [loading, setLoading] = useState(false);
  
  // Visibility State
  const [showOutputPanel, setShowOutputPanel] = useState(false);

  // Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const containerRef = useRef(null);
  const aiRef = useRef(null);
  const { user } = useAuth();

  // Vim State
  const [isVimMode, setIsVimMode] = useState(sessionStorage.getItem("vimMode") === "true"||false);
  const editorRef = useRef(null);
  const statusBarRef = useRef(null);
  const vimModeRef = useRef(null);

  // Sync props
  useEffect(() => {sessionStorage.setItem("language", currentLang)}, [currentLang]);
  useEffect(() => {
    sessionStorage.setItem("code", currentCode);
  }, [currentCode]);
  useEffect(() => setCurrentInput(stdin), [stdin]);
  useEffect(() => setCurrentOutput(output), [output]);


  // Sidebar Resizing
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(300, rect.right - e.clientX);
      const maxWidth = Math.max(400, rect.width - 400);
      setSidebarWidth(Math.min(maxWidth, newWidth));
    };
    const stopDrag = () => setIsDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [isDragging]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    if (isVimMode) {
    vimModeRef.current = initVimMode(editorRef.current, statusBarRef.current);
  }
  };

  // Vim Mode Toggle
  useEffect(() => {
    sessionStorage.setItem("vimMode", isVimMode);
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

  const runCode = async () => {
    setLoading(true);
    setShowOutputPanel(true); // Show output on run
    setCurrentOutput("Running...");
    onUpdate?.({ output: "Running..." });

    let result = "";
    let isError = false;
    let errorOutput = "";

    try {
      const res = await axios.post("https://emkc.org/api/v2/piston/execute", {
        language: currentLang,
        version: "*",
        files: [{ name: "main", content: currentCode }],
        stdin: currentInput,
      });

      const stdout = res.data.run?.stdout?.trim();
      const stderr = res.data.run?.stderr?.trim();
      const compileErr = res.data.compile?.stderr?.trim();
      errorOutput = stderr || compileErr;
      isError = !!errorOutput;
      result = isError ? `Compiler Error:\n${errorOutput}` : stdout || "No output";
    } catch (err) {
      isError = true;
      errorOutput = "⚠ Internal Error running code.";
      result = errorOutput;
    } finally {
      setLoading(false);
      setCurrentOutput(result);
      onUpdate?.({ output: result });

      if (user) {
        const category = isError ? getErrorCategory(errorOutput) : undefined;
        
        logRunToDatabase({
          isSuccess: !isError,
          error: isError ? errorOutput.split("\n")[0].trim() : null, 
          category: category, 
          language: currentLang,
          code: currentCode,
        });
      }
    }
  };

  const geminiAiHandler = async (text) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/ask-buddy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      return { answer: data.answer };
    } catch (error) {
      return { answer: `Connection error: ${error.message}` };
    }
  };

  const handleExplainError = () => {
    setIsSidebarOpen(true);
    if (aiRef.current?.ask) {
      const aiPrompt = `Help me fix this error:\nCode:\n${currentCode}\nError:\n${currentOutput}`;
      aiRef.current.ask(aiPrompt);
    }
  };

  // Handlers
  const handleChange = (val) => { setCurrentCode(val || ""); onUpdate?.({ code: val || "" }); };
  const handleLangChange = (e) => { setCurrentLang(e.target.value); onUpdate?.({ language: e.target.value }); };
  const handleInputChange = (e) => { setCurrentInput(e.target.value); onUpdate?.({ stdin: e.target.value }); };

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col pt-6 overflow-hidden">
      <main ref={containerRef} className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        
        {/* --- LEFT SECTION: Editor & IO --- */}
        <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
          
          {/* 1. EDITOR PANEL (Takes remaining height) */}
          <div className="flex-1 flex flex-col bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700/50 relative z-10">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur px-4 py-3 border-b border-slate-700/50 shrink-0">
               <h1 className="text-sm font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                 Coding IDE Powered with AI Buddy
               </h1>

               <div className="flex items-center gap-3">
                 {/* Vim Checkbox */}
                 <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-slate-600 transition">
                   <input
                     type="checkbox"
                     checked={isVimMode}
                     onChange={(e) => setIsVimMode(e.target.checked)}
                     className="w-3 h-3 rounded border-slate-600 text-cyan-500 focus:ring-0 bg-slate-800"
                   />
                   <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Vim Mode</span>
                 </label>

                 <select
                   value={currentLang}
                   onChange={handleLangChange}
                   className="bg-slate-900 text-white text-xs border border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500 transition"
                 >
                   <option value="python">Python</option>
                   <option value="javascript">JavaScript</option>
                   <option value="cpp">C++</option>
                   <option value="java">Java</option>
                   <option value="go">Go</option>

                 </select>

                 <button
                   onClick={runCode}
                   disabled={loading}
                   className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg transition-all active:scale-95 ${
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
                language={currentLang}
                value={currentCode}
                onChange={handleChange}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            
            {/* Vim Status Bar (Visible only when Vim Mode is ON) */}
            <div 
              ref={statusBarRef} 
              className={`bg-slate-800 text-white text-xs font-bold font-mono px-3 py-1 border-t border-slate-700/50 ${isVimMode ? 'block' : 'hidden'}`}
              style={{ minHeight: '26px' }} 
            />
          </div>

          {/* 2. BOTTOM PANEL (Fixed Height: 200px) */}
          {/* Input is always visible. Output slides in. */}
          <div className="h-48 flex gap-4 shrink-0 overflow-hidden">
            
            {/* INPUT PANEL (Always Visible) */}
            <motion.div 
              layout
              className="flex flex-col bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg h-full"
              animate={{ width: showOutputPanel ? "50%" : "100%" }} // Shrinks to 50% if output is open
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            >
              <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Input (Stdin)</span>
              </div>
              <textarea
                value={currentInput}
                onChange={handleInputChange}
                className="flex-1 w-full p-3 bg-transparent text-slate-300 text-sm font-mono resize-none outline-none focus:bg-slate-800/50 transition custom-scrollbar"
                placeholder="Enter input for your code here..."
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
                  className="messages flex flex-col bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg h-full relative"
                >
                  <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Output</span>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setShowOutputPanel(false)} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700"><X size={12} /></button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-3 overflow-auto font-mono text-sm custom-scrollbar bg-slate-900/30">
                      {currentOutput ? (
                        <pre className={`${currentOutput.startsWith("Compiler Error") || currentOutput.startsWith("⚠") ? "text-rose-400" : "text-emerald-400"}`}>
                          {currentOutput}
                        </pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
                          Waiting for output...
                        </div>
                      )}
                  </div>

                  {/* Quick Fix AI Button */}
                  {(currentOutput.startsWith("Compiler Error") || currentOutput.startsWith("⚠")) && (
                      <motion.button
                        onClick={handleExplainError}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute bottom-3 right-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                      >
                        <MessageSquareCode size={14} /> Neutralize the Bug
                      </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Resizer Handle */}
        {isSidebarOpen && (
          <div
            onMouseDown={() => setIsDragging(true)}
            className="w-1 cursor-col-resize hover:bg-cyan-500/30 rounded-full transition-colors"
          />
        )}

        {/* --- RIGHT SECTION: AI Sidebar --- */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: sidebarWidth, 
                opacity: 1, 
                transition: { type: "spring", stiffness: 200, damping: 25 }
              }}
              exit={{ 
                width: 0, 
                opacity: 0, 
                transition: { duration: 0.2 }
              }}
              className="flex-shrink-0 h-full rounded-2xl shadow-2xl border border-slate-700/50 bg-slate-900 overflow-hidden"
            >
              <div style={{ width: sidebarWidth }} className="h-full"> 
                 <AISidebar
                    ref={aiRef}
                    aiHandler={geminiAiHandler}
                    onClose={() => setIsSidebarOpen(false)}
                  />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Floating AI Button */}
        {!isSidebarOpen && (
          <motion.button
            layoutId="ai-trigger"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed bottom-8 right-8 p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 z-50 hover:scale-105 transition-transform"
          >
            <MessageSquareCode size={24} />
          </motion.button>
        )}
      </main>
    </div>
  );
};

export default CodeEditorPage2;