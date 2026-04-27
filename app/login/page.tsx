"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState("登录后即可开始记录每日饮食。");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleLogin(formData: FormData) {
    setPending(true);
    setStatus("idle");
    setMessage("正在登录...");

    const email = String(formData.get("login_email") || "").trim();
    const password = String(formData.get("login_password") || "");

    const result = await apiFetch<{ ok?: boolean; error?: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (result.ok && result.data.ok) {
      setStatus("success");
      setMessage("登录成功，正在进入仪表盘。");
      router.push("/dashboard");
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.data.error || "登录失败，请检查邮箱和密码。");
    }

    setPending(false);
  }

  async function handleRegister(formData: FormData) {
    setPending(true);
    setStatus("idle");
    setMessage("正在创建账号...");

    const email = String(formData.get("register_email") || "").trim();
    const password = String(formData.get("register_password") || "");

    const registerResult = await apiFetch<{ ok?: boolean; error?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!registerResult.ok || !registerResult.data.ok) {
      setStatus("error");
      setMessage(registerResult.data.error || "注册失败，请稍后重试。");
      setPending(false);
      return;
    }

    setStatus("success");
    setMessage("注册成功，正在进入仪表盘。");
    router.push("/dashboard");
    router.refresh();
    setPending(false);
  }

  const messageClass =
    status === "error" ? styles.error : status === "success" ? styles.success : styles.hint;

  return (
    <main className={styles.wrap}>
      <div className={styles.shell}>
        <section className={`glass-card ${styles.panel}`}>
          <div className="pill">Nutrition App</div>
          <h1 className="section-title" style={{ fontSize: "clamp(30px, 4vw, 52px)", marginTop: 18 }}>
            开始你的每日饮食记录
          </h1>
          <p className="section-copy" style={{ marginTop: 16 }}>
            记录每一餐、查看每日营养汇总，并逐步建立更清晰、更可持续的健康饮食习惯。
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
            <div className="pill">自然语言记餐</div>
            <div className="pill">每日营养汇总</div>
            <div className="pill">轻量健康反馈</div>
          </div>
          <Link href="/" className="button-secondary" style={{ marginTop: 24 }}>
            返回首页
          </Link>
        </section>

        <section className={`glass-card ${styles.panel}`}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={mode === "login" ? styles.tabActive : styles.tab}
              onClick={() => setMode("login")}
            >
              登录
            </button>
            <button
              type="button"
              className={mode === "register" ? styles.tabActive : styles.tab}
              onClick={() => setMode("register")}
            >
              注册
            </button>
          </div>

          {mode === "login" ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin(new FormData(event.currentTarget));
              }}
            >
              <label className={styles.label}>
                邮箱
                <input className={styles.input} name="login_email" type="email" placeholder="you@example.com" />
              </label>
              <label className={styles.label}>
                密码
                <input className={styles.input} name="login_password" type="password" placeholder="请输入密码" />
              </label>
              <button className="button-primary" type="submit" disabled={pending}>
                {pending ? "登录中..." : "登录"}
              </button>
            </form>
          ) : (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void handleRegister(new FormData(event.currentTarget));
              }}
            >
              <label className={styles.label}>
                邮箱
                <input className={styles.input} name="register_email" type="email" placeholder="you@example.com" />
              </label>
              <label className={styles.label}>
                密码
                <input className={styles.input} name="register_password" type="password" placeholder="建议至少 6 位" />
              </label>
              <button className="button-primary" type="submit" disabled={pending}>
                {pending ? "注册中..." : "创建账号"}
              </button>
            </form>
          )}

          <p className={messageClass} style={{ marginTop: 16 }}>
            {message}
          </p>
        </section>
      </div>
    </main>
  );
}
