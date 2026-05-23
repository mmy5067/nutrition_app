"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";

type Mode = "login" | "register";

type AuthResponse = {
  ok?: boolean;
  error?: string;
  error_code?: string;
  message?: string;
  email_sent?: boolean;
  retry_after_seconds?: number;
};

function getRegisterErrorMessage(error?: string) {
  if (error === "email already registered") {
    return "这个邮箱已经注册过了，可以直接登录或重新发送验证邮件。";
  }

  if (error === "email/password required") {
    return "请填写邮箱和密码后再注册。";
  }

  return error || "注册失败，请稍后再试。";
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState("登录后即可查看你的每日饮食记录与营养数据。");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [pending, setPending] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verificationStatus = searchParams.get("verification");
    if (verificationStatus === "success") {
      setStatus("success");
      setMessage("邮箱验证成功，现在可以登录了。");
      setMode("login");
    } else if (verificationStatus === "expired") {
      setStatus("error");
      setMessage("验证链接已过期，请重新发送验证邮件。");
      setMode("login");
      setShowResend(true);
    } else if (verificationStatus === "invalid") {
      setStatus("error");
      setMessage("验证链接无效，请重新发送验证邮件。");
      setMode("login");
      setShowResend(true);
    }
  }, [searchParams]);

  async function handleLogin(formData: FormData) {
    setPending(true);
    setStatus("idle");
    setShowResend(false);
    setMessage("正在登录...");

    const email = String(formData.get("login_email") || "").trim().toLowerCase();
    const password = String(formData.get("login_password") || "");
    setLoginEmail(email);

    const result = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (result.ok && result.data.ok) {
      setStatus("success");
      setMessage("登录成功，正在进入仪表盘...");
      router.push("/dashboard");
      router.refresh();
      setPending(false);
      return;
    }

    if (result.data.error_code === "email_not_verified") {
      setStatus("error");
      setMessage("邮箱尚未验证，请先查收邮件，或重新发送验证邮件。");
      setResendEmail(email);
      setShowResend(true);
      setPending(false);
      return;
    }

    setStatus("error");
    setMessage(result.data.error || "登录失败，请检查邮箱和密码。");
    setPending(false);
  }

  async function handleRegister(formData: FormData) {
    setPending(true);
    setStatus("idle");
    setShowResend(false);
    setMessage("正在创建账号...");

    const email = String(formData.get("register_email") || "").trim().toLowerCase();
    const password = String(formData.get("register_password") || "");
    setRegisterEmail(email);

    const registerResult = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!registerResult.ok && registerResult.status !== 202) {
      setStatus("error");
      setMessage(getRegisterErrorMessage(registerResult.data.error));
      setPending(false);
      return;
    }

    setStatus("success");
    setResendEmail(email);
    setShowResend(true);
    setMode("login");
    setMessage(registerResult.data.message || "注册成功，请先验证邮箱后再登录。");
    setPending(false);
  }

  async function handleResendVerification() {
    const targetEmail = resendEmail || loginEmail || registerEmail;

    if (!targetEmail) {
      setStatus("error");
      setMessage("请先输入已注册的邮箱，再重新发送验证邮件。");
      return;
    }

    setPending(true);
    const result = await apiFetch<AuthResponse>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: targetEmail })
    });

    if (result.ok && result.data.ok) {
      setStatus("success");
      setMessage(result.data.message || "验证邮件已发送，请查收邮箱。");
      setPending(false);
      return;
    }

    if (result.data.error_code === "verification_rate_limited") {
      setStatus("error");
      setMessage(`发送过于频繁，请在 ${result.data.retry_after_seconds ?? 60} 秒后再试。`);
      setPending(false);
      return;
    }

    setStatus("error");
    setMessage(result.data.message || result.data.error || "验证邮件发送失败，请稍后再试。");
    setPending(false);
  }

  const messageClass =
    status === "error" ? styles.error : status === "success" ? styles.success : styles.hint;

  return (
    <main className={styles.wrap}>
      <div className={styles.shell}>
        <section className={`glass-card ${styles.panel}`}>
          <div className="pill">Nutrition App</div>
          <h1 className="section-title" style={{ fontSize: "clamp(28px, 4vw, 42px)", marginTop: 18 }}>
            开始记录饮食
            <br />
            建立更清晰的营养反馈
          </h1>
          <p className="section-copy" style={{ marginTop: 16 }}>
            使用自然语言记录每天吃了什么，自动查看热量和三大营养素，并在仪表盘中持续复盘自己的饮食节奏。
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
            <div className="pill">自然语言记餐</div>
            <div className="pill">热量与三大营养素汇总</div>
            <div className="pill">适合减脂、控糖和日常健康管理</div>
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
                <input
                  className={styles.input}
                  name="login_email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
              </label>
              <label className={styles.label}>
                密码
                <input className={styles.input} name="login_password" type="password" placeholder="请输入账号密码" />
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
                <input
                  className={styles.input}
                  name="register_email"
                  type="email"
                  placeholder="you@example.com"
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                />
              </label>
              <label className={styles.label}>
                密码
                <input className={styles.input} name="register_password" type="password" placeholder="至少 6 位密码" />
              </label>
              <p className={styles.helper}>
                当前使用邮件链接验证，注册后无需填写验证码，请到邮箱中点击验证链接完成激活。
              </p>
              <button className="button-primary" type="submit" disabled={pending}>
                {pending ? "注册中..." : "创建账号"}
              </button>
            </form>
          )}

          <p className={messageClass} style={{ marginTop: 16 }}>
            {message}
          </p>

          {showResend ? (
            <div className={styles.resendRow}>
              <button type="button" className="button-secondary" onClick={() => void handleResendVerification()} disabled={pending}>
                {pending ? "发送中..." : "重新发送验证邮件"}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
