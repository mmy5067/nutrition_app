// static/js/admin.js
(function (w, NT) {
  const $ = (sel) => document.querySelector(sel);

  async function deleteUser(id, email) {
    if (!confirm(`确认删除用户 ${email} (ID=${id}) 及其关联数据？`)) return;

    const res = await NT.api(`/admin/api/users/${id}/delete`, {
      method: "POST"
    });

    if (res.ok && res.data.ok) {
      const row = $(`#user_table tr[data-id="${id}"]`);
      if (row) row.remove();
      alert("已删除");
    } else {
      alert("删除失败：" + (res.data.error || res.status));
    }
  }

  async function genInvite() {
    const msg = $("#invite_msg");
    const list = $("#invite_list");
    msg.textContent = "生成中…";

    const res = await NT.api("/admin/api/invites/generate", { method: "POST" });
    if (res.ok && res.data.ok) {
      msg.textContent = "新邀请码已生成：";
      const line = document.createElement("div");
      line.textContent = res.data.code;
      list.prepend(line);
    } else {
      msg.textContent = "生成失败：" + (res.data.error || res.status);
    }
  }

  async function refreshSummary() {
    const res = await NT.api("/admin/api/summary");
    if (!res.ok || !res.data.ok) return;
    $("#stat_total_users").textContent = res.data.total_users;
    $("#stat_active_7d").textContent = res.data.active_users_7d;
    $("#stat_total_meals").textContent = res.data.total_meals;
    $("#stat_meals_24h").textContent = res.data.meals_24h;
  }

  function bindEvents() {
    // 事件委托：用户删除按钮
    const userTable = $("#user_table");
    if (userTable) {
      userTable.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-delete]");
        if (!btn) return;
        const id = btn.dataset.id;
        const email = btn.dataset.email;
        deleteUser(id, email);
      });
    }

    const inviteBtn = document.querySelector("[data-gen-invite]");
    if (inviteBtn) inviteBtn.onclick = genInvite;
  }

  function enhanceDom() {
    // 给删除按钮加 data 属性，避免内联 onclick
    document
      .querySelectorAll("#user_table button.btn-danger")
      .forEach((btn) => {
        const tr = btn.closest("tr");
        if (!tr) return;
        btn.removeAttribute("onclick");
        btn.dataset.delete = "1";
        btn.dataset.id = tr.dataset.id;
        btn.dataset.email = tr.children[1].textContent;
      });

    const inviteBtn = document.querySelector("button.btn-outline[onclick]");
    if (inviteBtn) {
      inviteBtn.removeAttribute("onclick");
      inviteBtn.dataset.genInvite = "1";
      inviteBtn.setAttribute("data-gen-invite", "1");
    }
  }

  function init() {
    enhanceDom();
    bindEvents();
    setInterval(refreshSummary, 30000);
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, window.NT);
