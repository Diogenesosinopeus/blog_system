import { FormEvent, useEffect, useRef, useState } from "react";
import { createBlog, deleteBlog, getBlog, getBlogs, login, register, updateBlog } from "./api";
import type { Blog, BlogInput, RegisterInput } from "./types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type View = { name: "home" } | { name: "detail"; id: number } | { name: "editor"; id?: number } | { name: "login" } | { name: "register" };

const emptyInput: BlogInput = { title: "", content: "" };

function readView(): View {
  const hash = window.location.hash;
  if (hash === "#login") return { name: "login" };
  if (hash === "#register") return { name: "register" };
  if (hash === "#new") return { name: "editor" };
  const detail = hash.match(/^#blog\/(\d+)$/);
  if (detail) return { name: "detail", id: Number(detail[1]) };
  const edit = hash.match(/^#edit\/(\d+)$/);
  if (edit) return { name: "editor", id: Number(edit[1]) };
  return { name: "home" };
}

export default function App() {
  const [view, setView] = useState<View>(readView);
  const [token, setToken] = useState(() => localStorage.getItem("blog_token") ?? "");

  useEffect(() => {
    const onHashChange = () => setView(readView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(hash: string) {
    window.location.hash = hash;
  }

  function saveToken(value: string) {
    setToken(value);
    localStorage.setItem("blog_token", value);
  }

  function logout() {
    setToken("");
    localStorage.removeItem("blog_token");
    navigate("#/");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#/">我的博客</a>
        <nav>
          <a href="#/">首页</a>
          {token ? (
            <>
              <a href="#new">写文章</a>
              <button className="link-button" onClick={logout}>退出</button>
            </>
          ) : <a href="#login">登录</a>}
        </nav>
      </header>

      <main>
        {view.name === "home" && <Home onOpen={id => navigate(`#blog/${id}`)} />}
        {view.name === "detail" && <Detail id={view.id} token={token} onEdit={id => navigate(`#edit/${id}`)} />}
        {view.name === "login" && <Login onLogin={value => { saveToken(value); navigate("#/"); }} />}
        {view.name === "register" && <Register onRegistered={() => navigate("#login")} />}
        {view.name === "editor" && <Editor id={view.id} token={token} onSaved={id => navigate(`#blog/${id}`)} />}
      </main>
    </div>
  );
}

function Home({ onOpen }: { onOpen: (id: number) => void }) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getBlogs().then(setBlogs).catch(errorValue => setError(errorValue.message));
  }, []);

  return (
    <section className="page narrow">
      <p className="eyebrow">PERSONAL NOTES</p>
      <h1>记录想法，分享生活。</h1>
      <p className="intro">这是一个由我维护的个人博客。</p>
      {error && <p className="error">{error}</p>}
      <div className="post-list">
        {blogs.length === 0 && !error && <p className="muted">还没有文章。</p>}
        {blogs.map(blog => (
          <article className="post-card" key={blog.id} onClick={() => onOpen(blog.id)}>
            <time>{formatDate(blog.created_at)}</time>
            <h2>{blog.title}</h2>
            <p>{blog.content.slice(0, 150)}{blog.content.length > 150 ? "…" : ""}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Detail({ id, token, onEdit }: { id: number; token: string; onEdit: (id: number) => void }) {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBlog(id).then(setBlog).catch(errorValue => setError(errorValue.message));
  }, [id]);

  async function remove() {
    if (!blog || !token || !window.confirm("确定删除这篇文章吗？")) return;
    try {
      await deleteBlog(token, blog.id);
      window.location.hash = "#/";
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "删除失败");
    }
  }

  if (error) return <section className="page narrow"><p className="error">{error}</p></section>;
  if (!blog) return <section className="page narrow"><p className="muted">加载中…</p></section>;

  return (
    <article className="page article narrow">
      <a className="back" href="#/">← 返回文章列表</a>
      <p className="eyebrow">{formatDate(blog.created_at)}</p>
      <h1>{blog.title}</h1>
      <div className="article-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content}</ReactMarkdown></div>
      {token && <div className="actions"><button onClick={() => onEdit(blog.id)}>编辑</button><button className="danger" onClick={remove}>删除</button></div>}
    </article>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await login(username, password);
      onLogin(result.access_token);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? "用户名或密码不正确，请重试。" : "登录失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page login-page">
      <div className="login-panel">
        <div className="login-copy">
          <p className="eyebrow">DIOGENES LAB</p>
          <h1>欢迎回来。</h1>
          <p>登录后，继续记录你的想法、实验与正在构建的东西。</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="form-heading">
            <span>管理入口</span>
            <strong>登录账户</strong>
          </div>

          <label>
            用户名
            <input
              autoComplete="username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder="输入你的用户名"
              required
            />
          </label>

          <label>
            密码
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="输入你的密码"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </span>
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button className="primary login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "登录中…" : "进入博客"}
          </button>
          <p className="form-hint">这是站长管理入口，游客无需登录即可阅读文章。</p>
          <p className="form-switch">还没有账号？<a href="#register">注册账号</a></p>
        </form>
      </div>
    </section>
  );
}

function Register({ onRegistered }: { onRegistered: () => void }) {
  const [input, setInput] = useState<RegisterInput>({ username: "", password: "", email: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await register(input);
      onRegistered();
    } catch (errorValue) {
      setError(errorValue instanceof Error ? "注册失败，用户名可能已经存在。" : "注册失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page login-page">
      <div className="login-panel">
        <div className="login-copy">
          <p className="eyebrow">DIOGENES LAB</p>
          <h1>建立你的入口。</h1>
          <p>创建一个账号，用于管理文章和探索这个正在成长的个人实验室。</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="form-heading">
            <span>GET STARTED</span>
            <strong>注册账号</strong>
          </div>

          <label>
            用户名
            <input
              autoComplete="username"
              value={input.username}
              onChange={event => setInput({ ...input, username: event.target.value })}
              placeholder="设置一个用户名"
              required
            />
          </label>

          <label>
            邮箱
            <input
              type="email"
              autoComplete="email"
              value={input.email}
              onChange={event => setInput({ ...input, email: event.target.value })}
              placeholder="name@example.com"
              required
            />
          </label>

          <label>
            密码
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={input.password}
                onChange={event => setInput({ ...input, password: event.target.value })}
                placeholder="设置登录密码"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </span>
          </label>

          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "注册中…" : "创建账号"}
          </button>
          <p className="form-hint">当前注册只需要用户名、邮箱和密码，不需要邮箱验证码。</p>
          <p className="form-switch">已经有账号？<a href="#login">返回登录</a></p>
        </form>
      </div>
    </section>
  );
}

function Editor({ id, token, onSaved }: { id?: number; token: string; onSaved: (id: number) => void }) {
  const [input, setInput] = useState<BlogInput>(emptyInput);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (id) getBlog(id).then(blog => setInput({ title: blog.title, content: blog.content })).catch(errorValue => setError(errorValue.message));
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) { setError("请先登录"); return; }
    try {
      const blog = id ? await updateBlog(token, id, input) : await createBlog(token, input);
      onSaved(blog.id);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "保存失败");
    }
  }

  function insertMarkdown(before: string, after = "") {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = input.content.slice(start, end) || "文字";
    const nextContent = input.content.slice(0, start) + before + selected + after + input.content.slice(end);
    setInput({ ...input, content: nextContent });
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <section className="editor-page">
      <div className="editor-topbar">
        <a className="editor-back" href="#/">← 返回</a>
        <span className="editor-status">{id ? "编辑文章" : "新文章"}</span>
        <button className="primary editor-save" type="button" onClick={() => formRef.current?.requestSubmit()}>
          保存文章
        </button>
      </div>

      <form ref={formRef} className="editor-workspace" onSubmit={submit}>
        <aside className="editor-sidebar">
          <p className="eyebrow">DIOGENES LAB</p>
          <h2>写作空间</h2>
          <p className="editor-sidebar-note">用 Markdown 记录想法，让内容保持清晰、自由和可读。</p>
          <div className="editor-tip">
            <strong>快捷提示</strong>
            <span>使用工具栏快速插入 Markdown 格式。</span>
          </div>
        </aside>

        <main className="editor-main">
          <input
            className="editor-title"
            value={input.title}
            onChange={event => setInput({ ...input, title: event.target.value })}
            placeholder="输入文章标题"
            aria-label="文章标题"
            required
          />

          <div className="editor-toolbar" aria-label="Markdown 工具栏">
            <button type="button" onClick={() => insertMarkdown("# ")} title="一级标题">H1</button>
            <button type="button" onClick={() => insertMarkdown("## ")} title="二级标题">H2</button>
            <span className="toolbar-divider" />
            <button type="button" onClick={() => insertMarkdown("**", "**")} title="加粗">B</button>
            <button type="button" onClick={() => insertMarkdown("*", "*")} title="斜体"><em>I</em></button>
            <button type="button" onClick={() => insertMarkdown("- ")} title="无序列表">☷</button>
            <button type="button" onClick={() => insertMarkdown("> ")} title="引用">❯</button>
            <button type="button" onClick={() => insertMarkdown("```\n", "\n```")} title="代码块">&lt;/&gt;</button>
            <button type="button" onClick={() => insertMarkdown("![图片描述](", ")")} title="图片">▧</button>
            <span className="toolbar-spacer" />
            <span className="markdown-label">Markdown</span>
          </div>

          <div className="editor-panels">
            <div className="editor-input-panel">
              <span className="panel-label">编辑</span>
              <textarea
                ref={contentRef}
                value={input.content}
                onChange={event => setInput({ ...input, content: event.target.value })}
                placeholder="从这里开始写作……\n\n支持 Markdown、图片、代码块和列表。"
                aria-label="文章正文"
                required
              />
            </div>
            <div className="editor-preview-panel">
              <span className="panel-label">预览</span>
              <article className="markdown-preview">
                {input.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{input.content}</ReactMarkdown> : <p className="preview-empty">输入内容后，这里会显示文章预览。</p>}
              </article>
            </div>
          </div>

          {error && <p className="error editor-error">{error}</p>}
        </main>
      </form>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value));
}
