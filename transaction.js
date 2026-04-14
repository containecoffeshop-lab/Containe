// transaction.js (final, stabil, backward-compatible)
// Tidak menghapus fungsi yang sudah ada — hanya menambahkan pengecekan, logging, dan handling error lebih baik.

console.log("[transaction] script loaded (final)");

let selectedMenu = null;

// Helper: generate order id sederhana
function generateOrderId() {
  return "ORD-" + Date.now();
}

function printReceipt(orderData) {
  try {
    console.log("[transaction] redirecting to receipt.html", orderData);
    // Simpan data ke localStorage agar bisa diakses di receipt.html
    localStorage.setItem("lastOrder", JSON.stringify(orderData));
    // Buka halaman receipt.html
    window.open("receipt.html", "_blank");
  } catch (err) {
    console.error("[transaction] printReceipt error:", err);
  }
}
// Small helper to send form-encoded POST (avoid preflight)
async function sendFormPost(endpoint, obj, timeout = 15000) {
  const form = new URLSearchParams();
  form.append("payload", JSON.stringify(obj));

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: controller.signal
    });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Utility: safely attach listener (avoid duplicates)
function safeAttach(el, event, handler) {
  if (!el) return false;
  // remove previous by cloning node (simple and reliable)
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
  clone.addEventListener(event, handler);
  return true;
}

// Init module
function initTransactionModule() {
  console.log("[transaction] initTransactionModule running");

  try {
    const cards = document.querySelectorAll(".glass-card");
    if (!cards || cards.length === 0) {
      console.warn("[transaction] no .glass-card found");
    } else {
      cards.forEach(card => {
        // guard dataset
        const category = card.dataset ? card.dataset.category : null;
        console.log("[transaction] attach click to category card:", category);
        card.addEventListener("click", () => {
          try {
            const mp = document.getElementById("menupopup");
            if (mp) mp.style.display = "flex";
            const title = document.getElementById("popupTitle");
            if (title) title.innerText = card.innerText || "";
            loadCategoryMenu(category);
            loadOptions();
          } catch (err) {
            console.error("[transaction] error opening menupopup:", err);
          }
        });
      });
    }

    const closeBtn = document.getElementById("closePopup");
    if (closeBtn) {
      safeAttach(closeBtn, "click", () => {
        const mp = document.getElementById("menupopup");
        if (mp) mp.style.display = "none";
        selectedMenu = null;
        const od = document.getElementById("orderDetail");
        if (od) od.innerHTML = "";
        const tp = document.getElementById("totalPrice");
        if (tp) tp.innerText = "Rp 0";
        console.log("[transaction] menupopup closed");
      });
      console.log("[transaction] closePopup listener attached");
    } else console.log("[transaction] closePopup not found");

    const submitBtn = document.getElementById("submitOrder");
    if (submitBtn) {
      safeAttach(submitBtn, "click", submitOrder);
      console.log("[transaction] submitOrder listener attached");
    } else console.log("[transaction] submitOrder button not found");

    const closeVer = document.getElementById("closeVerification");
    if (closeVer) {
      safeAttach(closeVer, "click", () => {
        const vp = document.getElementById("verificationPopup");
        if (vp) vp.style.display = "none";
        console.log("[transaction] verificationPopup closed via closeVerification");
      });
      console.log("[transaction] closeVerification listener attached");
    }
  } catch (err) {
    console.error("[transaction] initTransactionModule error:", err);
  }
}

// Load menu by category
async function loadCategoryMenu(categoryId) {
  console.log("[transaction] loadCategoryMenu:", categoryId);
  const list = document.getElementById("popupMenuList");
  if (!list) {
    console.warn("[transaction] popupMenuList not found");
    return;
  }
  list.innerHTML = "<p>Loading...</p>";
  try {
    const endpoint = `${window._POS_BASE_URL || baseUrl}?action=getMenuItems`;
    const response = await fetch(endpoint);
    const result = await response.json();
    console.log("[transaction] getMenuItems result:", result);
    list.innerHTML = "";

    if (!Array.isArray(result)) {
      list.innerHTML = "<p>No menu data</p>";
      return;
    }

    for (let i = 1; i < result.length; i++) {
      const item = result[i];
      const menuId = item[0];
      const menuName = item[2];
      const category = item[3];
      const price = parseInt(item[4]) || 0;

      if (category === categoryId) {
        const card = document.createElement("div");
        card.classList.add("menu-card");
        card.innerHTML = `<h3>${menuName}</h3><p>Rp ${price.toLocaleString()}</p>`;
        card.addEventListener("click", () => selectMenu({menuId, menuName, price}));
        list.appendChild(card);
      }
    }
  } catch (error) {
    console.error("[transaction] Error loadCategoryMenu:", error);
    list.innerHTML = "<p>Error load data</p>";
  }
}

// Select menu
function selectMenu(menu) {
  try {
    console.log("[transaction] selectMenu:", menu);
    selectedMenu = menu;
    const od = document.getElementById("orderDetail");
    if (od) od.innerHTML = `<strong>${menu.menuName}</strong><br>Harga dasar: Rp ${menu.price.toLocaleString()}`;
    const qtyEl = document.getElementById("quantityInput");
    if (qtyEl) qtyEl.value = 1;
    updateTotal();
  } catch (err) {
    console.error("[transaction] selectMenu error:", err);
  }
}

// Load options (size/type/topping)
async function loadOptions() {
  console.log("[transaction] loadOptions called");
  try {
    const qtyEl = document.getElementById("quantityInput");
    if (qtyEl) {
      // ensure single listener
      safeAttach(qtyEl, "input", updateTotal);
    }

    // Size
    try {
      const sizeRes = await fetch(`${window._POS_BASE_URL || baseUrl}?action=getSize`);
      const sizeData = await sizeRes.json();
      const sizeSelect = document.getElementById("sizeSelect");
      if (sizeSelect) {
        sizeSelect.innerHTML = "";
        if (Array.isArray(sizeData)) {
          sizeData.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s[0] || "";
            opt.dataset.price = s[2] || 0;
            opt.textContent = s[1] || "";
            sizeSelect.appendChild(opt);
          });
        }
      } else console.warn("[transaction] sizeSelect not found");
    } catch (err) {
      console.error("[transaction] Gagal load size:", err);
    }

    // Type
    try {
      const typeRes = await fetch(`${window._POS_BASE_URL || baseUrl}?action=getType`);
      const typeData = await typeRes.json();
      const typeSelect = document.getElementById("typeSelect");
      if (typeSelect) {
        typeSelect.innerHTML = "";
        if (Array.isArray(typeData)) {
          typeData.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t[0] || "";
            opt.dataset.price = t[2] || 0;
            opt.textContent = t[1] || "";
            typeSelect.appendChild(opt);
          });
        }
      } else console.warn("[transaction] typeSelect not found");
    } catch (err) {
      console.error("[transaction] Gagal load type:", err);
    }

    // Topping
    try {
      const toppingRes = await fetch(`${window._POS_BASE_URL || baseUrl}?action=getTopping`);
      const toppingData = await toppingRes.json();
      const toppingGrid = document.getElementById("toppingGrid");
      if (toppingGrid) {
        toppingGrid.innerHTML = "";
        if (Array.isArray(toppingData)) {
          toppingData.forEach(tp => {
            const card = document.createElement("div");
            card.classList.add("topping-card");
            card.dataset.id = tp[0] || "";
            card.dataset.price = tp[2] || 0;
            card.innerText = tp[1] || "";
            card.addEventListener("click", () => {
              card.classList.toggle("active");
              updateTotal();
            });
            toppingGrid.appendChild(card);
          });
        }
      } else console.warn("[transaction] toppingGrid not found");
    } catch (err) {
      console.error("[transaction] Gagal load topping:", err);
    }
  } catch (err) {
    console.error("[transaction] loadOptions error:", err);
  }
}

function updateTotal() {
  try {
    if (!selectedMenu) {
      const tp = document.getElementById("totalPrice");
      if (tp) tp.innerText = "Rp 0";
      return;
    }
    let total = selectedMenu.price || 0;

    const sizeSelect = document.getElementById("sizeSelect");
    if (sizeSelect && sizeSelect.value) {
      const opt = sizeSelect.options[sizeSelect.selectedIndex];
      total += parseInt(opt.dataset.price || 0);
    }

    const typeSelect = document.getElementById("typeSelect");
    if (typeSelect && typeSelect.value) {
      const opt = typeSelect.options[typeSelect.selectedIndex];
      total += parseInt(opt.dataset.price || 0);
    }

    document.querySelectorAll("#toppingGrid .topping-card.active").forEach(card => {
      total += parseInt(card.dataset.price || 0);
    });

    const qtyEl = document.getElementById("quantityInput");
    const qty = qtyEl ? parseInt(qtyEl.value || 1) : 1;
    total = total * qty;

    const tp = document.getElementById("totalPrice");
    if (tp) tp.innerText = "Rp " + total.toLocaleString();
  } catch (err) {
    console.error("[transaction] updateTotal error:", err);
  }
}

// Submit order (open verification)
async function submitOrder() {
  try {
    console.log("[transaction] submitOrder called");
    if (!selectedMenu) {
      alert("Pilih menu terlebih dahulu!");
      return;
    }

    const sizeSelect = document.getElementById("sizeSelect");
    const typeSelect = document.getElementById("typeSelect");
    const qty = parseInt(document.getElementById("quantityInput").value || 1);
    const total = document.getElementById("totalPrice").innerText || "Rp 0";

    let toppings = [];
    document.querySelectorAll("#toppingGrid .topping-card.active").forEach(card => {
      toppings.push(card.dataset.id);
    });

    const orderData = {
      orderId: generateOrderId(),
      date: new Date().toLocaleString(),
      menuId: selectedMenu.menuId,
      menuName: selectedMenu.menuName,
      sizeId: sizeSelect ? sizeSelect.value : "",
      typeId: typeSelect ? typeSelect.value : "",
      toppingIds: toppings.join(","),
      quantity: qty,
      totalPrice: total,
      statusOrder: "Selesai"
    };

    console.log("[transaction] submitOrder prepared orderData:", orderData);

    // close popup transaksi, open verification
    const mp = document.getElementById("menupopup");
    if (mp) mp.style.display = "none";
    const vp = document.getElementById("verificationPopup");
    if (vp) vp.style.display = "flex";

    const summaryEl = document.getElementById("orderSummary");
    if (summaryEl) {
      summaryEl.innerHTML = `
        <p><strong>${orderData.menuName}</strong></p>
        <p>Size: ${orderData.sizeId || "-"}</p>
        <p>Type: ${orderData.typeId || "-"}</p>
        <p>Topping: ${orderData.toppingIds || "-"}</p>
        <p>Jumlah: ${orderData.quantity}</p>
        <p>Total: ${orderData.totalPrice}</p>
      `;
    }

    // attach payment input listener (replace to avoid duplicates)
    const paymentInput = document.getElementById("paymentInput");
    if (paymentInput) {
      const newPayment = paymentInput.cloneNode(true);
      paymentInput.parentNode.replaceChild(newPayment, paymentInput);
      newPayment.addEventListener("input", () => {
        const bayar = parseInt(newPayment.value || 0);
        const totalNum = parseInt(orderData.totalPrice.replace(/\D/g, "")) || 0;
        const kembali = bayar - totalNum;
        const changeDisplay = document.getElementById("changeDisplay");
        if (changeDisplay) changeDisplay.innerText =
          "Kembalian: Rp " + (kembali > 0 ? kembali.toLocaleString() : 0);
      });
    }

    // attach finalize handler (form-encoded POST)
    const finalizeBtn = document.getElementById("finalizeOrder");
    if (finalizeBtn) {
      safeAttach(finalizeBtn, "click", async () => {
        console.log("[transaction] finalizeOrder clicked (form-encoded)");
        const customerName = (document.getElementById("customerName") || {}).value || "Tanpa Nama";
        orderData.customerName = customerName;

        const endpoint = (window._POS_BASE_URL || baseUrl) + "?action=createOrder";
        console.log("[transaction] sending createOrder to", endpoint, "payload:", orderData);

        try {
          const resp = await sendFormPost(endpoint, orderData);
          const text = await resp.text();
          console.log("[transaction] createOrder response text:", text);

          let json = null;
          try { json = JSON.parse(text); } catch(e) { /* not JSON */ }

          if (!resp.ok) {
            const msg = (json && json.message) ? json.message : text || `HTTP ${resp.status}`;
            alert("Gagal menyimpan order: " + msg);
            return;
          }

          console.log("[transaction] createOrder success:", json || text);
          printReceipt(orderData);

          const vp2 = document.getElementById("verificationPopup");
          if (vp2) vp2.style.display = "none";

          // reset UI
          selectedMenu = null;
          const orderDetail = document.getElementById("orderDetail");
          if (orderDetail) orderDetail.innerHTML = "";
          const totalPriceEl = document.getElementById("totalPrice");
          if (totalPriceEl) totalPriceEl.innerText = "Rp 0";
        } catch (err) {
          console.error("[transaction] finalizeOrder fetch error:", err);
          alert("Gagal menyimpan order: " + (err.message || "Network error"));
        }
      });
      console.log("[transaction] finalizeOrder handler attached (form-encoded)");
    } else console.log("[transaction] finalizeOrder button not found");
  } catch (err) {
    console.error("[transaction] submitOrder error:", err);
  }
}

// Run on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initTransactionModule();
  console.log("[transaction] DOMContentLoaded -> initTransactionModule called");
});