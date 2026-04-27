import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    title: "自然语言记餐",
    copy: "直接输入一段中文描述，系统会拆出餐食项目，并尽量估算热量、蛋白质、脂肪和碳水。"
  },
  {
    title: "按天汇总营养",
    copy: "围绕每日总热量和三大营养素做汇总，方便你快速核对迁移后的记录逻辑。"
  },
  {
    title: "保留后台管理",
    copy: "普通用户流程和管理员查看分开保留，便于继续沿用原来项目的管理方式。"
  }
];

const steps = [
  "先登录或注册一个测试账号，验证注册、登录和会话是否正常。",
  "进入仪表盘录入餐食和个人资料，检查分析结果、日汇总和 AI 总结。",
  "如需查看整体数据，再进入 /admin/ 检查用户和餐食列表。"
];

export default function LandingPage() {
  return (
    <main style={{ padding: "20px 0 40px" }}>
      <div className="page-shell">
        <section className="glass-card rise-in" style={{ borderRadius: 14, padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div className="pill">Nutrition App / Next.js</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/login" className="button-ghost">
                登录
              </Link>
              <Link href="/dashboard" className="button-primary">
                进入仪表盘
              </Link>
            </div>
          </div>

          <div className={styles.heroGrid}>
            <div>
              <h1 className="section-title" style={{ marginTop: 10 }}>
                营养记录应用
              </h1>
              <p className="section-copy" style={{ marginTop: 14, maxWidth: 680 }}>
                这是从旧版 Python + JS 项目迁移过来的 Next.js 版本。
                当前重点是保证本地联调、餐食记录、每日汇总和后台管理都能稳定使用，
                风格也尽量回到原项目那种轻量、实用的工具界面。
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <Link href="/dashboard" className="button-primary">
                  开始测试
                </Link>
                <Link href="/admin/" className="button-secondary">
                  后台入口
                </Link>
              </div>
            </div>

            <div className="glass-card" style={{ borderRadius: 14, padding: 16, background: "var(--card-soft)" }}>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>本地测试默认配置</div>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                <StatLine label="项目端口" value="5000" />
                <StatLine label="本地数据库" value="db/local.sqlite" />
                <StatLine label="管理员账号" value="admin@example.com" />
                <StatLine label="管理员密码" value="admin123456" />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featureGrid}>
          {features.map((item, index) => (
            <article
              key={item.title}
              className="glass-card rise-in"
              style={{ borderRadius: 14, padding: 16, animationDelay: `${index * 80}ms` }}
            >
              <div style={{ color: "var(--green)", fontSize: 13 }}>功能 0{index + 1}</div>
              <h2 style={{ margin: "10px 0 8px", fontSize: 22 }}>{item.title}</h2>
              <p className="section-copy">{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="glass-card" style={{ borderRadius: 14, padding: 18, marginTop: 18 }}>
          <div className={styles.processGrid}>
            <div>
              <p className="pill">测试流程</p>
              <h2 className="section-title" style={{ fontSize: "clamp(24px, 3vw, 34px)", marginTop: 14 }}>
                推荐按这个顺序验证
              </h2>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {steps.map((step, index) => (
                <div
                  key={step}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr",
                    gap: 12,
                    alignItems: "start",
                    padding: 12,
                    borderRadius: 12,
                    background: "var(--card-soft)",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--pill)",
                      color: "var(--green)",
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </div>
                  <p className="section-copy" style={{ marginTop: 2 }}>
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
