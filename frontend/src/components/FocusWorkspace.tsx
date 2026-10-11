import { FormEvent, useEffect, useMemo, useState } from "react";

type FocusRecord = {
  id: number;
  start: number;
  end: number;
  duration: number;
  tag: string;
  note: string;
  updatedAt?: number;
  deleted?: boolean;
};

type Todo = {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
};

type FocusView = "today" | "history" | "completed" | "stats";
type NoteMap = Record<string, string>;

const DAILY_GOAL_SECONDS = 4 * 60 * 60;

type StorageKeys = {
  records: string;
  notes: string;
  todos: string;
  active: string;
};

function getUserScope(token: string) {
  if (!token) return "guest";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "guest";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as { sub?: string; username?: string };
    const identity = decoded.sub ?? decoded.username;
    return identity ? encodeURIComponent(identity) : "guest";
  } catch {
    return "guest";
  }
}

function getStorageKeys(token: string): StorageKeys {
  const prefix = `focuslog-v1-${getUserScope(token)}`;
  return {
    records: `${prefix}-records`,
    notes: `${prefix}-notes`,
    todos: `${prefix}-todos`,
    active: `${prefix}-active`,
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDuration(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  if (value < 60) return `${value} 秒`;
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} 小时 ${remainingMinutes} 分` : `${hours} 小时`;
}

function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

function saveAll(keys: StorageKeys, records: FocusRecord[], notes: NoteMap, todos: Todo[]) {
  localStorage.setItem(keys.records, JSON.stringify(records));
  localStorage.setItem(keys.notes, JSON.stringify(notes));
  localStorage.setItem(keys.todos, JSON.stringify(todos));
}

export default function FocusWorkspace({ token }: { token: string }) {
  const storageKeys = useMemo(() => getStorageKeys(token), [token]);
  const [view, setView] = useState<FocusView>("today");
  const [records, setRecords] = useState<FocusRecord[]>(() => readJson(storageKeys.records, []));
  const [notes, setNotes] = useState<NoteMap>(() => readJson(storageKeys.notes, {}));
  const [todos, setTodos] = useState<Todo[]>(() => readJson(storageKeys.todos, []));
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const value = Number(localStorage.getItem(storageKeys.active));
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  const [now, setNow] = useState(Date.now());
  const [dark, setDark] = useState(false);
  const [storageOnline] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activityRange, setActivityRange] = useState<"daily" | "weekly" | "total">("daily");
  const [editing, setEditing] = useState<FocusRecord | null>(null);

  const activeRecords = useMemo(() => records.filter(record => !record.deleted), [records]);
  const today = dateKey(Date.now());
  const todayRecords = useMemo(() => activeRecords.filter(record => dateKey(record.start) === today), [activeRecords, today]);
  const completedTodos = useMemo(() => todos.filter(todo => todo.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)), [todos]);
  const pendingTodos = todos.filter(todo => !todo.done);
  const currentSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const todaySeconds = todayRecords.reduce((total, record) => total + record.duration, 0);
  const todayLongest = todayRecords.length ? Math.max(...todayRecords.map(record => record.duration)) : 0;
  const todayProgress = Math.min(100, (todaySeconds / DAILY_GOAL_SECONDS) * 100);

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    const handleVisibility = () => setNow(Date.now());
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  function persist(nextRecords = records, nextNotes = notes, nextTodos = todos) {
    saveAll(storageKeys, nextRecords, nextNotes, nextTodos);
  }

  function startTimer() {
    const timestamp = Date.now();
    localStorage.setItem(storageKeys.active, String(timestamp));
    setStartedAt(timestamp);
    setNow(timestamp);
  }

  function stopTimer() {
    if (!startedAt) return;
    const endedAt = Date.now();
    const duration = Math.max(0, (endedAt - startedAt) / 1000);
    const nextRecords = duration > 0
      ? [{ id: endedAt, start: startedAt, end: endedAt, duration, tag: "专注", note: "" }, ...records]
      : records;
    setRecords(nextRecords);
    persist(nextRecords);
    localStorage.removeItem(storageKeys.active);
    setStartedAt(null);
    setNow(endedAt);
  }

  function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = String(form.get("todo") ?? "").trim();
    if (!text) return;
    const timestamp = Date.now();
    const nextTodos = [...todos, { id: timestamp, text, done: false, createdAt: timestamp, updatedAt: timestamp }];
    setTodos(nextTodos);
    persist(records, notes, nextTodos);
    event.currentTarget.reset();
  }

  function toggleTodo(id: number, done: boolean) {
    const timestamp = Date.now();
    const nextTodos = todos.map(todo => todo.id === id ? { ...todo, done, updatedAt: timestamp, completedAt: done ? timestamp : null } : todo);
    setTodos(nextTodos);
    persist(records, notes, nextTodos);
  }

  function updateNote(value: string) {
    const nextNotes = { ...notes, [today]: value };
    setNotes(nextNotes);
    persist(records, nextNotes, todos);
  }

  function deleteRecord(record: FocusRecord) {
    if (!window.confirm("删除这个专注时段？它会从统计和导出中移除。")) return;
    const nextRecords = records.map(item => item.id === record.id ? { ...item, deleted: true, updatedAt: Date.now() } : item);
    setRecords(nextRecords);
    persist(nextRecords);
  }

  function saveEditedRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date"));
    const startValue = String(form.get("start"));
    const endValue = String(form.get("end"));
    const start = new Date(`${date}T${startValue}`).getTime();
    const end = new Date(`${date}T${endValue}`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const nextRecords = records.map(record => record.id === editing.id
      ? { ...record, start, end, duration: (end - start) / 1000, note: String(form.get("note") ?? ""), updatedAt: Date.now() }
      : record);
    setRecords(nextRecords);
    persist(nextRecords);
    setEditing(null);
  }

  function exportMarkdown() {
    const grouped: Record<string, FocusRecord[]> = {};
    activeRecords.slice().sort((a, b) => a.start - b.start).forEach(record => {
      const key = dateKey(record.start);
      grouped[key] = [...(grouped[key] ?? []), record];
    });
    let output = "# 专注记录\n\n";
    Object.entries(grouped).reverse().forEach(([date, list]) => {
      output += `## ${date}\n\n`;
      list.forEach(record => {
        output += `- ${formatClock(record.start)}–${formatClock(record.end)}｜${formatDuration(record.duration)}${record.note ? `｜${record.note}` : ""}\n`;
      });
      output += `- 当日合计：${formatDuration(list.reduce((sum, record) => sum + record.duration, 0))}\n\n`;
    });
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `专注记录-${today}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const filteredHistory = activeRecords.filter(record => {
    const age = Date.now() - record.start;
    const matchesFilter = historyFilter === "today"
      ? dateKey(record.start) === today
      : historyFilter === "week"
        ? age <= 7 * 86400000
        : historyFilter === "month"
          ? new Date(record.start).getMonth() === new Date().getMonth() && new Date(record.start).getFullYear() === new Date().getFullYear()
          : true;
    return matchesFilter && `${record.tag}${record.note}`.toLowerCase().includes(search.toLowerCase());
  });

  const activityCells = buildActivity(activeRecords, activityRange);
  const monthTotals = buildMonthTotals(activeRecords);

  return (
    <div className={`focus-workspace ${dark ? "focus-dark" : ""}`}>
      <aside className="focus-sidebar">
        <a className="focus-brand" href="#/">我的博客 <span>/ 专注</span></a>
        <div className="focus-sidebar-label">WORKSPACE</div>
        <nav className="focus-nav">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>◷ <span>今日专注</span></button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>▤ <span>全部记录</span></button>
          <button className={view === "completed" ? "active" : ""} onClick={() => setView("completed")}>✓ <span>已完成清单</span></button>
          <button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}>▥ <span>统计分析</span></button>
        </nav>
        <div className="focus-sidebar-bottom">
          <button onClick={exportMarkdown}>↥ <span>导出 Markdown</span></button>
          <div className="focus-storage"><i /> <span>{storageOnline ? "本地保存" : "存储不可用"}</span></div>
          <button onClick={() => setDark(value => !value)}>☼ <span>{dark ? "浅色模式" : "深色模式"}</span></button>
        </div>
      </aside>

      <main className="focus-main">
        <header className="focus-topbar">
          <div><span className="focus-page-kicker">{view === "today" ? "专注工作台" : view === "history" ? "Archive" : view === "completed" ? "Completed" : "Insights"}</span><h1>{view === "today" ? "今天，专注于重要的事" : view === "history" ? "全部记录" : view === "completed" ? "已完成清单" : "统计分析"}</h1></div>
          <a className="focus-blog-link" href="#/">返回博客 ↗</a>
        </header>

        {view === "today" && <TodayView startedAt={startedAt} currentSeconds={currentSeconds} todaySeconds={todaySeconds} todayProgress={todayProgress} todayRecords={todayRecords} todayLongest={todayLongest} pendingTodos={pendingTodos} note={notes[today] ?? ""} onStart={startTimer} onStop={stopTimer} onAddTodo={addTodo} onToggleTodo={toggleTodo} onNote={updateNote} onHistory={() => setView("history")} />}
        {view === "history" && <HistoryView records={filteredHistory} filter={historyFilter} search={search} range={activityRange} cells={activityCells} onFilter={setHistoryFilter} onSearch={setSearch} onRange={setActivityRange} onEdit={setEditing} onDelete={deleteRecord} />}
        {view === "completed" && <CompletedView todos={completedTodos} onRestore={id => toggleTodo(id, false)} />}
        {view === "stats" && <StatsView records={activeRecords} monthTotals={monthTotals} />}
      </main>

      {editing && <EditRecordModal record={editing} onClose={() => setEditing(null)} onSubmit={saveEditedRecord} />}
    </div>
  );
}

function TodayView(props: { startedAt: number | null; currentSeconds: number; todaySeconds: number; todayProgress: number; todayRecords: FocusRecord[]; todayLongest: number; pendingTodos: Todo[]; note: string; onStart: () => void; onStop: () => void; onAddTodo: (event: FormEvent<HTMLFormElement>) => void; onToggleTodo: (id: number, done: boolean) => void; onNote: (value: string) => void; onHistory: () => void; }) {
  const running = props.startedAt !== null;
  return <div className="focus-view">
    <section className="focus-timer-grid">
      <div className="workspace-panel timer-panel">
        <div className="panel-head"><div><span className="section-kicker">DEEP WORK</span><h2>专注计时</h2></div><span className={`live-state ${running ? "running" : ""}`}><i />{running ? "专注进行中" : "准备开始"}</span></div>
        <div className={`large-timer-ring ${running ? "running" : ""}`}><div><strong>{formatTimer(props.currentSeconds)}</strong><span>自由计时</span></div></div>
        <button className="large-start-button" onClick={running ? props.onStop : props.onStart}>{running ? "结束并保存" : "开始专注"}</button>
      </div>
      <div className="workspace-panel day-summary">
        <span className="section-kicker">TODAY</span><h2>今天的节奏</h2>
        <strong className="summary-number">{formatDuration(props.todaySeconds)}</strong><span className="summary-caption">累计专注</span>
        <div className="summary-progress-head"><span>目标 4 小时</span><span>{Math.round(props.todayProgress)}%</span></div><div className="summary-progress"><span style={{ width: `${props.todayProgress}%` }} /></div>
        <div className="summary-mini"><div><strong>{props.todayRecords.length}</strong><span>完成时段</span></div><div><strong>{props.todayLongest ? formatDuration(props.todayLongest) : "—"}</strong><span>最长时段</span></div></div>
      </div>
    </section>
    <section className="focus-lower-grid">
      <div className="workspace-panel todo-panel"><div className="panel-head"><div><span className="section-kicker">TODAY'S PLAN</span><h2>待办清单</h2></div><span className="panel-count">{props.pendingTodos.length} 项未完成</span></div><form className="todo-form" onSubmit={props.onAddTodo}><input name="todo" maxLength={120} autoComplete="off" placeholder="添加今天要完成的计划……" /><button>添加</button></form><div className="todo-list">{props.pendingTodos.length ? props.pendingTodos.map(todo => <label className="todo-item" key={todo.id}><input type="checkbox" checked={todo.done} onChange={event => props.onToggleTodo(todo.id, event.target.checked)} /><span>{todo.text}</span></label>) : <p className="empty-state">今日计划已全部完成 ✦</p>}</div></div>
      <div className="workspace-panel note-panel"><div className="panel-head"><div><span className="section-kicker">DAILY NOTE</span><h2>今日备注</h2></div><span className="panel-count">自动保存</span></div><textarea value={props.note} onChange={event => props.onNote(event.target.value)} placeholder="记录今天的状态、灵感或复盘……" /><div className="note-help">内容会保存在当前浏览器中</div></div>
    </section>
    <section className="workspace-panel timeline-panel"><div className="panel-head"><div><span className="section-kicker">TIMELINE</span><h2>今日时间线</h2></div><button className="text-button" onClick={props.onHistory}>查看全部 →</button></div>{props.todayRecords.length ? props.todayRecords.slice(0, 6).map(record => <RecordRow key={record.id} record={record} />) : <p className="empty-state">今天还没有完成的时段，点击上方开始专注。</p>}</section>
  </div>;
}

function RecordRow({ record, actions }: { record: FocusRecord; actions?: React.ReactNode }) {
  return <div className="focus-record-row"><span className="record-dot" /><div className="record-info"><strong>{record.tag || "专注"}</strong><span>{formatClock(record.start)} – {formatClock(record.end)}{record.note ? ` · ${record.note}` : ""}</span></div><b>{formatDuration(record.duration)}</b>{actions}</div>;
}

function HistoryView(props: { records: FocusRecord[]; filter: string; search: string; range: "daily" | "weekly" | "total"; cells: { label: string; seconds: number }[]; onFilter: (value: string) => void; onSearch: (value: string) => void; onRange: (value: "daily" | "weekly" | "total") => void; onEdit: (record: FocusRecord) => void; onDelete: (record: FocusRecord) => void; }) {
  return <div className="focus-view"><div className="focus-view-intro"><div><span className="section-kicker">ARCHIVE</span><h2>每一个完成的时段，都值得被看见。</h2></div><button className="primary-small" onClick={() => exportSimpleMarkdown(props.records)}>导出 Markdown</button></div><section className="workspace-panel activity-panel"><div className="panel-head"><div><span className="section-kicker">ACTIVITY</span><h2>专注活动</h2></div><div className="range-tabs">{(["daily", "weekly", "total"] as const).map(range => <button className={props.range === range ? "active" : ""} key={range} onClick={() => props.onRange(range)}>{range === "daily" ? "每天" : range === "weekly" ? "每周" : "累计总量"}</button>)}</div></div><div className="activity-chart">{props.cells.map(cell => <i key={cell.label} className={activityLevel(cell.seconds)} title={`${cell.label} · ${formatDuration(cell.seconds)}`} />)}</div><div className="activity-summary">{props.cells.filter(cell => cell.seconds > 0).length} 个活跃时段 · 累计 {formatDuration(props.cells.reduce((sum, cell) => sum + cell.seconds, 0))}</div></section><div className="history-controls"><div className="filter-tabs">{["all", "today", "week", "month"].map(filter => <button className={props.filter === filter ? "active" : ""} key={filter} onClick={() => props.onFilter(filter)}>{filter === "all" ? "全部" : filter === "today" ? "今天" : filter === "week" ? "近 7 天" : "本月"}</button>)}</div><input type="search" value={props.search} onChange={event => props.onSearch(event.target.value)} placeholder="搜索标签或备注" /></div><section className="workspace-panel history-panel">{props.records.length ? props.records.map(record => <RecordRow key={record.id} record={record} actions={<span className="record-actions"><button onClick={() => props.onEdit(record)}>修改</button><button onClick={() => props.onDelete(record)}>删除</button></span>} />) : <p className="empty-state">还没有符合条件的记录。</p>}</section></div>;
}

function CompletedView({ todos, onRestore }: { todos: Todo[]; onRestore: (id: number) => void }) {
  const groups = todos.reduce<Record<string, Todo[]>>((result, todo) => { const key = dateKey(todo.completedAt ?? todo.updatedAt); result[key] = [...(result[key] ?? []), todo]; return result; }, {});
  return <div className="focus-view"><div className="focus-view-intro"><div><span className="section-kicker">COMPLETED</span><h2>完成的计划，留下每天前进的痕迹。</h2></div><strong className="completed-total">{todos.length} 项完成</strong></div>{Object.keys(groups).length ? Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => <section className="completed-group" key={date}><div className="completed-date"><h3>{date}</h3><span>{items.length} 项</span></div>{items.map(todo => <div className="completed-item" key={todo.id}><span className="completed-check">✓</span><strong>{todo.text}</strong><span>{todo.completedAt ? formatClock(todo.completedAt) : ""}</span><button onClick={() => onRestore(todo.id)}>恢复</button></div>)}</section>) : <p className="empty-state">还没有已完成的计划。</p>}</div>;
}

function StatsView({ records, monthTotals }: { records: FocusRecord[]; monthTotals: { label: string; seconds: number }[] }) {
  const todaySeconds = records.filter(record => dateKey(record.start) === dateKey(Date.now())).reduce((sum, record) => sum + record.duration, 0);
  const weekSeconds = records.filter(record => Date.now() - record.start <= 7 * 86400000).reduce((sum, record) => sum + record.duration, 0);
  const monthSeconds = records.filter(record => new Date(record.start).getMonth() === new Date().getMonth() && new Date(record.start).getFullYear() === new Date().getFullYear()).reduce((sum, record) => sum + record.duration, 0);
  return <div className="focus-view"><div className="focus-view-intro"><div><span className="section-kicker">INSIGHTS</span><h2>从日、周、月三个尺度，看见你的节奏。</h2></div></div><div className="stats-grid"><StatCard label="今日" value={formatDuration(todaySeconds)} /><StatCard label="本周" value={formatDuration(weekSeconds)} /><StatCard label="本月" value={formatDuration(monthSeconds)} /><StatCard label="累计专注" value={formatDuration(records.reduce((sum, record) => sum + record.duration, 0))} accent /></div><section className="workspace-panel monthly-panel"><div className="panel-head"><div><span className="section-kicker">MONTHLY RHYTHM</span><h2>月度时长</h2></div></div><div className="month-bars">{monthTotals.map(month => <div className="month-column" key={month.label}><span style={{ height: `${Math.max(4, Math.min(100, month.seconds / 21600 * 100))}%` }} /><small>{month.label}</small></div>)}</div></section></div>;
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`stat-card ${accent ? "accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>专注时段记录</small></div>; }

function EditRecordModal({ record, onClose, onSubmit }: { record: FocusRecord; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const date = dateKey(record.start);
  const start = new Date(record.start).toTimeString().slice(0, 5);
  const end = new Date(record.end).toTimeString().slice(0, 5);
  return <div className="focus-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><form className="focus-modal" onSubmit={onSubmit}><div className="panel-head"><div><span className="section-kicker">EDIT SESSION</span><h2>修改时间段</h2></div><button type="button" onClick={onClose}>×</button></div><label>日期<input name="date" type="date" defaultValue={date} required /></label><div className="modal-fields"><label>开始<input name="start" type="time" defaultValue={start} required /></label><label>结束<input name="end" type="time" defaultValue={end} required /></label></div><label>备注<input name="note" defaultValue={record.note} maxLength={120} /></label><div className="modal-actions"><button type="button" onClick={onClose}>取消</button><button className="primary-small">保存</button></div></form></div>;
}

function activityLevel(seconds: number) { return seconds >= 14400 ? "level-4" : seconds >= 7200 ? "level-3" : seconds >= 3600 ? "level-2" : seconds > 0 ? "level-1" : "level-0"; }

function buildActivity(records: FocusRecord[], range: "daily" | "weekly" | "total") {
  const cells: { label: string; seconds: number }[] = [];
  const count = range === "weekly" ? 52 : range === "daily" ? 84 : 365;
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = dateKey(date.getTime());
    const seconds = records.filter(record => dateKey(record.start) === key).reduce((sum, record) => sum + record.duration, 0);
    cells.push({ label: key, seconds });
  }
  return cells;
}

function buildMonthTotals(records: FocusRecord[]) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    return { label: `${month + 1}月`, seconds: records.filter(record => { const item = new Date(record.start); return item.getMonth() === month && item.getFullYear() === year; }).reduce((sum, record) => sum + record.duration, 0) };
  });
}

function exportSimpleMarkdown(records: FocusRecord[]) {
  const output = records.map(record => `- ${dateKey(record.start)} ${formatClock(record.start)}–${formatClock(record.end)}｜${formatDuration(record.duration)}`).join("\n");
  const blob = new Blob([`# 专注记录\n\n${output}\n`], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `专注记录-${dateKey(Date.now())}.md`;
  link.click();
  URL.revokeObjectURL(link.href);
}
