import { useEffect, useMemo, useState } from "react";

type FocusSession = {
  id: number;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
};

const SESSION_KEY = "personal-blog-focus-sessions-v1";
const ACTIVE_KEY = "personal-blog-focus-active-v1";
const DAILY_GOAL_MINUTES = 240;

function readSessions(): FocusSession[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "[]");
    return Array.isArray(value) ? (value as FocusSession[]) : [];
  } catch {
    return [];
  }
}

function todayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

function formatMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

export default function FocusTimer() {
  const [sessions, setSessions] = useState<FocusSession[]>(readSessions);
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const value = Number(localStorage.getItem(ACTIVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  const [now, setNow] = useState(() => Date.now());

  const isRunning = startedAt !== null;
  const currentSeconds = isRunning ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const todaySessions = useMemo(
    () => sessions.filter(session => todayKey(session.startedAt) === todayKey(Date.now())),
    [sessions],
  );
  const todaySeconds = todaySessions.reduce((total, session) => total + session.durationSeconds, 0);
  const progress = Math.min(100, (todaySeconds / 60 / DAILY_GOAL_MINUTES) * 100);

  function start() {
    const timestamp = Date.now();
    localStorage.setItem(ACTIVE_KEY, String(timestamp));
    setStartedAt(timestamp);
    setNow(timestamp);
  }

  function stop() {
    if (startedAt === null) return;
    const endedAt = Date.now();
    const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
    if (durationSeconds > 0) {
      const nextSession: FocusSession = {
        id: endedAt,
        startedAt,
        endedAt,
        durationSeconds,
      };
      const nextSessions = [nextSession, ...sessions];
      setSessions(nextSessions);
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSessions));
    }
    localStorage.removeItem(ACTIVE_KEY);
    setStartedAt(null);
    setNow(endedAt);
  }

  return (
    <aside className="focus-card" aria-label="专注度计时器">
      <div className="focus-card-header">
        <div>
          <span className="focus-kicker">FOCUS MODE</span>
          <h2>专注一下</h2>
        </div>
        <span className={`focus-status ${isRunning ? "is-running" : ""}`}>
          <i /> {isRunning ? "进行中" : "准备开始"}
        </span>
      </div>

      <div className={`focus-ring ${isRunning ? "is-running" : ""}`}>
        <div className="focus-ring-inner">
          <strong>{formatTime(currentSeconds)}</strong>
          <span>自由计时</span>
        </div>
      </div>

      <button className="focus-start-button" onClick={isRunning ? stop : start}>
        {isRunning ? "结束并保存" : "开始专注"}
      </button>

      <div className="focus-summary">
        <div><strong>{formatMinutes(todaySeconds)}</strong><span>今日累计</span></div>
        <div><strong>{todaySessions.length}</strong><span>完成时段</span></div>
      </div>

      <div className="focus-progress-label">
        <span>今日目标 4 小时</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="focus-progress"><span style={{ width: `${progress}%` }} /></div>
      <p className="focus-tip">计时记录只保存在当前浏览器中，刷新页面不会丢失。</p>
    </aside>
  );
}
