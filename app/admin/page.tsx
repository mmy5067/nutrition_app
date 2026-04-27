"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";

type AuthResponse = {
  authenticated?: boolean;
  email?: string;
};

type AdminSummary = {
  ok?: boolean;
  total_users?: number;
  active_users_7d?: number;
  total_meals?: number;
  meals_24h?: number;
};

type AdminUser = {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string | null;
};

type RecentMeal = {
  id: number;
  user_email: string;
  eaten_at: string;
  meal_type: string | null;
  item_count: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meals, setMeals] = useState<RecentMeal[]>([]);
  const [message, setMessage] = useState("正在加载后台数据...");

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    const me = await apiFetch<AuthResponse>("/api/auth/me");
    if (!me.ok || !me.data.authenticated) {
      router.replace("/login");
      return;
    }

    setEmail(me.data.email || "");
    const [summaryResult, usersResult, mealsResult] = await Promise.all([
      apiFetch<AdminSummary>("/api/admin/summary"),
      apiFetch<{ ok?: boolean; users?: AdminUser[] }>("/api/admin/users"),
      apiFetch<{ ok?: boolean; meals?: RecentMeal[] }>("/api/admin/recent-meals")
    ]);

    if (!summaryResult.ok || !usersResult.ok || !mealsResult.ok) {
      setMessage("后台接口不可用，当前账号可能不是管理员。");
      setBooting(false);
      return;
    }

    setSummary(summaryResult.data);
    setUsers(usersResult.data.users || []);
    setMeals(mealsResult.data.meals || []);
    setMessage("");
    setBooting(false);
  }

  async function deleteUser(userId: number, userEmail: string) {
    const confirmed = window.confirm(`确认删除用户 ${userEmail} 吗？`);
    if (!confirmed) return;

    const result = await apiFetch<{ ok?: boolean; error?: string }>(`/api/admin/users/${userId}`, {
      method: "DELETE"
    });

    if (result.ok && result.data.ok) {
      setUsers((current) => current.filter((user) => user.id !== userId));
      setMessage(`已删除用户 ${userEmail}。`);
      const summaryResult = await apiFetch<AdminSummary>("/api/admin/summary");
      if (summaryResult.ok) {
        setSummary(summaryResult.data);
      }
    } else {
      setMessage(result.data.error || "删除用户失败。");
    }
  }

  if (booting) {
    return (
      <main className={styles.wrap}>
        <div className="page-shell">
          <section className={`glass-card ${styles.panel}`}>正在加载管理后台...</section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <div className={`page-shell ${styles.stack}`}>
        <section className={`glass-card ${styles.panel}`}>
          <div className={styles.header}>
            <div>
              <div className="pill">管理员：{email}</div>
              <h1 style={{ fontSize: 32, margin: "18px 0 10px" }}>/admin/ 管理面板</h1>
              <p className="section-copy">
                这里先补齐了旧 Flask 后台最常用的统计、用户列表和最近餐食视图。
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/dashboard" className="button-secondary">
                用户仪表盘
              </Link>
              <Link href="/" className="button-ghost">
                首页
              </Link>
            </div>
          </div>
          {message ? (
            <p className={styles.muted} style={{ marginTop: 16 }}>
              {message}
            </p>
          ) : null}
        </section>

        <section className={`glass-card ${styles.panel}`}>
          <h2 style={{ marginTop: 0 }}>运行概览</h2>
          <div className={styles.summaryGrid} style={{ marginTop: 18 }}>
            <SummaryCard label="总用户数" value={String(summary?.total_users ?? 0)} />
            <SummaryCard label="7 天活跃用户" value={String(summary?.active_users_7d ?? 0)} />
            <SummaryCard label="总餐食数" value={String(summary?.total_meals ?? 0)} />
            <SummaryCard label="24 小时新增餐食" value={String(summary?.meals_24h ?? 0)} />
          </div>
        </section>

        <section className={`glass-card ${styles.panel}`}>
          <h2 style={{ marginTop: 0 }}>最近用户</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>邮箱</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>{user.is_admin ? "管理员" : "普通用户"}</td>
                    <td className={user.is_active ? styles.statusOk : styles.statusWarn}>
                      {user.is_active ? "启用" : "停用"}
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleString("zh-CN") : "-"}</td>
                    <td>
                      {!user.is_admin ? (
                        <button className="button-ghost" type="button" onClick={() => void deleteUser(user.id, user.email)}>
                          删除
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`glass-card ${styles.panel}`}>
          <h2 style={{ marginTop: 0 }}>最近餐食</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>时间</th>
                  <th>类型</th>
                  <th>食材数</th>
                </tr>
              </thead>
              <tbody>
                {meals.map((meal) => (
                  <tr key={meal.id}>
                    <td>{meal.id}</td>
                    <td>{meal.user_email}</td>
                    <td>{new Date(meal.eaten_at).toLocaleString("zh-CN")}</td>
                    <td>{meal.meal_type || "未分类"}</td>
                    <td>{meal.item_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryCard}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 26, marginTop: 8 }}>{value}</div>
    </div>
  );
}
