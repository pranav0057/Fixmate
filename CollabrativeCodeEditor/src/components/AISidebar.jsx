import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Send, Loader2, MessageSquare, Bot, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const AISidebar = forwardRef(function AISidebar(
  { maxHistory = 50, aiHandler = null, placeholder = "Ask...", className = "", onClose },
  ref
) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([]);
  const responseEndRef = useRef(null);

  const clampHistory = useCallback(
    (items) => items.slice(0, Math.max(0, Math.min(500, maxHistory))),
    [maxHistory]
  );

  async function askAI(text) {
    if (!text) return null;
    setLoading(true);
    try {
      const handler =
        typeof aiHandler === "function" ? aiHandler : async () => ({ answer: "Disconnected" });
      const result = await handler(text);
      const answer = result?.answer || "";
      const item = { id: Date.now(), question: text, answer };
      setResponse(answer);
      setHistory((h) => clampHistory([item, ...h]));
      return item;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  useImperativeHandle(ref, () => ({
    explainError: (err) => {
      const ans = `Error:\n\n\`\`\`\n${err}\n\`\`\``;
      const item = { id: Date.now(), question: "Error", answer: ans };
      setResponse(ans);
      setHistory((h) => clampHistory([item, ...h]));
    },
    ask: askAI,
    clearHistory: () => {
      setHistory([]);
      setResponse(null);
    },
  }));

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Debug Buddy</h3>
            <p className="text-[10px] text-green-400 font-medium">Online</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
        <div className="space-y-4">
          {response && (
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                AI Analysis
              </h4>
              <button onClick={() => setResponse(null)} className="text-[10px] text-slate-500 hover:underline">
                Clear
              </button>
            </div>
          )}

          <div
            className={`min-h-[120px] rounded-2xl border transition-all ${
              response
                ? "bg-slate-800/50 border-slate-700 p-5"
                : "border-slate-800 border-dashed flex items-center justify-center"
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 size={24} className="animate-spin text-cyan-500" />
                <span className="text-xs">Processing</span>
              </div>
            ) : response ? (
              <div className="text-sm text-slate-300 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => <h1 className="text-lg font-bold text-white mb-3" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-base font-bold text-cyan-400 mb-2" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-sm font-bold text-cyan-300 mb-2" {...props} />,
                    p: ({ ...props }) => <p className="mb-3" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 pl-2" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 pl-2" {...props} />,
                    a: ({ ...props }) => <a className="text-cyan-400 hover:underline" {...props} />,
                    code: ({ inline, children, ...props }) =>
                      inline ? (
                        <code className="bg-slate-700/50 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-600/50">
                          {children}
                        </code>
                      ) : (
                        <div className="my-3 bg-[#0d1117] rounded-lg border border-slate-800 overflow-hidden">
                          <div className="overflow-x-auto p-3">
                            <code className="block text-xs font-mono text-green-400 whitespace-pre" {...props}>
                              {children}
                            </code>
                          </div>
                        </div>
                      ),
                  }}
                >
                  {response}
                </ReactMarkdown>
                <div ref={responseEndRef} />
              </div>
            ) : (
              <div className="text-center px-6 py-8 text-slate-500 text-sm">Ask your question</div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-slate-800 mt-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={10} /> Recent
            </h4>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setResponse(item.answer)}
                  className="cursor-pointer group p-3 rounded-xl bg-slate-800/20 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 transition-all"
                >
                  <p className="text-xs font-semibold text-slate-300 mb-1 line-clamp-1">{item.question}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-none p-4 border-t border-slate-800 bg-slate-900">
        <div className="relative bg-slate-800 rounded-2xl p-1 border border-slate-700 focus-within:border-cyan-500/50 transition-all">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), askAI(prompt), setPrompt(""))
            }
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-white p-3 pr-10 max-h-32 min-h-[44px] resize-none outline-none"
            rows={1}
          />
          <button
            onClick={() => {
              askAI(prompt);
              setPrompt("");
            }}
            disabled={!prompt.trim() || loading}
            className="absolute right-2 bottom-2 p-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 disabled:opacity-0 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AISidebar;