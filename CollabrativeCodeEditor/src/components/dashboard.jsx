
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Clock,
  AlertTriangle,
  Code,
  Activity,
  LineChart as LineChartIcon,
  Target,
  PieChart as PieChartIcon,
  Repeat,
  CheckCircle,
  XCircle,
  Star,
  Zap,
  TrendingUp,
  BookOpen,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Link } from "react-router-dom";
import ReactECharts from 'echarts-for-react';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

async function getRunLogs() {
  try {

    const response = await fetch(`${BACKEND_URL}/auth/get-run-logs`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
    if (!response.ok) throw new Error("Failed to fetch logs");
    return await response.json();
  } catch (err) {
    console.error("Error fetching user logs:", err);
    return [];
  }
}


const PIE_COLORS = ["#3b82f6", "#facc15", "#ef4444", "#a855f7", "#22c55e"];
const CATEGORY_COLORS = {
  Syntax: "#ef4444",
  Runtime: "#facc15",
  Compiler: "#f97316",
  Logical: "#3b82f6",
  Other: "#6b7280",
};


function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    acc[k] = acc[k] || [];
    acc[k].push(x);
    return acc;
  }, {});
}

function findMostFrequent(arr, keyFn) {
  if (arr.length === 0) return { item: null, count: 0 };
  const freq = {};
  arr.forEach((x) => {
    const key = keyFn(x);
    freq[key] = (freq[key] || 0) + 1;
  });
  const [item, count] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  return { item, count };
}


export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();


  useEffect(() => {
    async function load() {
      if (user) {
        setIsLoading(true);
        const apiData = await getRunLogs();
        setLogs(apiData);
        setIsLoading(false);
      }
    }
    load();
  }, [user]);

  // --- Data Memoization ---
  const errorsOnly = useMemo(() => logs.filter((l) => !l.isSuccess), [logs]);
  const successfulRuns = useMemo(() => logs.filter((l) => l.isSuccess), [logs]);

  const successRate = useMemo(() => {
    if (logs.length === 0) return 0;
    return ((successfulRuns.length / logs.length) * 100).toFixed(0);
  }, [logs.length, successfulRuns.length]);

  const learningCurveData = useMemo(() => {
    const groupedByDate = groupBy(logs, (log) =>
      new Date(log.createdAt).toLocaleDateString()
    );
    return Object.entries(groupedByDate)
      .map(([date, logsOnDate]) => {
        const successCount = logsOnDate.filter((l) => l.isSuccess).length;
        const rate = (successCount / logsOnDate.length) * 100;
        return {
          date: date,
          timestamp: new Date(logsOnDate[0].createdAt).getTime(),
          "Success Rate": parseFloat(rate.toFixed(1)),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-10);
  }, [logs]);

  const errorsByLanguage = useMemo(() => {
    const g = groupBy(errorsOnly, (l) => l.language);
    return Object.entries(g).map(([name, data]) => ({
      name,
      count: data.length,
    }));
  }, [errorsOnly]);

  const errorsByCategory = useMemo(() => {
    const g = groupBy(errorsOnly, (l) => l.category || "Other");
    return Object.entries(g).map(([name, data]) => ({
      name,
      count: data.length,
    }));
  }, [errorsOnly]);

  const recurringProblems = useMemo(() => {
    const groupedByCategory = groupBy(errorsOnly, (l) => l.category);
    return Object.entries(groupedByCategory)
      .map(([category, errors]) => {
        const { item: error, count } = findMostFrequent(errors, (e) => e.error);
        return { category, error, count };
      })
      .filter((d) => d.error) 
      .sort((a, b) => b.count - a.count) 
      .slice(0, 5); 
  }, [errorsOnly]);

  const coderStatus = useMemo(() => {
    const totalRuns = logs.length;
    if (totalRuns === 0) {
      return {
        title: "Welcome!",
        icon: <Sparkles />,
        color: "text-gray-400",
      };
    }

    const rate = (successfulRuns.length / totalRuns) * 100;

    if (totalRuns < 10) {
      return {
        title: "New Coder",
        icon: <BookOpen />,
        color: "text-blue-400",
      };
    }

    if (totalRuns > 100 && rate >= 80) {
      return {
        title: "Master Coder",
        icon: <Star />,
        color: "text-yellow-400",
      };
    }

    if (totalRuns > 50 && rate >= 65) {
      return {
        title: "Consistent Coder",
        icon: <Zap />,
        color: "text-purple-400",
      };
    }

    if (learningCurveData.length > 2) {
      const firstRate = learningCurveData[0]["Success Rate"];
      const lastRate =
        learningCurveData[learningCurveData.length - 1]["Success Rate"];
      if (lastRate > firstRate + 10) {
        return {
          title: "Rising Learner",
          icon: <TrendingUp />,
          color: "text-green-400",
        };
      }
    }

    // 5. Default
    return {
      title: "Active Learner",
      icon: <Code />,
      color: "text-gray-300",
    };
  }, [logs.length, successfulRuns.length, learningCurveData]);

  // --- ECharts Pie Chart Options ---
  const pieChartOptions = useMemo(() => {
    const dataWithColors = errorsByCategory.map(entry => ({
      name: entry.name,
      value: entry.count,
      itemStyle: {
        color: CATEGORY_COLORS[entry.name] || '#6b7280'
      }
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: '#1b2233',
        borderColor: '#333',
        borderWidth: 1,
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: {
          color: '#888'
        }
      },
      series: [
        {
          name: 'Errors by Category',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          data: dataWithColors,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
            color: '#ddd',
            fontSize: 12,
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 15
          }
        }
      ]
    };
  }, [errorsByCategory]);

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex items-center justify-center">
        <h2 className="text-2xl animate-pulse">Loading Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {/* --- Header with Status Badge --- */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold">
          Hello, <span className="text-[#00c2ff]">{user.name}</span>
        </h2>

        <div
          className={`flex items-center gap-2 bg-[#1b2233] px-4 py-2 rounded-lg shadow-md ${coderStatus.color}`}
        >
          {React.cloneElement(coderStatus.icon, { size: 20 })}
          <span className="text-lg font-semibold">{coderStatus.title}</span>
        </div>
      </div>

      {/* --- Performance & Learning Curve Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Performance Overview Card */}
        <div className="bg-[#1b2233] p-6 rounded-xl shadow-md flex flex-col justify-between lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <Target size={20} className="text-[#00c2ff]" />
            Performance Overview
          </h3>

          <div className="text-center my-6 flex-1 flex flex-col items-center justify-center">
            <p className="text-sm text-gray-400 uppercase tracking-wider">
              Overall Success Rate
            </p>
            <h2 className="text-7xl font-bold mt-2 text-green-400">
              {successRate}%
            </h2>
          </div>

          <div className="flex justify-around gap-4 pt-6 border-t border-gray-700">
            <div className="text-center flex items-center gap-3">
              <Activity size={28} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-xs text-gray-400">Total Runs</p>
              </div>
            </div>

            <div className="text-center flex items-center gap-3">
              <AlertTriangle size={28} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold">{errorsOnly.length}</p>
                <p className="text-xs text-gray-400">Total Errors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Curve Card */}
        <div className="bg-[#1b2233] p-4 rounded-xl shadow-md lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
            <LineChartIcon size={20} className="text-[#00c2ff]" />
            Learning Curve (Success Rate per Day)
          </h3>

          {learningCurveData.length > 1 ? (
            <div className="h-[400px] lg:h-full py-4">
              <ResponsiveContainer>
                <LineChart
                  data={learningCurveData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} />
                  <YAxis
                    allowDecimals={false}
                    stroke="#888"
                    fontSize={12}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#F5F5F5",
                      border: "1px solid #DDD",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#333", fontWeight: "bold" }}
                    itemStyle={{ color: "#555" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Success Rate"
                    stroke="#00c2ff"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-gray-400 h-full flex flex-col items-center justify-center gap-4">
              <span>Not enough data for breakdown.</span>
              <Link
                to="/code-editor"
                className="px-4 py-2 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg hover:opacity-90
                           bg-gradient-to-r from-cyan-400 via-emerald-500 to-cyan-400"
              >
                Start Coding
              </Link>
              <span>It wants you to be Active for atleast 2 Days , Ready to Unlock</span>
            </div>
          )}
        </div>
      </div>

      {/* --- Error Breakdowns (Pies) --- */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Errors by Language" icon={<Code />}>
          {errorsByLanguage.length >= 1 ? (
            <ResponsiveContainer>
              <BarChart
                data={errorsByLanguage}
                margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis allowDecimals={false} stroke="#888" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#F5F5F5",
                    border: "1px solid #DDD",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#333", fontWeight: "bold" }}
                  itemStyle={{ color: "#555" }}
                  cursor={{ fill: "rgba(100, 100, 100, 0.2)" }}
                />
                <Bar dataKey="count">
                  {errorsByLanguage.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 h-full flex flex-col items-center justify-center gap-4">
              <span>Not enough data for breakdown.</span>
              <Link
                to="/code-editor"
                className="px-4 py-2 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg hover:opacity-90
                           bg-gradient-to-r from-cyan-400 via-emerald-500 to-cyan-400"
              >
                Start Coding
              </Link>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Errors by Category" icon={<PieChartIcon />}>
          {errorsByCategory.length >= 1 ? (
            <ReactECharts
              option={pieChartOptions}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
          ) : (
            <div className="text-gray-400 h-full flex flex-col items-center justify-center gap-4">
              <span>Not enough data for breakdown.</span>
              <Link
                to="/code-editor"
                className="px-4 py-2 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg hover:opacity-90
                           bg-gradient-to-r from-cyan-400 via-emerald-500 to-cyan-400"
              >
                Start Coding
              </Link>
            </div>
          )}
        </ChartCard>
      </div>

      {/* --- RECURRING PROBLEMS --- */}
      <div className="bg-[#1b2233] p-4 rounded-xl shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
          <Repeat size={20} className="text-[#00c2ff]" />
          Your Top 5 Recurring Problems
        </h3>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {recurringProblems.length === 0 && (
            <div className="text-gray-400">No recurring errors found!</div>
          )}
          {recurringProblems.map((p) => (
            <div
              key={p.category}
              className="p-3 rounded-lg flex justify-between items-start bg-[#0f172a] hover:bg-[#121c33] transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <XCircle
                    size={18}
                    style={{ color: CATEGORY_COLORS[p.category] || '#ef4444' }}
                  />
                  <p className="text-sm font-semibold text-white truncate">
                    {p.error}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Category:{" "}
                  <span
                    className="font-medium"
                    style={{ color: CATEGORY_COLORS[p.category] || '#ef4444' }}
                  >
                    {p.category}
                  </span>{" "}
                  · You've made this mistake {p.count}{" "}
                  {p.count > 1 ? 'times' : 'time'}.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Recent Activity --- */}
      <div className="bg-[#1b2233] p-4 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
          Recent Activity
        </h3>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {logs.length === 0 && (
            <div className="text-gray-400">No recent activity.</div>
          )}

          {logs.slice(0, 15).map((e) => (
            <div
              key={e._id}
              className="p-3 rounded-lg flex justify-between items-start bg-[#0f172a] hover:bg-[#121c33] transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  {e.isSuccess ? (
                    <CheckCircle className="text-green-400" size={18} />
                  ) : (
                    <XCircle className="text-red-400" size={18} />
                  )}
                  <p className="text-sm font-semibold text-white">
                    {e.isSuccess ? "Successful Run" : e.category + " Error"}
                  </p>
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  {new Date(e.createdAt).toLocaleString()} · {e.language}{" "}
                  {!e.isSuccess && `· ${e.category}`}
                </p>

                {!e.isSuccess && (
                  <p className="text-xs text-gray-300 mt-1 truncate">
                    {e.errorMessage}
                  </p>
                )}
              </div>

              <details className="text-xs text-gray-300 w-1/3">
                <summary className="cursor-pointer">View code</summary>
                <pre className="text-xs bg-black/30 p-2 rounded mt-2 overflow-auto">
                  {e.code?.slice(0, 1000)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-[#1b2233] p-4 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
        {React.cloneElement(icon, { size: 20, className: "text-[#00c2ff]" })}
        {title}
      </h3>
      <div className="h-64">{children}</div>
    </div>
  );
}