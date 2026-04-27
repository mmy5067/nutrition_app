"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { apiFetch, formatNumber, getTodayString } from "@/lib/api";
import type { Meal, Profile, SummaryResponse } from "@/lib/types";

type AuthResponse = {
  authenticated?: boolean;
  email?: string;
  user_id?: number;
};

type DaySummaryPayload = {
  ok?: boolean;
  exists?: boolean;
  summary?: string;
  totals?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
  error?: string;
};

export default function DashboardPage() {
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({
    height_cm: null,
    weight_kg: null,
    body_fat_pct: null
  });
  const [profileMessage, setProfileMessage] = useState("完善基础资料，便于后续统计。");
  const [profilePending, setProfilePending] = useState(false);
  const [mealInput, setMealInput] = useState("");
  const [mealMessage, setMealMessage] = useState("输入一段餐食描述，或后续接入 AI 自动解析。");
  const [mealStatus, setMealStatus] = useState<"muted" | "ok" | "error">("muted");
  const [mealPending, setMealPending] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [totals, setTotals] = useState<SummaryResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState(getTodayString());
  const [historyTotals, setHistoryTotals] = useState<SummaryResponse | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryPending, setSummaryPending] = useState(false);
  const router = useRouter();

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
    await Promise.all([loadProfile(), loadTodayData(), loadSummary()]);
    setBooting(false);
  }

  async function loadProfile() {
    const result = await apiFetch<{ ok?: boolean; profile?: Profile }>("/api/profile/");
    if (result.ok && result.data.profile) {
      setProfile(result.data.profile);
    }
  }

  async function loadTodayData() {
    const day = getTodayString();
    const [mealsResult, totalsResult] = await Promise.all([
      apiFetch<{ ok?: boolean; meals?: Meal[] }>(`/api/meals/day?date=${day}`),
      apiFetch<SummaryResponse>(`/api/meals/summary?date=${day}`)
    ]);

    if (mealsResult.ok && mealsResult.data.meals) {
      setMeals(mealsResult.data.meals);
    }

    if (totalsResult.ok) {
      setTotals(totalsResult.data);
    }
  }

  async function loadSummary() {
    const day = getTodayString();
    const result = await apiFetch<DaySummaryPayload>(`/api/ai/day_summary?date=${day}`);
    if (result.ok && result.data.exists && result.data.summary) {
      setSummary(result.data.summary);
      if (result.data.totals) {
        setTotals({
          ok: true,
          date: day,
          calories: result.data.totals.calories,
          protein: result.data.totals.protein,
          fat: result.data.totals.fat,
          carbs: result.data.totals.carbs
        });
      }
    }
  }

  async function saveProfile() {
    setProfilePending(true);
    const result = await apiFetch<{ ok?: boolean; error?: string; profile?: Profile }>("/api/profile/", {
      method: "POST",
      body: JSON.stringify(profile)
    });

    if (result.ok && result.data.profile) {
      setProfile(result.data.profile);
      setProfileMessage("资料已保存。");
    } else {
      setProfileMessage(result.data.error || "资料保存失败。");
    }

    setProfilePending(false);
  }

  async function analyzeMeal() {
    if (!mealInput.trim()) {
      setMealStatus("error");
      setMealMessage("请先输入餐食描述。");
      return;
    }

    setMealPending(true);
    setMealStatus("muted");
    setMealMessage("正在分析餐食...");

    const result = await apiFetch<{ ok?: boolean; error?: string; comment?: string }>("/api/ai/analyze_meal", {
      method: "POST",
      body: JSON.stringify({
        text: mealInput.trim(),
        meal_type: guessMealType(mealInput)
      })
    });

    if (result.ok && result.data.ok) {
      setMealInput("");
      setMealStatus("ok");
      setMealMessage(result.data.comment || "餐食已记录。");
      await loadTodayData();
    } else {
      setMealStatus("error");
      setMealMessage(result.data.error || "餐食分析失败。");
    }

    setMealPending(false);
  }

  async function generateSummary() {
    setSummaryPending(true);
    const day = getTodayString();
    const result = await apiFetch<DaySummaryPayload>("/api/ai/day_summary", {
      method: "POST",
      body: JSON.stringify({ date: day })
    });

    if (result.ok && result.data.ok && result.data.summary) {
      setSummary(result.data.summary);
      if (result.data.totals) {
        setTotals({
          ok: true,
          date: day,
          calories: result.data.totals.calories,
          protein: result.data.totals.protein,
          fat: result.data.totals.fat,
          carbs: result.data.totals.carbs
        });
      }
    } else {
      setSummary(result.data.error || "生成总结失败。请先确认当天已有餐食，并已配置 LLM。");
    }

    setSummaryPending(false);
  }

  async function deleteMeal(mealId: number) {
    const result = await apiFetch<{ ok?: boolean; error?: string }>(`/api/meals/${mealId}`, {
      method: "DELETE"
    });

    if (result.ok && result.data.ok) {
      await loadTodayData();
    } else {
      setMealStatus("error");
      setMealMessage(result.data.error || "删除失败。");
    }
  }

  async function loadHistoryTotals() {
    const result = await apiFetch<SummaryResponse>(`/api/meals/summary?date=${selectedDay}`);
    if (result.ok) {
      setHistoryTotals(result.data);
    }
  }

  async function logout() {
    await apiFetch<{ ok?: boolean }>("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (booting) {
    return (
      <main className={styles.wrap}>
        <div className="page-shell">
          <section className={`glass-card ${styles.panel}`}>正在加载仪表盘...</section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <div className="page-shell">
        <div className={styles.grid}>
          <aside className={`${styles.stack} ${styles.sticky}`}>
            <section className={`glass-card ${styles.panel}`}>
              <div className="pill">当前账号：{email}</div>
              <h1 style={{ fontSize: 32, margin: "18px 0 10px" }}>营养仪表盘</h1>
              <p className="section-copy">
                这里优先用于验证注册、登录、资料、餐食记录与每日汇总接口是否正常。
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                <Link href="/" className="button-secondary">
                  返回首页
                </Link>
                <Link href="/admin/" className="button-secondary">
                  后台面板
                </Link>
                <button className="button-ghost" type="button" onClick={() => void logout()}>
                  退出登录
                </button>
              </div>
            </section>

            <section className={`glass-card ${styles.panel}`}>
              <h2 style={{ marginTop: 0 }}>个人资料</h2>
              <div className={styles.fieldGrid}>
                <label className={styles.label}>
                  身高 cm
                  <input
                    className={styles.input}
                    type="number"
                    value={profile.height_cm ?? ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, height_cm: toNumber(event.target.value) }))}
                  />
                </label>
                <label className={styles.label}>
                  体重 kg
                  <input
                    className={styles.input}
                    type="number"
                    value={profile.weight_kg ?? ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, weight_kg: toNumber(event.target.value) }))}
                  />
                </label>
                <label className={styles.label}>
                  体脂 %
                  <input
                    className={styles.input}
                    type="number"
                    value={profile.body_fat_pct ?? ""}
                    onChange={(event) => setProfile((prev) => ({ ...prev, body_fat_pct: toNumber(event.target.value) }))}
                  />
                </label>
              </div>
              <button className="button-primary" style={{ marginTop: 18 }} type="button" onClick={() => void saveProfile()}>
                {profilePending ? "保存中..." : "保存资料"}
              </button>
              <p className={styles.messageMuted} style={{ marginTop: 14 }}>
                {profileMessage}
              </p>
            </section>
          </aside>

          <div className={styles.stack}>
            <section className={`glass-card ${styles.panel}`}>
              <div className="pill">AI 分析</div>
              <h2 style={{ margin: "16px 0 10px" }}>输入一段餐食描述</h2>
              <p className="section-copy">
                例如：鸡胸肉 150g、米饭 200g、西兰花一份。未配置模型时，这个功能会返回配置错误，不影响普通记录与后台测试。
              </p>
              <textarea
                className={styles.textarea}
                value={mealInput}
                onChange={(event) => setMealInput(event.target.value)}
                placeholder="描述今天这顿饭吃了什么"
                style={{ marginTop: 18 }}
              />
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <button className="button-primary" type="button" onClick={() => void analyzeMeal()}>
                  {mealPending ? "分析中..." : "分析并记录"}
                </button>
                <button className="button-secondary" type="button" onClick={() => void generateSummary()}>
                  {summaryPending ? "生成中..." : "生成每日总结"}
                </button>
              </div>
              <p
                className={
                  mealStatus === "error"
                    ? styles.messageError
                    : mealStatus === "ok"
                      ? styles.messageOk
                      : styles.messageMuted
                }
                style={{ marginTop: 14 }}
              >
                {mealMessage}
              </p>
            </section>

            <section className={`glass-card ${styles.panel}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0 }}>今日汇总</h2>
                  <p className="section-copy" style={{ marginTop: 8 }}>
                    {getTodayString()}
                  </p>
                </div>
              </div>
              <div className={styles.summaryGrid} style={{ marginTop: 18 }}>
                <SummaryCard label="热量" value={`${formatNumber(readTotal(totals, "calories"))} kcal`} />
                <SummaryCard label="蛋白质" value={`${formatNumber(readTotal(totals, "protein"))} g`} />
                <SummaryCard label="脂肪" value={`${formatNumber(readTotal(totals, "fat"))} g`} />
                <SummaryCard label="碳水" value={`${formatNumber(readTotal(totals, "carbs"))} g`} />
              </div>
            </section>

            <section className={`glass-card ${styles.panel}`}>
              <h2 style={{ marginTop: 0 }}>今日餐食</h2>
              {meals.length === 0 ? (
                <p className="section-copy">今天还没有记录餐食。</p>
              ) : (
                <div className={styles.mealList}>
                  {meals.map((meal) => (
                    <article key={meal.id} className={styles.mealCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong style={{ fontSize: 22 }}>{meal.meal_type || "未分类"}</strong>
                          <p className="section-copy" style={{ marginTop: 6 }}>
                            {new Date(meal.eaten_at).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                            {meal.note ? ` / ${meal.note}` : ""}
                          </p>
                        </div>
                        <button className="button-ghost" type="button" onClick={() => void deleteMeal(meal.id)}>
                          删除
                        </button>
                      </div>
                      <div className={styles.mealItems}>
                        {meal.items.map((item, index) => (
                          <div key={`${meal.id}-${index}`} className={styles.mealItem}>
                            <div>
                              <strong>{item.name}</strong>
                              <div className="section-copy" style={{ marginTop: 6, fontSize: 14 }}>
                                {item.quantity !== null ? `${formatNumber(item.quantity)}${item.unit || ""}` : "数量未填"}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong>{item.calories !== null ? `${formatNumber(item.calories)} kcal` : "-"}</strong>
                              <div className="section-copy" style={{ marginTop: 6, fontSize: 14 }}>
                                P {formatNumber(item.protein)} / F {formatNumber(item.fat)} / C {formatNumber(item.carbs)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={`glass-card ${styles.panel}`}>
              <h2 style={{ marginTop: 0 }}>AI 每日总结</h2>
              <p className="section-copy" style={{ whiteSpace: "pre-wrap", marginTop: 14 }}>
                {summary || "暂无总结。配置好 LLM 并生成后会显示在这里。"}
              </p>
            </section>

            <section className={`glass-card ${styles.panel}`}>
              <h2 style={{ marginTop: 0 }}>历史汇总</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
                <input
                  className={styles.input}
                  type="date"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  style={{ maxWidth: 220 }}
                />
                <button className="button-secondary" type="button" onClick={() => void loadHistoryTotals()}>
                  查询当日汇总
                </button>
              </div>
              {historyTotals ? (
                <div className={styles.summaryGrid} style={{ marginTop: 18 }}>
                  <SummaryCard label="热量" value={`${formatNumber(readTotal(historyTotals, "calories"))} kcal`} />
                  <SummaryCard label="蛋白质" value={`${formatNumber(readTotal(historyTotals, "protein"))} g`} />
                  <SummaryCard label="脂肪" value={`${formatNumber(readTotal(historyTotals, "fat"))} g`} />
                  <SummaryCard label="碳水" value={`${formatNumber(readTotal(historyTotals, "carbs"))} g`} />
                </div>
              ) : (
                <p className="section-copy" style={{ marginTop: 14 }}>
                  选择一个日期后查看汇总。
                </p>
              )}
            </section>
          </div>
        </div>
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

function readTotal(source: SummaryResponse | null, key: "calories" | "protein" | "fat" | "carbs") {
  if (!source) return null;

  const mapped = {
    calories: source.calories ?? source.total_calories ?? null,
    protein: source.protein ?? source.total_protein ?? null,
    fat: source.fat ?? source.total_fat ?? null,
    carbs: source.carbs ?? source.total_carbs ?? null
  };

  return mapped[key];
}

function toNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function guessMealType(text: string) {
  if (/早餐|早饭|morning|breakfast/i.test(text)) return "早餐";
  if (/午餐|午饭|lunch/i.test(text)) return "午餐";
  if (/晚餐|晚饭|dinner/i.test(text)) return "晚餐";
  if (/加餐|snack/i.test(text)) return "加餐";
  if (/夜宵|宵夜/i.test(text)) return "夜宵";
  return null;
}
