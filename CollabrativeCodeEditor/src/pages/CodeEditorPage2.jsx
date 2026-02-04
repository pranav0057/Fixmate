import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareCode, X, Play, Plus } from "lucide-react";
import { initVimMode } from "monaco-vim";

import AISidebar from "../components/AISidebar";
import { useAuth } from "../context/AuthContext.jsx";

// ==================== CONSTANTS ====================
const STORAGE_KEYS = {
  PAGES: "solo_pages",
  ACTIVE_PAGE_ID: "solo_activePageId",
  VIM_MODE: "vimMode",
};

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
];

const DEFAULT_PAGE = {
  id: "page_1",
  name: "Main",
  language: "python",
  code: "",
  stdin: "",
  output: "",
};

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  padding: { top: 16 },
  scrollBeyondLastLine: false,
  automaticLayout: true,
};

const SIDEBAR_CONFIG = {
  DEFAULT_WIDTH: 400,
  MIN_WIDTH: 300,
  MIN_EDITOR_WIDTH: 400,
};

// UTILITY FUNCTIONS 
const getErrorCategory = (errorMessage) => {
  if (!errorMessage) return "Unknown";
  
  const text = errorMessage.toLowerCase();
  const categoryMap = {
    Syntax: ["syntax", "indentation"],
    Reference: ["reference", "not defined"],
    Type: ["typeerror"],
    Import: ["import", "module"],
    Timeout: ["time", "limit"],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return "Runtime";
};

const generatePageId = () => `page_${Date.now()}`;

//  API SERVICES 
const apiService = {
  logRun: async (runData) => {
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/log-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(runData),
      });
    } catch (error) {
      console.error("Failed to log run:", error);
    }
  },

  executeCode: async (language, code, stdin) => {
    const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
      language,
      version: "*",
      files: [{ name: "main", content: code }],
      stdin,
    });
    return response.data;
  },

  askAI: async (prompt) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/ask-buddy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      return { answer: data.answer };
    } catch (error) {
      return { answer: `Connection error: ${error.message}` };
    }
  },
};

//  STORAGE UTILITIES ====================
const storageUtils = {
  getPages: () => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.PAGES);
    return saved ? JSON.parse(saved) : [DEFAULT_PAGE];
  },

  setPages: (pages) => {
    sessionStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(pages));
  },

  getActivePageId: () => {
    return sessionStorage.getItem(STORAGE_KEYS.ACTIVE_PAGE_ID);
  },

  setActivePageId: (pageId) => {
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE_ID, pageId);
  },

  getVimMode: () => {
    return sessionStorage.getItem(STORAGE_KEYS.VIM_MODE) === "true";
  },

  setVimMode: (enabled) => {
    sessionStorage.setItem(STORAGE_KEYS.VIM_MODE, enabled);
  },
};

// ==================== CUSTOM HOOKS ====================
const usePages = () => {
  const [pages, setPages] = useState(() => storageUtils.getPages());
  const [activePageId, setActivePageId] = useState(() => {
    const savedId = storageUtils.getActivePageId();
    return savedId || pages[0]?.id;
  });

  useEffect(() => {
    storageUtils.setPages(pages);
  }, [pages]);

  useEffect(() => {
    storageUtils.setActivePageId(activePageId);
  }, [activePageId]);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  const addPage = useCallback(() => {
    const newId = generatePageId();
    const newPage = {
      id: newId,
      name: `Page ${pages.length + 1}`,
      language: "python",
      code: "",
      stdin: "",
      output: "",
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageId(newId);
  }, [pages.length]);

  const removePage = useCallback(
    (pageId) => {
      if (pages.length === 1) return;

      const newPages = pages.filter((p) => p.id !== pageId);
      setPages(newPages);

      if (pageId === activePageId) {
        setActivePageId(newPages[0].id);
      }
    },
    [pages, activePageId]
  );

  const updatePage = useCallback(
    (updates) => {
      setPages((prevPages) =>
        prevPages.map((p) => (p.id === activePageId ? { ...p, ...updates } : p))
      );
    },
    [activePageId]
  );

  const renamePage = useCallback((pageId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    setPages((prevPages) =>
      prevPages.map((p) => (p.id === pageId ? { ...p, name: trimmedName } : p))
    );
  }, []);

  return {
    pages,
    activePage,
    activePageId,
    setActivePageId,
    addPage,
    removePage,
    updatePage,
    renamePage,
  };
};

const useSidebarResize = (initialWidth = SIDEBAR_CONFIG.DEFAULT_WIDTH) => {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(SIDEBAR_CONFIG.MIN_WIDTH, rect.right - e.clientX);
      const maxWidth = Math.max(SIDEBAR_CONFIG.DEFAULT_WIDTH, rect.width - SIDEBAR_CONFIG.MIN_EDITOR_WIDTH);
      
      setSidebarWidth(Math.min(maxWidth, newWidth));
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return {
    sidebarWidth,
    isDragging,
    setIsDragging,
    containerRef,
  };
};

const useVimMode = (editorRef, statusBarRef) => {
  const [isVimMode, setIsVimMode] = useState(() => storageUtils.getVimMode());
  const vimModeRef = useRef(null);

  useEffect(() => {
    storageUtils.setVimMode(isVimMode);

    if (!editorRef.current) return;

    if (isVimMode) {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
      vimModeRef.current = initVimMode(editorRef.current, statusBarRef.current);
    } else {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
        vimModeRef.current = null;
      }
      if (statusBarRef.current) {
        statusBarRef.current.innerHTML = "";
      }
    }
  }, [isVimMode, editorRef, statusBarRef]);

  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
    };
  }, []);

  return { isVimMode, setIsVimMode };
};

// ==================== SUBCOMPONENTS ====================
const PageTabs = ({ pages, activePageId, onPageSelect, onPageRename, onPageClose, onAddPage }) => {
  const [editingPageId, setEditingPageId] = useState(null);

  const handleNameChange = (pageId, newName) => {
    onPageRename(pageId, newName);
    setEditingPageId(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="relative max-w-md w-full">
        <div className="page-tabs flex items-center gap-2 overflow-x-auto pb-1">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`flex items-center px-3 py-1.5 rounded-md whitespace-nowrap flex-shrink-0 ${
                page.id === activePageId
                  ? "bg-slate-900 text-white border border-cyan-500"
                  : "text-gray-400 hover:text-white hover:bg-slate-700 border border-transparent"
              } ${editingPageId !== page.id ? "cursor-pointer" : "cursor-text"}`}
              onClick={() => onPageSelect(page.id)}
              onDoubleClick={() => setEditingPageId(page.id)}
            >
              {editingPageId === page.id ? (
                <input
                  type="text"
                  defaultValue={page.name}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  className="bg-slate-700 text-white text-sm p-0 border-none w-20 focus:ring-0 focus:border-none rounded px-1"
                  onBlur={(e) => handleNameChange(page.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditingPageId(null);
                  }}
                />
              ) : (
                <span className="text-xs truncate max-w-[80px] select-none">
                  {page.name}
                </span>
              )}

              {pages.length > 1 && editingPageId !== page.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPageClose(page.id);
                  }}
                  className="ml-1.5 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={onAddPage}
            className="bg-cyan-600 text-white px-2 py-1.5 rounded-md flex items-center hover:bg-cyan-500 hover:scale-105 transition-all flex-shrink-0"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const EditorToolbar = ({ 
  language, 
  onLanguageChange, 
  onRun, 
  isRunning, 
  isVimMode, 
  onVimModeChange 
}) => {
  return (
    <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur px-4 py-3 border-b border-slate-700/50 shrink-0 gap-4">
      <div className="flex flex-col">
        <h1 className="text-[14px] font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent leading-tight">
          Coding IDE
        </h1>
        <h2 className="text-[10px] font-semibold text-slate-400 leading-tight">
          Powered with AI Buddy
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-700/50 hover:border-slate-600 transition">
          <input
            type="checkbox"
            checked={isVimMode}
            onChange={(e) => onVimModeChange(e.target.checked)}
            className="w-3 h-3 rounded border-slate-600 text-cyan-500 focus:ring-0 bg-slate-800"
          />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Vim Mode
          </span>
        </label>

        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-slate-900 text-white text-xs border border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500 transition"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        <button
          onClick={onRun}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg transition-all active:scale-95 ${
            isRunning
              ? "bg-emerald-900/50 text-emerald-200"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {isRunning ? (
            "Running..."
          ) : (
            <>
              <Play size={10} fill="currentColor" /> Run
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const InputPanel = ({ value, onChange }) => {
  return (
    <div className="flex flex-col bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg h-full">
      <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50">
        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
          Input (Stdin)
        </span>
      </div>
      <textarea
        value={value}
        onChange={onChange}
        className="flex-1 w-full p-3 bg-transparent text-slate-300 text-sm font-mono resize-none outline-none focus:bg-slate-800/50 transition custom-scrollbar"
        placeholder="Enter input for your code here..."
      />
    </div>
  );
};

const OutputPanel = ({ output, onClose, onFixError }) => {
  const isError = output.startsWith("Compiler Error") || output.startsWith("⚠");

  return (
    <div className="messages flex flex-col bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg h-full relative">
      <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
          Output
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 p-3 overflow-auto font-mono text-sm custom-scrollbar bg-slate-900/30">
        {output ? (
          <pre className={isError ? "text-rose-400" : "text-emerald-400"}>
            {output}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
            Waiting for output...
          </div>
        )}
      </div>

      {isError && (
        <motion.button
          onClick={onFixError}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-3 right-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        >
          <MessageSquareCode size={14} /> Neutralize the Bug
        </motion.button>
      )}
    </div>
  );
};

//  MAIN COMPONENT ====================
const CodeEditorPage = ({ onUpdate = () => {} }) => {
  const { user } = useAuth();
  
  // State Management
  const {
    pages,
    activePage,
    activePageId,
    setActivePageId,
    addPage,
    removePage,
    updatePage,
    renamePage,
  } = usePages();

  const [loading, setLoading] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const statusBarRef = useRef(null);
  const aiRef = useRef(null);

  // Custom Hooks
  const { sidebarWidth, isDragging, setIsDragging, containerRef } = useSidebarResize();
  const { isVimMode, setIsVimMode } = useVimMode(editorRef, statusBarRef);

  //  HANDLERS 
  const handleEditorMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      editor.onDidChangeModelContent(() => {
        const currentCode = editor.getValue();
        updatePage({ code: currentCode });
      });
    },
    [updatePage]
  );

  const handleRunCode = async () => {
    setLoading(true);
    setShowOutputPanel(true);
    updatePage({ output: "Running..." });
    onUpdate({ output: "Running..." });

    let result = "";
    let isError = false;
    let errorOutput = "";

    try {
      const response = await apiService.executeCode(
        activePage.language,
        activePage.code,
        activePage.stdin
      );

      const stdout = response.run?.stdout?.trim();
      const stderr = response.run?.stderr?.trim();
      const compileErr = response.compile?.stderr?.trim();
      
      errorOutput = stderr || compileErr;
      isError = !!errorOutput;
      result = isError ? `Compiler Error:\n${errorOutput}` : stdout || "No output";
    } catch (error) {
      isError = true;
      errorOutput = "⚠ Internal Error running code.";
      result = errorOutput;
    } finally {
      setLoading(false);
      updatePage({ output: result });
      onUpdate({ output: result });

      if (user) {
        const category = isError ? getErrorCategory(errorOutput) : undefined;
        
        apiService.logRun({
          isSuccess: !isError,
          error: isError ? errorOutput.split("\n")[0].trim() : null,
          category,
          language: activePage.language,
          code: activePage.code,
        });
      }
    }
  };

  const handleExplainError = useCallback(() => {
    setIsSidebarOpen(true);
    if (aiRef.current?.ask) {
      const aiPrompt = `Help me fix this error:\nCode:\n${activePage.code}\nError:\n${activePage.output}`;
      aiRef.current.ask(aiPrompt);
    }
  }, [activePage.code, activePage.output]);

  const handleLanguageChange = useCallback(
    (language) => {
      updatePage({ language });
    },
    [updatePage]
  );

  const handleInputChange = useCallback(
    (e) => {
      updatePage({ stdin: e.target.value });
    },
    [updatePage]
  );

  // RENDER 
  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col pt-6 overflow-hidden">
      <main ref={containerRef} className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        {/* Editor Section */}
        <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700/50 relative z-10">
            <EditorToolbar
              language={activePage.language}
              onLanguageChange={handleLanguageChange}
              onRun={handleRunCode}
              isRunning={loading}
              isVimMode={isVimMode}
              onVimModeChange={setIsVimMode}
            />

            <PageTabs
              pages={pages}
              activePageId={activePageId}
              onPageSelect={setActivePageId}
              onPageRename={renamePage}
              onPageClose={removePage}
              onAddPage={addPage}
            />

            <div className="relative flex-1 bg-[#1e1e1e] min-h-0">
              <Editor
                key={activePageId}
                height="100%"
                theme="vs-dark"
                language={activePage.language}
                value={activePage.code}
                onMount={handleEditorMount}
                options={EDITOR_OPTIONS}
              />
            </div>

            <div
              ref={statusBarRef}
              className={`bg-slate-800 text-white text-xs font-bold font-mono px-3 py-1 border-t border-slate-700/50 ${
                isVimMode ? "block" : "hidden"
              }`}
              style={{ minHeight: "26px" }}
            />
          </div>

          {/* Input/Output Panel */}
          <div className="h-48 flex gap-4 shrink-0 overflow-hidden">
            <motion.div
              layout
              className="flex flex-col bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg h-full"
              animate={{ width: showOutputPanel ? "50%" : "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            >
              <InputPanel value={activePage.stdin} onChange={handleInputChange} />
            </motion.div>

            <AnimatePresence>
              {showOutputPanel && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "50%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="h-full"
                >
                  <OutputPanel
                    output={activePage.output}
                    onClose={() => setShowOutputPanel(false)}
                    onFixError={handleExplainError}
                  />
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

        {/* AI Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: sidebarWidth,
                opacity: 1,
                transition: { type: "spring", stiffness: 200, damping: 25 },
              }}
              exit={{
                width: 0,
                opacity: 0,
                transition: { duration: 0.2 },
              }}
              className="flex-shrink-0 h-full rounded-2xl shadow-2xl border border-slate-700/50 bg-slate-900 overflow-hidden"
            >
              <div style={{ width: sidebarWidth }} className="h-full">
                <AISidebar
                  ref={aiRef}
                  aiHandler={apiService.askAI}
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

export default CodeEditorPage;