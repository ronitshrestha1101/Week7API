import { useState, useEffect } from "react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Task Ledger" },
    { name: "description", content: "REST API Client Dashboard" },
  ];
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  response: any;
}

export default function Home() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [loading, setLoading] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const [targetIdInput, setTargetIdInput] = useState("");
  const [inspectedTaskResult, setInspectedTaskResult] = useState<any | null>(null);

  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const addLog = (method: string, url: string, status: number, response: any) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      method,
      url,
      status,
      response,
    };
    setLogs((prev) => [entry, ...prev]);
    setSelectedLog(entry);
  };

  const fetchTasks = async (filterParam = filter) => {
    setLoading(true);
    let url = `/api/tasks?_t=${Date.now()}`;
    if (filterParam === "completed") url += "&completed=true";
    if (filterParam === "pending") url += "&completed=false";

    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      addLog("GET", url, res.status, data);
      if (res.ok && Array.isArray(data)) {
        setTasks(data);
        setDbConnected(true);
      } else {
        setDbConnected(false);
      }
    } catch (err: any) {
      addLog("GET", url, 500, { error: err.message });
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks("all");
  }, []);

  const handleFilterChange = (newFilter: "all" | "completed" | "pending") => {
    setFilter(newFilter);
    fetchTasks(newFilter);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Title is required!");
      return;
    }

    const payload = {
      title: newTitle.trim(),
      description: newDesc.trim(),
      dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,
    };

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      addLog("POST", "/api/tasks", res.status, data);

      if (res.status === 201 && data && data.id) {
        setNewTitle("");
        setNewDesc("");
        setNewDueDate("");
        setFilter("all");
        setTasks((prev) => [data, ...prev.filter((t) => t.id !== data.id)]);
        fetchTasks("all");
      } else {
        alert(data.error || "Failed to create task");
      }
    } catch (err: any) {
      addLog("POST", "/api/tasks", 500, { error: err.message });
      alert("Error: " + err.message);
    }
  };

  const handleToggleComplete = async (task: TaskItem) => {
    const nextCompleted = !task.isCompleted;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isCompleted: nextCompleted } : t))
    );

    const url = `/api/tasks/${task.id}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      const data = await res.json();
      addLog("PATCH", url, res.status, data);
      if (res.ok) {
        fetchTasks();
      }
    } catch (err: any) {
      addLog("PATCH", url, 500, { error: err.message });
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingTask?.id === id) setEditingTask(null);
    if (inspectedTaskResult?.data?.id === id) setInspectedTaskResult(null);

    const url = `/api/tasks/${id}`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      addLog("DELETE", url, res.status, data);
      if (res.ok) {
        fetchTasks();
      } else {
        alert(data.error || "Delete failed");
        fetchTasks();
      }
    } catch (err: any) {
      addLog("DELETE", url, 500, { error: err.message });
      fetchTasks();
    }
  };

  const handleInspectTask = async (id: string) => {
    setTargetIdInput(id);
    const url = `/api/tasks/${id}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      addLog("GET", url, res.status, data);
      setInspectedTaskResult({ status: res.status, data });
    } catch (err: any) {
      addLog("GET", url, 500, { error: err.message });
      setInspectedTaskResult({ status: 500, data: { error: err.message } });
    }
  };

  const handleManualInspectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdInput.trim()) return;
    handleInspectTask(targetIdInput.trim());
  };

  const handleUpdateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const url = `/api/tasks/${editingTask.id}`;
    const updatePayload = {
      title: editingTask.title,
      description: editingTask.description,
      isCompleted: editingTask.isCompleted,
      dueDate: editingTask.dueDate || null,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === editingTask.id ? { ...t, ...updatePayload } : t))
    );

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const data = await res.json();
      addLog("PUT", url, res.status, data);
      if (res.ok) {
        setEditingTask(null);
        fetchTasks();
      } else {
        alert(data.error || "Update failed");
        fetchTasks();
      }
    } catch (err: any) {
      addLog("PUT", url, 500, { error: err.message });
      fetchTasks();
    }
  };

  return (
    <div className="bg-[#021814] text-zinc-200 min-h-screen pb-16 font-serif">
      <header className="border-b border-emerald-900/40 py-6 px-8 max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400">Task Ledger</h1>
          <p className="text-emerald-600/70 text-xs mt-1">REST API Client & Database Registry</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-emerald-500 mt-2 sm:mt-0">
          <span>
            Database:{" "}
            <span className={dbConnected === true ? "text-emerald-400 font-bold" : "text-rose-455 font-bold"}>
              {dbConnected === true ? "ONLINE" : dbConnected === false ? "OFFLINE" : "CHECKING..."}
            </span>
          </span>
          <span>|</span>
          <button
            type="button"
            onClick={() => fetchTasks(filter)}
            className="text-emerald-450 hover:text-emerald-305 underline"
          >
            Sync
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex flex-col gap-8">
          <div className="border border-emerald-900/40 bg-[#03251e]/30 p-6">
            <h2 className="text-md font-bold text-emerald-400 border-b border-emerald-900/40 pb-2 mb-4">
              POST /api/tasks (New Task)
            </h2>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
              <div>
                <label htmlFor="title" className="block text-xs font-semibold text-emerald-500 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  maxLength={100}
                  required
                  placeholder="Task title..."
                  className="bg-[#01100d] border border-emerald-900/40 focus:border-emerald-600 rounded-none px-3 py-1.5 text-xs text-zinc-100 placeholder-emerald-900 transition-all w-full outline-none"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-semibold text-emerald-505 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  placeholder="Task details..."
                  rows={3}
                  className="bg-[#01100d] border border-emerald-900/40 focus:border-emerald-600 rounded-none px-3 py-1.5 text-xs text-zinc-100 placeholder-emerald-900 transition-all w-full outline-none resize-none font-sans"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-xs font-semibold text-emerald-505 mb-1">
                  Due Date
                </label>
                <input
                  id="dueDate"
                  type="datetime-local"
                  className="bg-[#01100d] border border-emerald-900/40 focus:border-emerald-600 rounded-none px-3 py-1.5 text-xs text-zinc-200 transition-all w-full outline-none"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#03251e]/50 border border-emerald-800/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200 font-bold py-2 px-4 transition-all text-xs tracking-wider uppercase"
              >
                Create Task
              </button>
            </form>
          </div>

          <div className="border border-emerald-900/40 bg-[#03251e]/30 p-6">
            <h2 className="text-md font-bold text-emerald-400 border-b border-emerald-900/40 pb-2 mb-4">
              GET /api/tasks/:id (Inspect)
            </h2>
            <form onSubmit={handleManualInspectSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="targetId" className="block text-xs font-semibold text-emerald-500 mb-1">
                  Task ID
                </label>
                <input
                  id="targetId"
                  type="text"
                  placeholder="e.g. 6a7a8c..."
                  className="bg-[#01100d] border border-emerald-900/40 focus:border-emerald-600 rounded-none px-3 py-1.5 text-xs text-zinc-100 placeholder-emerald-900 transition-all w-full outline-none font-mono"
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#03251e]/50 border border-emerald-800/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-205 font-bold py-2 px-4 transition-all text-xs tracking-wider uppercase"
              >
                Inspect ID
              </button>
            </form>

            {inspectedTaskResult && (
              <div className="mt-4 border border-emerald-900/40 bg-[#01100d]">
                <div className="bg-[#021814] border-b border-emerald-900/40 px-3 py-1.5 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-600">JSON Payload</span>
                  <span className={inspectedTaskResult.status === 200 ? "text-emerald-400" : "text-rose-455"}>
                    {inspectedTaskResult.status}
                  </span>
                </div>
                <pre className="p-3 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(inspectedTaskResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col gap-8">
          <div className="border border-emerald-900/40 bg-[#03251e]/30 p-6">
            <div className="border-b border-emerald-900/40 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-bold text-emerald-400">GET /api/tasks (Collection)</h2>
              <div className="flex gap-2">
                {(["all", "completed", "pending"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleFilterChange(opt)}
                    className={`capitalize text-xs font-semibold px-3 py-1 border ${filter === opt ? "bg-emerald-950 border-emerald-700 text-emerald-400" : "bg-[#01100d] border-emerald-900/45 text-emerald-600 hover:text-emerald-300"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {loading && tasks.length === 0 ? (
              <p className="text-xs text-emerald-605 py-6">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-emerald-605 py-6">No tasks present.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-emerald-900/40 text-emerald-500 font-bold uppercase tracking-wider">
                      <th className="pb-2 w-16 text-center">Done</th>
                      <th className="pb-2 pl-2">Task Details</th>
                      <th className="pb-2 hidden sm:table-cell">Resource ID</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/40">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-emerald-900/10">
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            checked={task.isCompleted}
                            onChange={() => handleToggleComplete(task)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-3 pl-2">
                          <div className={`font-semibold ${task.isCompleted ? "text-emerald-800 line-through" : "text-zinc-200"}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[11px] text-emerald-605/70 mt-0.5">{task.description}</div>
                          )}
                          {task.dueDate && (
                            <div className="text-[10px] text-emerald-600/85 mt-1">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 font-mono text-[10px] text-emerald-600 hidden sm:table-cell">
                          <code>{task.id}</code>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInspectTask(task.id)}
                              className="text-[10px] hover:text-emerald-305 border border-emerald-900/40 px-2 py-1 bg-[#01100d] text-emerald-450"
                            >
                              GET
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTask(task)}
                              className="text-[10px] hover:text-purple-305 border border-emerald-900/40 px-2 py-1 bg-[#01100d] text-emerald-450"
                            >
                              PUT
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-[10px] hover:text-rose-350 border border-emerald-900/40 px-2 py-1 bg-[#01100d] text-emerald-450"
                            >
                              DEL
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {editingTask && (
            <div className="border border-purple-900/40 bg-[#03251e]/30 p-6">
              <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2 mb-4">
                <h2 className="text-md font-bold text-purple-400">
                  PUT /api/tasks/{editingTask.id}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="text-xs text-emerald-550 hover:text-emerald-300"
                >
                  Close
                </button>
              </div>
              <form onSubmit={handleUpdateTaskSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="edit-title" className="block text-xs font-semibold text-emerald-500 mb-1">
                    Title
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    required
                    className="bg-[#01100d] border border-emerald-900/40 focus:border-purple-655 rounded-none px-3 py-1.5 text-xs text-zinc-105 w-full outline-none"
                    value={editingTask.title}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-xs font-semibold text-emerald-505 mb-1">
                    Description
                  </label>
                  <input
                    id="edit-description"
                    type="text"
                    className="bg-[#01100d] border border-emerald-900/40 focus:border-purple-655 rounded-none px-3 py-1.5 text-xs text-zinc-105 w-full outline-none"
                    value={editingTask.description || ""}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, description: e.target.value })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-completed"
                    type="checkbox"
                    checked={editingTask.isCompleted}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        isCompleted: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="edit-completed" className="text-xs text-emerald-400 font-semibold select-none">
                    Is Completed
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#03251e]/50 border border-emerald-805/40 hover:bg-purple-950/30 hover:text-purple-400 font-bold py-2 px-4 transition-all text-xs tracking-wider uppercase"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="bg-[#01100d] border border-emerald-900/40 text-emerald-400 font-bold py-2 px-4 transition-all text-xs tracking-wider uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-8 mt-4">
        <div className="border border-emerald-900/40 bg-[#03251e]/30 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-emerald-900/40 pb-3 mb-4 gap-3">
            <h2 className="text-md font-bold text-emerald-400">HTTP Activity Log</h2>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  setSelectedLog(null);
                }}
                className="text-[10px] font-semibold text-rose-455 hover:text-rose-400 underline"
              >
                Clear History
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <p className="text-emerald-600/70 text-xs">No HTTP logs.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-emerald-900/40 text-emerald-500 font-bold uppercase">
                      <th className="pb-2 w-16">Time</th>
                      <th className="pb-2 w-16">Method</th>
                      <th className="pb-2">URL</th>
                      <th className="pb-2 text-center w-16">Status</th>
                      <th className="pb-2 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-955/40">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-emerald-900/10">
                        <td className="py-2 text-emerald-605/70">{log.timestamp}</td>
                        <td className="py-2">
                          <span className={`font-mono font-bold text-[10px] ${log.method === "GET" ? "text-blue-400" : log.method === "POST" ? "text-emerald-400" : log.method === "DELETE" ? "text-rose-455" : "text-purple-400"}`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-zinc-350 truncate max-w-[200px]">{log.url}</td>
                        <td className="py-2 text-center font-mono">
                          <span className={log.status >= 200 && log.status < 300 ? "text-emerald-450" : "text-rose-455"}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="bg-[#01100d] border border-emerald-900/40 hover:text-emerald-300 text-[10px] px-2 py-0.5 text-emerald-450"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <div className="bg-[#01100d] border border-emerald-900/40 flex-1 flex flex-col">
                  <div className="bg-[#021814] border-b border-emerald-900/40 px-3 py-2 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-500 font-bold">Payload Viewer</span>
                    {selectedLog && (
                      <span className="text-emerald-600 font-mono">
                        {selectedLog.method} {selectedLog.url} ({selectedLog.status})
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1 overflow-auto max-h-64">
                    {selectedLog ? (
                      <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                        {JSON.stringify(selectedLog.response, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-[10px] text-emerald-650/70 italic py-6">
                        Select a row to inspect.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
