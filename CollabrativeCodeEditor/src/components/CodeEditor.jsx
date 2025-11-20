
import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

const CodeEditor = ({ page, onUpdate }) => {
  const { language, code, stdin, output } = page;
  const [loading, setLoading] = useState(false);

  
  const runCode = async () => {
    setLoading(true);
    onUpdate({ output: "Running..." });

    try {
      const res = await axios.post("https://emkc.org/api/v2/piston/execute", {
        language: language,
        version: "*",
        files: [{ name: "main", content: code }],
        stdin: stdin,
      });

      const result = res.data.run?.output || "No output";
      onUpdate({ output: result });
    } catch {
      const errorMsg = "Error running code";
      onUpdate({ output: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val) => {
    onUpdate({ code: val || "" });
  };

  const handleLangChange = (e) => {
    onUpdate({ language: e.target.value });
  };

  const handleInputChange = (e) => {
    onUpdate({ stdin: e.target.value });
  };

  const isError = output?.toLowerCase().includes("error") || output?.toLowerCase().includes("exception");

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-2 rounded-lg border border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <select
          value={language}
          onChange={handleLangChange}
          className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded-md text-sm focus:ring-2 focus:ring-blue-500 w-28"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="java">Java</option>
        </select>

        <button
          onClick={runCode}
          disabled={loading}
          className="flex items-center justify-center bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-sm text-white font-medium disabled:opacity-50 w-20 cursor-pointer transition-colors"
        >
          {loading ? (
            "⏳"
          ) : (
            <span className="flex items-center space-x-1">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 3v18l15-9L5 3z" />
              </svg>
              <span>Run</span>
            </span>
          )}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden">
        <Editor
          theme="vs-dark"
          height="100%" 
          language={language}
          value={code}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Input */}
      <div className="mt-3 bg-gray-800 border border-gray-700 p-3 rounded-md">
        <h3 className="font-semibold text-blue-400 mb-2">Input</h3>
        <textarea
          value={stdin}
          onChange={handleInputChange}
          placeholder="Enter input values here..."
          className="w-full h-20 p-2 rounded-md bg-gray-900 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Output */}
      {output && output.trim() !== "" && (
        <div
          className={`mt-3 p-3 rounded-md border ${output.toLowerCase().includes("error") ||
              output.toLowerCase().includes("exception")
              ? "bg-red-900 border-red-700"
              : "bg-gray-800 border-gray-700"
            }`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3
              className={`font-semibold ${output.toLowerCase().includes("error") ||
                  output.toLowerCase().includes("exception")
                  ? "text-red-300"
                  : "text-blue-400"
                }`}
            >
              Output:
            </h3>

            {/*  Remove Button */}
            <button
              onClick={() => onUpdate({ output: "" })}
              className="text-red-400 hover:text-red-300 text-lg font-bold"
              title="Remove output"
            >
              ✕
            </button>
          </div>

          <pre className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;