// ── Auth guard ──────────────────────────────────────────────────────────────

const adminLogin = document.getElementById("admin-login");
const adminMain = document.getElementById("admin-main");

function showAdmin() {
  adminLogin.style.display = "none";
  adminMain.style.display = "block";
  initAdmin();
}

function showLogin(msg) {
  adminLogin.style.display = "grid";
  adminMain.style.display = "none";
  if (msg) document.getElementById("admin-auth-error").textContent = msg;
}

document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const pw = document.getElementById("admin-password").value;
  document.getElementById("admin-auth-error").textContent = "";
  if (typeof logIn !== "function") {
    document.getElementById("admin-auth-error").textContent = "Firebase not configured. See firebase.js.";
    return;
  }
  try {
    await logIn(email, pw);
  } catch (err) {
    document.getElementById("admin-auth-error").textContent = err.message || "Sign in failed";
  }
});

if (typeof onAuthChanged === "function") {
  onAuthChanged((user) => {
    if (user) showAdmin(); else showLogin();
  });
} else {
  showLogin("Firebase not loaded. Configure firebase.js first.");
}

// ── Admin dashboard (Firestore) ─────────────────────────────────────────────

let allOrders = [];
let unsubOrders = null;
let unsubLimits = null;
let unsubPrices = null;

function initAdmin() {
  if (typeof listenOrders === "function") {
    if (unsubOrders) unsubOrders();
    unsubOrders = listenOrders((orders) => {
      allOrders = orders;
      renderOrders();
    });
  }

  if (typeof listenLimits === "function") {
    if (unsubLimits) unsubLimits();
    unsubLimits = listenLimits((limits) => {
      document.getElementById("limit-perday").value = limits.maxPerDay || 50;
      renderLimitItems(limits);
    });
  }

  if (typeof listenPrices === "function") {
    if (unsubPrices) unsubPrices();
    unsubPrices = listenPrices((prices) => {
      renderPricingItems(prices);
    });
  }
}

// ── Render orders ───────────────────────────────────────────────────────────

const statusFilter = document.getElementById("order-filter-status");
const dateFilter = document.getElementById("order-filter-date");

function renderOrders() {
  const list = document.getElementById("orders-list");
  const status = statusFilter.value;
  const date = dateFilter.value;

  const filtered = allOrders.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (date && o.date !== date) return false;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p class="admin-empty">No matching orders.</p>';
    return;
  }

  list.innerHTML = filtered.map((o) => {
    const itemsHtml = (o.items || []).map((item) =>
      `<div><span>${item.qty}×</span> ${item.name}${item.type ? " (" + item.type + ")" : ""}</div>`
    ).join("");

    return `
      <div class="order-card" data-id="${o.id}">
        <div class="order-card-header">
          <div>
            <span class="order-card-date">${o.date}</span>
            <span class="order-card-id">#${o.id ? o.id.slice(-6) : "---"}</span>
          </div>
          <div>
            <span class="order-card-status ${o.status}">${o.status}</span>
            ${o.time ? `<span style="margin-left:0.5rem;font-size:0.85rem;color:var(--muted)">${o.time}</span>` : ""}
          </div>
        </div>
        <div class="order-card-contact">${o.customerName || "?"} — ${o.customerContact || "?"}</div>
        <div class="order-card-items">${itemsHtml}</div>
        <div style="font-weight:700;color:var(--brood-blue)">$${(o.total || 0).toFixed(2)}</div>
        ${o.notes ? `<div class="order-card-notes">${escapeHtml(o.notes)}</div>` : ""}
        <div class="order-card-actions">
          ${o.status !== "confirmed" ? `<button class="btn-confirm" data-id="${o.id}">Confirm</button>` : ""}
          ${o.status !== "declined" ? `<button class="btn-decline" data-id="${o.id}">Decline</button>` : ""}
          <button class="btn-delete" data-id="${o.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".btn-confirm").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof updateOrderStatus === "function") {
        updateOrderStatus(btn.dataset.id, "confirmed");
        showToast("Order confirmed");
      }
    });
  });

  document.querySelectorAll(".btn-decline").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof updateOrderStatus === "function") {
        updateOrderStatus(btn.dataset.id, "declined");
        showToast("Order declined");
      }
    });
  });

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof deleteOrder === "function") {
        deleteOrder(btn.dataset.id);
        showToast("Order deleted");
      }
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

statusFilter.addEventListener("change", renderOrders);
dateFilter.addEventListener("change", renderOrders);

// ── Limits ──────────────────────────────────────────────────────────────────

const menuItems = [
  "Shio pans", "Croissants", "Pain au chocolat", "Focaccias",
  "Sourdoughs", "Shoku pans", "Baguette",
  "Cakes", "Pies", "Viennoiseries", "Brownies", "Cookies",
  "Cinnamon rolls and donuts", "Brioche loafs", "Brioche buns"
];

function renderLimitItems(limits) {
  const container = document.getElementById("limit-items");
  container.innerHTML = menuItems.map((name) => {
    const val = (limits.items && limits.items[name] && limits.items[name].max) || "";
    return `
      <div class="limit-item-row">
        <span>${name}</span>
        <input type="number" min="0" class="limit-item-input" data-name="${name}" value="${val}" placeholder="No limit">
      </div>
    `;
  }).join("");
}

document.querySelector(".admin-save-limits").addEventListener("click", () => {
  const maxPerDay = parseInt(document.getElementById("limit-perday").value, 10) || 50;
  const items = {};
  document.querySelectorAll(".limit-item-input").forEach((input) => {
    const qty = parseInt(input.value, 10);
    items[input.dataset.name] = { max: Number.isFinite(qty) ? Math.max(0, qty) : 0 };
  });

  if (typeof saveLimits === "function") {
    saveLimits({ maxPerDay, items })
      .then(() => showToast("Limits saved"))
      .catch((err) => showToast("Save failed: " + (err.message || err)));
  }
});

// ── Pricing ──────────────────────────────────────────────────────────────────

const defaultPrices = {
  "Shio pans": 4.00, "Croissants": 4.50, "Pain au chocolat": 5.00, "Focaccias": 6.00,
  "Sourdoughs": 7.00, "Shoku pans": 6.00, "Baguette": 4.00,
  "Cakes": 25.00, "Pies": 20.00, "Viennoiseries": 3.50, "Brownies": 4.50, "Cookies": 3.00,
  "Cinnamon rolls and donuts": 4.00, "Brioche loafs": 6.00, "Brioche buns": 5.00
};

function renderPricingItems(prices) {
  const container = document.getElementById("pricing-items");
  if (!container) return;
  const saved = prices.items || {};
  container.innerHTML = menuItems.map((name) => {
    const val = (saved[name] && saved[name].price) || defaultPrices[name] || "";
    return `
      <div class="limit-item-row">
        <span>${name}</span>
        <input type="number" min="0" step="0.50" class="pricing-item-input" data-name="${name}" value="${val}" placeholder="0.00">
      </div>
    `;
  }).join("");
}

document.getElementById("save-pricing")?.addEventListener("click", () => {
  const items = {};
  document.querySelectorAll(".pricing-item-input").forEach((input) => {
    const val = parseFloat(input.value);
    items[input.dataset.name] = { price: Number.isFinite(val) ? Math.max(0, val) : 0 };
  });

  if (typeof savePrices === "function") {
    savePrices({ items })
      .then(() => showToast("Prices saved"))
      .catch((err) => showToast("Save failed: " + (err.message || err)));
  }
});

// ── Tab switching ───────────────────────────────────────────────────────────

document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-nav-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
    document.getElementById("tab-" + btn.dataset.tab).classList.add("is-active");
  });
});

// ── Toast ───────────────────────────────────────────────────────────────────

let toastTimer;

function showToast(msg) {
  const el = document.getElementById("admin-toast") || (() => {
    const t = document.createElement("div");
    t.id = "admin-toast";
    t.className = "admin-toast";
    document.body.appendChild(t);
    return t;
  })();

  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2000);
}
