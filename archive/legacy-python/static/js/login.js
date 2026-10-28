// static/js/login.js
(function (w, NT) {
  const $ = (id) => document.getElementById(id);

  function switchTab(which) {
    const tl = $("tab_login");
    const tr = $("tab_register");
    const pl = $("panel_login");
    const pr = $("panel_register");
    if (which === "login") {
      tl.classList.add("active");
      tr.classList.remove("active");
      pl.style.display = "block";
      pr.style.display = "none";
    } else {
      tr.classList.add("active");
      tl.classList.remove("active");
      pr.style.display = "block";
      pl.style.display = "none";
    }
  }

  async function doLogin() {
    const email = $("login_email").value.trim();
    const password = $("login_password").value;
    const msg = $("login_msg");
    msg.className = "muted";
    msg.textContent = "登录中…";

    const { status, data } = await NT.api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (status === 200 && data.ok) {
      msg.className = "ok";
      msg.textContent = "登录成功，正在跳转…";
      window.location.href = "/";
    } else {
      msg.className = "error";
      msg.textContent = data.error || "登录失败，请检查邮箱或密码";
    }
  }

  async function doRegister() {
    const email = $("reg_email").value.trim();
    const password = $("reg_password").value;
    const invite_code = $("reg_code").value.trim();
    const msg = $("reg_msg");
    msg.className = "muted";
    msg.textContent = "注册中…";

    const { status, data } = await NT.api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, invite_code })
    });

    if (status === 200 && data.ok) {
      msg.className = "ok";
      msg.textContent = "注册成功，自动登录中…";
      const loginRes = await NT.api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (loginRes.status === 200 && loginRes.data.ok) {
        window.location.href = "/";
      } else {
        msg.className = "error";
        msg.textContent = "注册成功但登录失败，请手动登录。";
      }
    } else {
      msg.className = "error";
      msg.textContent = data.error || "注册失败，请检查邀请码或邮箱是否已被使用";
    }
  }

  function init() {
    $("tab_login").onclick = () => switchTab("login");
    $("tab_register").onclick = () => switchTab("register");
    $("btn_login").onclick = doLogin;
    $("btn_register").onclick = doRegister;
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, window.NT);
