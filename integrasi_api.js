// integrasi_api.js (final)
const baseUrl = "https://script.google.com/macros/s/AKfycbxAcAW-3S5QYK9SqhfBVPmE6Z-5CUvsvXh-JhH-RTadriN-1z5JDD2hqs0QUsZ4zeTj/exec";
window._POS_BASE_URL = baseUrl;

function fetchWithTimeout(url, opts = {}, timeout = 15000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeout))
  ]);
}

function sendFormPost(endpoint, obj, timeout = 15000) {
  const form = new URLSearchParams();
  form.append("payload", JSON.stringify(obj));
  return fetchWithTimeout(endpoint, {
    method: "POST",
    body: form
  }, timeout);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[integrasi_api] DOMContentLoaded");

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", login);
    console.log("[integrasi_api] loginBtn listener attached");
  } else console.log("[integrasi_api] loginBtn not found");

  const transBtn = document.getElementById("transBtn");
  if (transBtn) {
    transBtn.addEventListener("click", createTransaction);
    console.log("[integrasi_api] transBtn listener attached");
  } else console.log("[integrasi_api] transBtn not found");

  const stockBtn = document.getElementById("stockBtn");
  if (stockBtn) {
    stockBtn.addEventListener("click", updateStockMovement);
    console.log("[integrasi_api] stockBtn listener attached");
  } else console.log("[integrasi_api] stockBtn not found");

  const closeBtn = document.getElementById("closePopup");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const mp = document.getElementById("menupopup");
      if (mp) mp.style.display = "none";
      console.log("[integrasi_api] closePopup clicked, menupopup hidden");
    });
    console.log("[integrasi_api] closePopup listener attached");
  } else console.log("[integrasi_api] closePopup not found");
});

// ===== LOGIN (GET) =====
async function login() {
  console.log("[integrasi_api] login() called");
  const usernameEl = document.getElementById("username");
  const pinEl = document.getElementById("pin");
  if (!usernameEl || !pinEl) {
    console.error("[integrasi_api] login inputs not found");
    return;
  }
  const username = usernameEl.value;
  const pin = pinEl.value;

  try {
    const response = await fetch(
      `${baseUrl}?action=login&username=${encodeURIComponent(username)}&pin=${encodeURIComponent(pin)}`
    );
    const result = await response.json();
    console.log("[integrasi_api] Login response:", result);

    const outEl = document.getElementById("loginResult");
    if (result.status === "success") {
      if (outEl) outEl.innerText = "Login berhasil!";
      window.location.href = "dashboard.html";
    } else {
      if (outEl) outEl.innerText = "Login gagal!";
    }
  } catch (error) {
    console.error("[integrasi_api] Error saat login:", error);
    const outEl = document.getElementById("loginResult");
    if (outEl) outEl.innerText = "Terjadi error: " + error.message;
  }
}

// ===== MENU ITEMS (GET) =====
async function loadMenuItems() {
  console.log("[integrasi_api] loadMenuItems() called");
  try {
    const response = await fetch(`${baseUrl}?action=getMenuItems`);
    const result = await response.json();
    console.log("[integrasi_api] Menu Items response:", result);

    const menuList = document.getElementById("menuList");
    if (!menuList) {
      console.warn("[integrasi_api] #menuList not found");
      return;
    }
    menuList.innerHTML = "";

    if (result.status === "fail") {
      menuList.innerText = result.message;
      return;
    }

    for (let i = 1; i < result.length; i++) {
      const item = result[i];
      const li = document.createElement("li");
      li.innerText = item[1] + " - Rp" + item[2];
      menuList.appendChild(li);
    }
  } catch (error) {
    console.error("[integrasi_api] Error saat load menu:", error);
    const menuList = document.getElementById("menuList");
    if (menuList) menuList.innerText = "Terjadi error: " + error.message;
  }
}

// ===== TRANSACTION (form-encoded POST) =====
async function createTransaction() {
  console.log("[integrasi_api] createTransaction() called");
  const data = {
    transaction_id: "T001",
    transaction_number: "INV-001",
    order_type: "Dine-In",
    table_no: "5",
    user_id: "U001",
    total_amount: 50000
  };

  try {
    const endpoint = `${baseUrl}?action=createTransaction`;
    console.log("[integrasi_api] createTransaction endpoint:", endpoint, "payload:", data);
    const resp = await sendFormPost(endpoint, data);
    const text = await resp.text();
    console.log("[integrasi_api] createTransaction response:", resp.status, text);

    const out = document.getElementById("transResult");
    if (resp.ok) {
      if (out) out.innerText = "Transaksi berhasil dikirim!";
    } else {
      if (out) out.innerText = "Gagal: " + text;
    }
  } catch (error) {
    console.error("[integrasi_api] Error saat transaksi:", error);
    const out = document.getElementById("transResult");
    if (out) out.innerText = "Terjadi error: " + error.message;
  }
}

// ===== STOCK MOVEMENTS (form-encoded POST) =====
async function updateStockMovement() {
  console.log("[integrasi_api] updateStockMovement() called");
  const itemIdEl = document.getElementById("itemId");
  const newStockEl = document.getElementById("newStock");
  if (!itemIdEl || !newStockEl) {
    console.warn("[integrasi_api] stock inputs not found");
    return;
  }
  const itemId = itemIdEl.value;
  const newStock = newStockEl.value;

  try {
    const endpoint = `${baseUrl}?action=createStockMovement`;
    console.log("[integrasi_api] updateStockMovement endpoint:", endpoint, "payload:", { item_id: itemId, quantity: newStock });
    const resp = await sendFormPost(endpoint, { item_id: itemId, quantity: newStock });
    const text = await resp.text();
    console.log("[integrasi_api] Update stock response:", resp.status, text);

    const out = document.getElementById("stockResult");
    if (resp.ok) {
      let json = null;
      try { json = JSON.parse(text); } catch(e) {}
      if (out) out.innerText = (json && json.message) ? json.message : "Stock updated";
    } else {
      if (out) out.innerText = "Gagal: " + text;
    }
  } catch (error) {
    console.error("[integrasi_api] Error saat update stock:", error);
    const out = document.getElementById("stockResult");
    if (out) out.innerText = "Terjadi error: " + error.message;
  }
}