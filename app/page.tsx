"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { apiFetch } from "@/lib/api";

type AuthResponse = {
  authenticated?: boolean;
  is_admin?: boolean;
};

const highlights = [
  {
    title: "一句话记录一餐",
    copy: "直接输入早餐、午餐或加餐内容，系统会自动识别食物、份量和常见营养信息。"
  },
  {
    title: "营养结构一眼看清",
    copy: "自动汇总热量、蛋白质、脂肪和碳水，帮助你更快判断这一餐是否均衡。"
  },
  {
    title: "每天都能持续复盘",
    copy: "把每天的饮食记录沉淀成可回看的数据和总结，让健康管理更有依据。"
  }
];

const values = [
  {
    title: "自然记录，不打断生活",
    copy: "像发消息一样描述吃了什么，不需要为了记餐改变原有习惯。"
  },
  {
    title: "更适合中文饮食场景",
    copy: "家常菜、外卖组合和简单食材搭配，都能用自然中文快速记录。"
  },
  {
    title: "让目标更可执行",
    copy: "控热量、补蛋白和优化碳水结构不再只是感觉，而是可调整的行动。"
  }
];

const steps = [
  "输入一段自然语言，例如“午餐吃了 150 克鸡胸肉、半碗米饭和一份西兰花”。",
  "系统自动识别餐食内容并估算热量与三大营养素，生成清晰结果。",
  "在仪表盘中查看当日摄入和总结，持续观察自己的饮食节奏与营养平衡。"
];

const metrics = [
  { label: "记录方式", value: "自然语言输入" },
  { label: "核心指标", value: "热量 + 三大营养素" },
  { label: "适用目标", value: "减脂、控糖、增肌" }
];

const demoSlides = [
  {
    title: "早餐记录",
    input: "两片全麦面包、一个水煮蛋、一杯无糖豆浆",
    foods: [
      { name: "全麦面包", amount: "2 片" },
      { name: "水煮蛋", amount: "1 个" },
      { name: "无糖豆浆", amount: "1 杯" }
    ],
    result: "426 kcal",
    macros: ["P 24 g", "F 13 g", "C 49 g"]
  },
  {
    title: "午餐记录",
    input: "150 克鸡胸肉、180 克糙米饭，还有一份清炒西兰花",
    foods: [
      { name: "鸡胸肉", amount: "150 g" },
      { name: "糙米饭", amount: "180 g" },
      { name: "西兰花", amount: "1 份" }
    ],
    result: "612 kcal",
    macros: ["P 48 g", "F 12 g", "C 68 g"]
  },
  {
    title: "晚餐记录",
    input: "三文鱼沙拉，里面有生菜、牛油果和半个玉米",
    foods: [
      { name: "三文鱼", amount: "120 g" },
      { name: "牛油果", amount: "1/2 个" },
      { name: "生菜玉米沙拉", amount: "1 份" }
    ],
    result: "538 kcal",
    macros: ["P 31 g", "F 26 g", "C 34 g"]
  }
];

export default function LandingPage() {
  const [auth, setAuth] = useState<AuthResponse>({ authenticated: false });
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAuth() {
      const result = await apiFetch<AuthResponse>("/api/auth/me");
      if (!active) return;
      if (result.ok) setAuth(result.data);
      setLoadingAuth(false);
    }

    void loadAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDemoIndex((current) => (current + 1) % demoSlides.length);
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const authenticated = Boolean(auth.authenticated);
  const isAdmin = Boolean(auth.is_admin);

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <section className={`glass-card rise-in ${styles.hero}`}>
          <div className={styles.heroBackground} aria-hidden="true">
            <div className={styles.orbLarge} />
            <div className={styles.orbSmall} />
            <div className={styles.gridVeil} />
          </div>

          <header className={styles.navRow}>
            <div className={styles.brandBlock}>
              <div className={styles.brandMark} aria-hidden="true">
                <span className={styles.brandLeafMain} />
                <span className={styles.brandLeafSub} />
              </div>
              <div>
                <div className={styles.brandName}>Nutrition App</div>
                <div className={styles.brandTag}>更轻松地记录每一餐，也更清楚地了解自己的营养状态</div>
              </div>
            </div>

            <nav className={styles.heroActions} aria-label="首页导航">
              {loadingAuth ? null : authenticated ? (
                <>
                  <Link href="/dashboard" className="button-primary">
                    进入仪表盘
                  </Link>
                  {isAdmin ? (
                    <Link href="/admin/" className="button-secondary">
                      后台管理
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link href="/login" className="button-ghost">
                    登录
                  </Link>
                  <Link href="/login" className="button-primary">
                    立即开始
                  </Link>
                </>
              )}
            </nav>
          </header>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <div className={`pill ${styles.eyebrow}`}>自然语言记餐 / 每日营养总览 / 轻量健康反馈</div>
              <h1 className={styles.heroTitle}>
                记录每一餐
                <br />
                读懂每天的营养状态
              </h1>
              <p className={styles.heroCopy}>
                用更自然的方式记录饮食、查看热量与营养结构，并通过持续的数据沉淀建立更稳定的健康习惯。
              </p>

              <div className={styles.ctaRow}>
                <Link href={authenticated ? "/dashboard" : "/login"} className="button-primary">
                  {authenticated ? "继续记录今天的饮食" : "开始记录第一餐"}
                </Link>
              </div>

              <div className={styles.metricRow}>
                {metrics.map((metric) => (
                  <article key={metric.label} className={styles.metricCard}>
                    <div className={styles.metricLabel}>{metric.label}</div>
                    <div className={styles.metricValue}>{metric.value}</div>
                  </article>
                ))}
              </div>
            </div>

            <aside className={styles.showcase} aria-label="产品演示">
              <div className={styles.showcaseHeader}>
                <div>
                  <div className={styles.showcaseEyebrow}>今日摄入概览</div>
                  <h2 className={styles.showcaseTitle}>
                    从一句描述
                    <br />
                    到一份清晰结果
                  </h2>
                </div>
                <div className={styles.statusPill}>
                  <span />
                  记录进行中
                </div>
              </div>

              <div className={styles.summaryPanel}>
                <div className={styles.summaryItem}>
                  <span>今日热量</span>
                  <strong>1,684 kcal</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>蛋白质</span>
                  <strong>96 g</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>脂肪</span>
                  <strong>54 g</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>碳水</span>
                  <strong>182 g</strong>
                </div>
              </div>

              <div id="demo" className={styles.demoCard}>
                <div className={styles.demoTop}>
                  <div className={styles.demoLabel}>看看如何使用</div>
                  <div className={styles.demoPagination} aria-hidden="true">
                    {demoSlides.map((slide, index) => (
                      <button
                        key={slide.title}
                        type="button"
                        className={index === demoIndex ? styles.demoDotActive : styles.demoDot}
                        onClick={() => setDemoIndex(index)}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.demoViewport}>
                  <div
                    className={styles.demoTrack}
                    style={{ transform: `translateX(-${demoIndex * 100}%)` }}
                  >
                    {demoSlides.map((slide) => (
                      <article key={slide.title} className={styles.demoSlide}>
                        <div className={styles.demoColumn}>
                          <div className={styles.demoBlockLabel}>{slide.title}</div>
                          <div className={styles.demoInputBubble}>{slide.input}</div>
                        </div>

                        <div className={styles.demoColumn}>
                          <div className={styles.demoBlockLabel}>识别结果</div>
                          <div className={styles.demoRecognition}>
                            {slide.foods.map((food) => (
                              <div key={food.name} className={styles.demoFoodRow}>
                                <strong>{food.name}</strong>
                                <span>{food.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={styles.demoColumn}>
                          <div className={styles.demoBlockLabel}>营养结果</div>
                          <div className={styles.demoResult}>
                            <div>
                              <span>本餐估算热量</span>
                              <strong>{slide.result}</strong>
                            </div>
                            <div className={styles.demoMacroRow}>
                              {slide.macros.map((macro) => (
                                <span key={macro}>{macro}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHead}>
            <div className="pill">核心能力</div>
            <h2 className={styles.sectionTitle}>
              不是把饮食记成流水账
              <br />
              而是整理成真正可用的健康信息
            </h2>
            <p className={styles.sectionDescription}>
              首页的信息层级围绕记录、理解和复盘展开，帮助用户第一眼知道这个产品能解决什么问题。
            </p>
          </div>

          <div className={styles.featureGrid}>
            {highlights.map((item, index) => (
              <article key={item.title} className={`glass-card rise-in ${styles.featureCard}`}>
                <div className={styles.featureIndex}>0{index + 1}</div>
                <h3 className={styles.featureTitle}>{item.title}</h3>
                <p className="section-copy">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.dualGrid}>
            <article className={`glass-card ${styles.storyCard}`}>
              <div className="pill">产品价值</div>
              <h2 className={styles.sectionTitle}>
                更贴近日常饮食场景
                <br />
                才能让记录真正持续下去
              </h2>
              <div className={styles.valueList}>
                {values.map((item) => (
                  <div key={item.title} className={styles.valueItem}>
                    <div className={styles.valueIcon} aria-hidden="true">
                      <span className={styles.valueIconStem} />
                      <span className={styles.valueIconLeafLarge} />
                      <span className={styles.valueIconLeafSmall} />
                    </div>
                    <div>
                      <h3 className={styles.valueTitle}>{item.title}</h3>
                      <p className="section-copy">{item.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={`glass-card ${styles.storyCard}`}>
              <div className="pill">使用流程</div>
              <h2 className={styles.sectionTitle}>
                三步完成一次记录
                <br />
                让饮食管理更容易坚持
              </h2>
              <div className={styles.stepsList}>
                {steps.map((step, index) => (
                  <div key={step} className={styles.stepItem}>
                    <div className={styles.stepBadge}>{index + 1}</div>
                    <p className={styles.stepCopy}>{step}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className={`glass-card ${styles.ctaPanel}`}>
          <div className={styles.ctaContent}>
            <div className="pill">开始建立自己的饮食记录节奏</div>
            <h2 className={styles.sectionTitle}>
              不需要复杂设置
              <br />
              打开页面就能开始记录
            </h2>
            <p className={`${styles.ctaCopy} section-copy`}>
              适合希望更稳定管理热量摄入、提高蛋白质摄入质量、改善餐食结构的用户。
            </p>
          </div>

          <div className={styles.ctaActions}>
            <Link href={authenticated ? "/dashboard" : "/login"} className="button-primary">
              {authenticated ? "进入仪表盘继续记录" : "立即开始使用"}
            </Link>
            <Link href="/login" className="button-secondary">
              登录已有账号
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
