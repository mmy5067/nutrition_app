// static/js/index.js
(function (w, NT) {
  const $ = (id) => document.getElementById(id);

  // ========== 登录校验 ==========
  async function ensureAuthed() {
    const res = await NT.api("/api/auth/me");
    if (!res.ok || !res.data.authenticated) {
      w.location.href = "/login";
      return false;
    }
    return true;
  }

  // ========== 档案相关 ==========
  function renderProfile(p = {}) {
    const ids = ["height_cm", "weight_kg", "body_fat_pct"];
    const mids = ["m_height_cm", "m_weight_kg", "m_body_fat_pct"];

    ids.forEach((k) => {
      const el = $(k);
      if (el) el.value = p[k] ?? "";
    });

    mids.forEach((k2, i) => {
      const el = $(k2);
      const key = ids[i];
      if (el) el.value = p[key] ?? "";
    });

    const info = $("profile_updated");
    const minfo = $("m_profile_updated");
    if (info) info.innerText = p.updated_at ? "更新于 " + p.updated_at : "";
    if (minfo) minfo.innerText = p.updated_at ? "更新于 " + p.updated_at : "";
  }

  async function loadProfile() {
    try {
      const res = await NT.api("/api/profile/");
      if (res.ok && res.data) {
        renderProfile(res.data.profile || res.data);
      }
    } catch (e) {
      console.warn("加载档案失败", e);
    }
  }

  async function saveProfile(fromMobile = false) {
    const prefix = fromMobile ? "m_" : "";
    const h = $(prefix + "height_cm")?.value;
    const wv = $(prefix + "weight_kg")?.value;
    const bf = $(prefix + "body_fat_pct")?.value;

    const body = {
      height_cm: h ? Number(h) : null,
      weight_kg: wv ? Number(wv) : null,
      body_fat_pct: bf ? Number(bf) : null
    };

    const res = await NT.api("/api/profile/", {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (res.ok && (res.data.ok || res.data.height_cm !== undefined)) {
      renderProfile(res.data.profile || res.data);
      alert("已保存档案");
    } else {
      alert("保存失败：" + (res.data?.error || ""));
    }
  }

  // ========== 今日餐食渲染 & 删除 ==========
  function renderMeals(meals) {
    const box = $("meals");
    if (!box) return;

    if (!meals || !meals.length) {
      box.innerHTML =
        '<div class="muted">今天还没有记录，可以在上方输入一顿餐的描述交给 AI 分析。</div>';
      return;
    }

    box.innerHTML = "";
    meals
      .slice()
      .sort((a, b) => new Date(a.eaten_at) - new Date(b.eaten_at))
      .forEach((m) => {
        const itemsHTML = (m.items || [])
          .map((it) => {
            const name = it.name || "未命名";
            const qty =
              it.quantity != null || it.unit
                ? `${NT.fmt(it.quantity)}${it.unit || ""}`
                : "";
            const cal =
              it.calories != null ? `${NT.fmt(it.calories)} kcal` : "";
            const p =
              it.protein != null ? `P ${NT.fmt(it.protein)} g` : "";
            const f = it.fat != null ? `F ${NT.fmt(it.fat)} g` : "";
            const c =
              it.carbs != null ? `C ${NT.fmt(it.carbs)} g` : "";
            const hasPFC = p || f || c;

            return `
              <li>
                <div class="meal-item-line1">
                  <div class="meal-name">${name}</div>
                  <div class="meal-qty">${qty}</div>
                  <div class="meal-cal">${cal}</div>
                </div>
                ${
                  hasPFC
                    ? `<div class="meal-pfc-row">
                        <span>${p || ""}</span>
                        <span>${f || ""}</span>
                        <span>${c || ""}</span>
                      </div>`
                    : ""
                }
              </li>
            `;
          })
          .join("");

        const t = m.eaten_at
          ? new Date(m.eaten_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "";

        const mealTotalCal = (m.items || []).reduce(
          (sum, it) =>
            sum + (it.calories != null ? Number(it.calories) : 0),
          0
        );

        box.innerHTML += `
          <div class="meal card-flat">
            <div class="row-sb">
              <div>
                <h3>${m.meal_type}</h3>
                <div class="muted tiny">
                  ${t}${m.note ? " · " + m.note : ""}
                </div>
              </div>
              <div class="meal-header-right">
                ${
                  mealTotalCal > 0
                    ? `<div class="meal-total-kcal">${NT.fmt(
                        mealTotalCal
                      )} kcal</div>`
                    : ""
                }
                <button class="btn danger" type="button" data-meal-id="${
                  m.id
                }">删除</button>
              </div>
            </div>
            <ul class="items">${itemsHTML}</ul>
          </div>
        `;
      });
  }

  async function deleteMeal(id) {
    if (!confirm("确定删除这条记录吗？")) return;
    const res = await NT.api(`/api/meals/${id}`, { method: "DELETE" });
    if (res.ok && res.data.ok) {
      await loadTodayMealsAndTotals();
    } else {
      alert("删除失败：" + (res.data?.error || ""));
    }
  }

  // ========== Totals 统一处理 ==========
  function normalizeTotals(t) {
    if (!t) return null;
    return {
      calories:
        t.calories ?? t.total_calories ?? 0,
      protein:
        t.protein ?? t.total_protein ?? 0,
      fat:
        t.fat ?? t.total_fat ?? 0,
      carbs:
        t.carbs ?? t.total_carbs ?? 0
    };
  }

  function renderTotals(tRaw, elId) {
    const el = $(elId);
    if (!el) return;
    const t = normalizeTotals(tRaw);
    if (!t) return;

    el.innerHTML = `
      <div class="grid4">
        <div class="pill">能量 <b>${NT.fmt(t.calories)}</b> kcal</div>
        <div class="pill">蛋白质 <b>${NT.fmt(t.protein)}</b> g</div>
        <div class="pill">脂肪 <b>${NT.fmt(t.fat)}</b> g</div>
        <div class="pill">碳水 <b>${NT.fmt(t.carbs)}</b> g</div>
      </div>
    `;
  }

  // ========== 今日数据加载 ==========
  async function loadTodayMealsAndTotals() {
    const day = NT.todayStr();
    const dateEl = $("today_date");
    if (dateEl) dateEl.innerText = "· " + day;

    // 今日餐食
    try {
      const r = await NT.api(
        `/api/meals/day?date=${encodeURIComponent(day)}`
      );
      if (r.ok && r.data.ok) {
        renderMeals(r.data.meals || []);
      } else if (r.status === 401 || r.status === 403) {
        w.location.href = "/login";
        return;
      }
    } catch (e) {
      console.error("load meals failed", e);
    }

    // 今日汇总
    try {
      const s = await NT.api(
        `/api/meals/summary?date=${encodeURIComponent(day)}`
      );
      if (s.ok && s.data.ok) {
        renderTotals(s.data, "totals");
      } else if (s.status === 401 || s.status === 403) {
        w.location.href = "/login";
        return;
      }
    } catch (e) {
      console.error("load summary failed", e);
    }
  }

  // ========== 历史查询 ==========
  function initDaySelect() {
    const sel = $("day_select");
    if (!sel) return;

    sel.innerHTML = "";
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      const s = d.toISOString().slice(0, 10);
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    }
  }

  async function viewHistoryTotals() {
    const sel = $("day_select");
    const box = $("history_totals");
    if (!sel || !box) return;

    const day = sel.value;
    if (!day) return;

    box.innerHTML = '<div class="muted tiny">加载中…</div>';

    const r = await NT.api(
      `/api/meals/summary?date=${encodeURIComponent(day)}`
    );
    if (r.ok && r.data.ok) {
      renderTotals(r.data, "history_totals");
    } else {
      box.innerHTML =
        '<div class="error">加载失败：' +
        (r.data?.error || r.status) +
        "</div>";
    }
  }

  // ========== AI 分析输入 ==========
  function guessMealType(text) {
    if (!text) return null;
    if (/早餐|早饭|早上|morning/i.test(text)) return "早餐";
    if (/午餐|中午|午饭|中餐|lunch/i.test(text)) return "午餐";
    if (/晚餐|晚饭|晚上|dinner/i.test(text)) return "晚餐";
    if (/宵夜|夜宵/i.test(text)) return "宵夜";
    if (/加餐|间食|snack|下午茶/i.test(text)) return "加餐";
    if (/上午|早午餐|branch/i.test(text)) return "早午餐";
    if (/下午|下午餐/i.test(text)) return "下午餐";
    return null;
  }

  async function analyzeMeal() {
    const input = $("meal_input");
    const err = $("error");
    const out = $("analyze_result");
    if (!input || !input.value.trim()) {
      alert("请先输入本顿餐的描述");
      return;
    }

    const text = input.value.trim();
    const meal_type = guessMealType(text);

    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
    if (out) {
      out.textContent = "AI 正在分析并记录这顿餐…";
    }

    const r = await NT.api("/api/ai/analyze_meal", {
      method: "POST",
      body: JSON.stringify({ text, meal_type })
    });

    if (!r.ok || !r.data.ok) {
      if (err) {
        err.style.display = "block";
        err.textContent = r.data?.error || "分析失败";
      }
      if (out) out.textContent = "";
      return;
    }

    input.value = "";

    const meal = r.data.meal || {};
    const items = meal.items || [];
    const textList = items
      .map((it) => {
        const parts = [];
        parts.push(it.name || "未命名");
        if (it.quantity != null)
          parts.push(NT.fmt(it.quantity) + (it.unit || ""));
        if (it.calories != null)
          parts.push(NT.fmt(it.calories) + " kcal");
        return parts.join(" · ");
      })
      .join("； ");

    if (out) {
      out.textContent =
        (r.data.comment || "已记录这一餐。") +
        (textList ? " [" + textList + "]" : "");
    }

    await loadTodayMealsAndTotals();
  }

  // ========== 今日总结（AI） ==========
  async function generateTodaySummary() {
    const day = NT.todayStr();
    const block = $("today_summary_block");
    const content = $("today_summary_content");
    if (!block || !content) return;

    block.style.display = "block";
    content.innerHTML =
      '<div class="muted tiny">AI 正在生成 / 更新今日总结…</div>';

    const r = await NT.api("/api/ai/day_summary", {
      method: "POST",
      body: JSON.stringify({ date: day })
    });

    if (!r.ok || !r.data.ok) {
      content.innerHTML =
        '<div class="error">AI 总结失败：' +
        (r.data?.error || "") +
        "</div>";
      return;
    }

    if (r.data.totals) {
      renderTotals(r.data.totals, "totals");
    }

    content.innerHTML =
      `<p>${(r.data.summary || "").replace(
        /\n+/g,
        "<br>"
      )}</p>` +
      `<div class="muted tiny" style="margin-top:.3rem;">已为 ${day} 保存最新总结</div>`;
    block.style.display = "block";
  }

  async function loadExistingSummary() {
    const day = NT.todayStr();
    const block = $("today_summary_block");
    const content = $("today_summary_content");
    if (!block || !content) return;

    const r = await NT.api(
      `/api/ai/day_summary?date=${encodeURIComponent(day)}`
    );

    if (r.ok && r.data.ok && r.data.exists && r.data.summary) {
      if (r.data.totals) {
        // 注意这里使用统一的 renderTotals，不会把已有正确 totals 覆盖成空
        renderTotals(r.data.totals, "totals");
      }
      content.innerHTML = `<p>${r.data.summary.replace(
        /\n+/g,
        "<br>"
      )}</p>`;
      block.style.display = "block";
    } else {
      block.style.display = "none";
      content.innerHTML = "";
    }
  }

  // ========== 初始化绑定 ==========
  async function init() {
    const ok = await ensureAuthed();
    if (!ok) return;

    if ($("save_profile")) {
      $("save_profile").onclick = () => saveProfile(false);
    }
    if ($("m_save_profile")) {
      $("m_save_profile").onclick = () => saveProfile(true);
    }
    if ($("analyze")) {
      $("analyze").onclick = analyzeMeal;
    }
    if ($("summarize")) {
      $("summarize").onclick = generateTodaySummary;
    }
    if ($("view_day")) {
      $("view_day").onclick = viewHistoryTotals;
    }

    // 删除按钮事件委托
    const mealsBox = $("meals");
    if (mealsBox) {
      mealsBox.addEventListener("click", (e) => {
        const btn = e.target.closest("button.btn.danger[data-meal-id]");
        if (!btn) return;
        const id = btn.dataset.mealId;
        if (id) deleteMeal(id);
      });
    }

    initDaySelect();
    await loadProfile();
    await loadTodayMealsAndTotals();
    await loadExistingSummary();
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, window.NT);
