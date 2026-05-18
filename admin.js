// ── Data helpers ────────────────────────────────────────────────────────────

function getOrders() {
  try { return JSON.parse(localStorage.getItem("brood_orders")) || []; } catch { return []; }
}

function setOrders(orders) {
  localStorage.setItem("brood_orders", JSON.stringify(orders));
}

function getLimits() {
  try { return JSON.parse(localStorage.getItem("brood_limits")); } catch {}
  return { maxPerDay: 50, items: {} };
}

function setLimits(limits) {
  localStorage.setItem("brood_limits", JSON.stringify(limits));
}

// ── Render orders ───────────────────────────────────────────────────────────

const statusFilter = document.getElementById("order-filter-status");
const dateFilter = document.getElementById("order-filter-date");

function renderOrders() {
  const orders = getOrders();
  const list = document.getElementById("orders-list");
  const status = statusFilter.value;
  const date = dateFilter.value;

  const filtered = orders.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (date && o.date !== date) return false;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p class="admin-empty">No matching orders.</p>';
    return;
  }

  list.innerHTML = filtered.map((o, i) => {
    const idx = orders.findIndex((x) => x.id === o.id);
    const itemsHtml = o.items.map((item) =>
      `<div><span>${item.qty}×</span> ${item.name}${item.type ? " (" + item.type + ")" : ""}</div>`
    ).join("");

    return `
      <div class="order-card" data-idx="${idx}">
        <div class="order-card-header">
          <div>
            <span class="order-card-date">${o.date}</span>
            <span class="order-card-id">#${o.id.slice(-6)}</span>
          </div>
          <div>
            <span class="order-card-status ${o.status}">${o.status}</span>
            ${o.time ? `<span style="margin-left:0.5rem;font-size:0.85rem;color:var(--muted)">${o.time}</span>` : ""}
          </div>
        </div>
        <div class="order-card-contact">${o.customerName} — ${o.customerContact}</div>
        <div class="order-card-items">${itemsHtml}</div>
        <div style="font-weight:700;color:var(--brood-blue)">$${o.total.toFixed(2)}</div>
        ${o.notes ? `<div class="order-card-notes">${escapeHtml(o.notes)}</div>` : ""}
        <div class="order-card-actions">
          ${o.status !== "confirmed" ? `<button class="btn-confirm" data-action="confirm">Confirm</button>` : ""}
          ${o.status !== "declined" ? `<button class="btn-decline" data-action="decline">Decline</button>` : ""}
          <button class="btn-delete" data-action="delete">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".btn-confirm").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".order-card");
      const idx = parseInt(card.dataset.idx, 10);
      const orders = getOrders();
      orders[idx].status = "confirmed";
      setOrders(orders);
      renderOrders();
      showToast("Order confirmed");
    });
  });

  list.querySelectorAll(".btn-decline").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".order-card");
      const idx = parseInt(card.dataset.idx, 10);
      const orders = getOrders();
      orders[idx].status = "declined";
      setOrders(orders);
      renderOrders();
      showToast("Order declined");
    });
  });

  list.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".order-card");
      const idx = parseInt(card.dataset.idx, 10);
      const orders = getOrders();
      orders.splice(idx, 1);
      setOrders(orders);
      renderOrders();
      showToast("Order deleted");
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

// ── Limits tab ──────────────────────────────────────────────────────────────

const menuItems = [
  "Shio pans", "Croissants", "Pain au chocolat", "Focaccias",
  "Sourdoughs", "Shoku pans", "Baguette",
  "Cakes", "Pies", "Viennoiseries", "Brownies", "Cookies",
  "Cinnamon rolls and donuts", "Brioche loafs or buns"
];

function renderLimits() {
  const limits = getLimits();
  document.getElementById("limit-perday").value = limits.maxPerDay || 50;

  const container = document.getElementById("limit-items");
  container.innerHTML = menuItems.map((name) => {
    const val = (limits.items[name] && limits.items[name].max) || "";
    return `
      <div class="limit-item-row">
        <span>${name}</span>
        <input type="number" min="0" class="limit-item-input" data-name="${name}" value="${val}" placeholder="No limit">
      </div>
    `;
  }).join("");
}

document.getElementById("limit-perday").addEventListener("change", () => {
  const val = parseInt(document.getElementById("limit-perday").value, 10);
  if (val > 0) {
    const limits = getLimits();
    limits.maxPerDay = val;
    setLimits(limits);
  }
});

document.addEventListener("change", (e) => {
  if (e.target.classList.contains("limit-item-input")) {
    const name = e.target.dataset.name;
    const val = parseInt(e.target.value, 10);
    const limits = getLimits();
    if (val > 0) {
      limits.items[name] = { max: val };
    } else {
      delete limits.items[name];
    }
    setLimits(limits);
  }
});

document.querySelector(".admin-save-limits").addEventListener("click", () => {
  const maxPerDay = parseInt(document.getElementById("limit-perday").value, 10) || 50;
  const limits = { maxPerDay, items: {} };

  document.querySelectorAll(".limit-item-input").forEach((input) => {
    const val = parseInt(input.value, 10);
    if (val > 0) {
      limits.items[input.dataset.name] = { max: val };
    }
  });

  setLimits(limits);
  showToast("Limits saved");
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

// ── Init ────────────────────────────────────────────────────────────────────

renderOrders();
renderLimits();
