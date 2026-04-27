import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    title: "一句话录餐",
    copy: "直接输入“午饭吃了鸡胸肉、米饭和西蓝花”，系统自动拆分食材、估算热量和三大营养素。"
  },
  {
    title: "当天汇总可追踪",
    copy: "同一天的摄入会自动聚合，随时看到热量、蛋白质、脂肪和碳水是否偏离目标。"
  },
  {
    title: "不是泛泛建议",
    copy: "AI 会结合你的身高、体重和体脂，给出更贴近实际的明日调整建议。"
  }
];

const steps = [
  "登录后填写基本身体数据。",
  "自然语言输入每一餐，系统自动分析并入库。",
  "在当天结束前生成一份总结，沉淀第二天能执行的调整。"
];

export default function LandingPage() {
  return (
    <main style={{ padding: "24px 0 64px" }}>
      <div className="page-shell">
        <section
          className="glass-card rise-in"
          style={{
            borderRadius: "36px",
            padding: "24px",
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap"
            }}
          >
            <div className="pill">Nutrition Log / AI Diet Journal</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/login" className="button-ghost">
                登录
              </Link>
              <Link href="/dashboard" className="button-primary">
                打开应用
              </Link>
            </div>
          </div>

          <div className={styles.heroGrid}>
            <div>
              <p className="pill" style={{ marginBottom: 18 }}>
                适合邀请制内测、轻量营养跟踪、AI 辅助复盘
              </p>
              <h1 className="section-title" style={{ maxWidth: 620 }}>
                把饮食记录，从机械记账改成可持续的日常反馈。
              </h1>
              <p className="section-copy" style={{ maxWidth: 620, marginTop: 20 }}>
                这个版本以 Next.js 为前端主入口，面向真实使用场景重新组织了登录、记录和总结流程。
                首页先把价值讲清楚，应用页再直接进入录入和追踪，不再让用户落地就面对一整块表单。
              </p>
              <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
                <Link href="/dashboard" className="button-primary">
                  立即开始记录
                </Link>
                <Link href="/login" className="button-secondary">
                  登录 / 注册
                </Link>
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                borderRadius: "28px",
                padding: 24,
                alignSelf: "start",
                background: "linear-gradient(180deg, rgba(255,253,248,0.9), rgba(251,243,234,0.84))"
              }}
            >
              <div style={{ color: "var(--muted)", fontSize: 14 }}>今日样例</div>
              <div style={{ marginTop: 16, fontSize: 28, lineHeight: 1.2 }}>午饭吃了鸡胸肉、糙米饭和一份西蓝花。</div>
              <div
                style={{
                  marginTop: 20,
                  borderRadius: 20,
                  padding: 18,
                  background: "rgba(255,255,255,0.78)",
                  border: "1px solid var(--line)"
                }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  <StatLine label="估算热量" value="512 kcal" />
                  <StatLine label="蛋白质" value="42 g" />
                  <StatLine label="脂肪" value="11 g" />
                  <StatLine label="碳水" value="58 g" />
                </div>
              </div>
              <p className="section-copy" style={{ marginTop: 18 }}>
                AI 自动解析食物结构，用户需要做的只是把今天吃了什么说清楚。
              </p>
            </div>
          </div>
        </section>

        <section className={styles.featureGrid}>
          {features.map((item, index) => (
            <article
              key={item.title}
              className="glass-card rise-in"
              style={{ borderRadius: "24px", padding: 24, animationDelay: `${index * 120}ms` }}
            >
              <div style={{ color: "var(--accent-deep)", fontSize: 14 }}>0{index + 1}</div>
              <h2 style={{ margin: "14px 0 10px", fontSize: 24 }}>{item.title}</h2>
              <p className="section-copy">{item.copy}</p>
            </article>
          ))}
        </section>

        <section
          className="glass-card"
          style={{
            borderRadius: "30px",
            padding: "32px 24px",
            marginTop: 24
          }}
        >
          <div className={styles.processGrid}>
          <div>
            <p className="pill">迁移后的信息架构</p>
            <h2 className="section-title" style={{ fontSize: "clamp(26px, 3vw, 40px)", marginTop: 18 }}>
              首页负责转化，应用页负责完成任务。
            </h2>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {steps.map((step, index) => (
              <div
                key={step}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: 14,
                  alignItems: "start",
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid var(--line)"
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "18px",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0.75))",
                    color: "var(--accent-deep)",
                    fontSize: 22
                  }}
                >
                  {index + 1}
                </div>
                <p className="section-copy" style={{ marginTop: 6 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
