// static/js/common.js
(function (w) {
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {})
      },
      ...opts
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      // 非 JSON 响应就保持空对象，交给调用方决定
    }

    return {
      status: res.status,
      ok: res.ok,
      data
    };
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmt(x, unit = "") {
    if (x === null || x === undefined || x === "" || isNaN(x)) return "-";
    const v = Math.round(Number(x) * 10) / 10;
    return v + unit;
  }

  // 简单的 401 处理工具（按需在各页面用）
  function redirectIfUnauthed(result, loginPath = "/login") {
    if (result.status === 401 || result.status === 403) {
      window.location.href = loginPath;
      return true;
    }
    return false;
  }

  w.NT = { api, todayStr, fmt, redirectIfUnauthed };
})(window);
