const cornerMenu = document.querySelector(".corner-menu");
const menuTrigger = document.querySelector(".menu-trigger");
const menuLinks = document.querySelectorAll(".menu-panel a");
let menuCloseTimer;

function setMenuState(isOpen) {
  cornerMenu.classList.toggle("is-open", isOpen);
  menuTrigger.setAttribute("aria-expanded", String(isOpen));
}

function cancelMenuClose() {
  clearTimeout(menuCloseTimer);
}

function scheduleMenuClose() {
  cancelMenuClose();
  menuCloseTimer = setTimeout(() => setMenuState(false), 300);
}

menuTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  cancelMenuClose();
  setMenuState(!cornerMenu.classList.contains("is-open"));
});

// ── Currency & pricing ───────────────────────────────────────────────────────

const currencies = {
  USD: { symbol: "$", rate: 1 },
  EUR: { symbol: "€", rate: 0.92 },
  THB: { symbol: "฿", rate: 34 }
};
let currentCurrency = localStorage.getItem("brood_currency") || "USD";

function formatPrice(usdPrice) {
  const c = currencies[currentCurrency];
  return c.symbol + (usdPrice * c.rate).toFixed(2);
}

const currencySelect = document.getElementById("currency-select");
if (currencySelect) {
  currencySelect.value = currentCurrency;
  currencySelect.addEventListener("change", () => {
    currentCurrency = currencySelect.value;
    localStorage.setItem("brood_currency", currentCurrency);
    renderBasket();
    document.querySelectorAll(".popup-add").forEach((btn) => {
      const m = btn.textContent.match(/^(.*?—)\s*.+/);
      if (m) {
        const price = parseFloat(btn.dataset.usdPrice);
        if (Number.isFinite(price)) btn.textContent = m[1] + " " + formatPrice(price);
      }
    });
  });
}

function loadPrices() {
  try {
    const cached = JSON.parse(localStorage.getItem("brood_prices"));
    if (cached && typeof cached.items === "object") applyPrices(cached.items);
  } catch {}
  if (typeof listenPrices === "function") {
    listenPrices((prices) => {
      if (prices && prices.items) {
        localStorage.setItem("brood_prices", JSON.stringify(prices));
        applyPrices(prices.items);
      }
    });
  }
}

function applyPrices(items) {
  document.querySelectorAll(".menu-card").forEach((card) => {
    const name = card.querySelector(".card-body h4").textContent;
    if (items[name] && Number.isFinite(items[name].price)) {
      card.dataset.price = items[name].price;
    }
  });
  document.querySelectorAll(".popup-add").forEach((btn) => {
    const price = parseFloat(btn.dataset.usdPrice);
    if (Number.isFinite(price)) {
      const m = btn.textContent.match(/^(.*?—)\s*.+/);
      if (m) btn.textContent = m[1] + " " + formatPrice(price);
    }
  });
}

menuTrigger.addEventListener("mouseenter", () => {
  cancelMenuClose();
  setMenuState(true);
});

menuTrigger.addEventListener("mouseleave", () => {
  scheduleMenuClose();
});

const menuPanel = document.querySelector(".menu-panel");
menuPanel.addEventListener("mouseenter", cancelMenuClose);
menuPanel.addEventListener("mouseleave", scheduleMenuClose);

menuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setMenuState(false);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuState(false);
    menuTrigger.blur();
  }
});

document.addEventListener("click", (event) => {
  if (!cornerMenu.contains(event.target)) {
    setMenuState(false);
  }
});

(function() {
  const slideshow = document.querySelector(".menu-slideshow");
  const images = [...document.querySelectorAll(".menu-card .card-img img")].map(i => i.src);
  if (!slideshow || images.length === 0) return;

  images.forEach((src) => {
    const div = document.createElement("div");
    div.className = "slide-bg";
    div.style.backgroundImage = `url(${src})`;
    slideshow.appendChild(div);
  });

  const slides = slideshow.querySelectorAll(".slide-bg");
  slides[0].classList.add("is-active");

  let current = 0;
  setInterval(() => {
    slides[current].classList.remove("is-active");
    current = (current + 1) % slides.length;
    slides[current].classList.add("is-active");
  }, 5000);
})();

const basket = [];
const basketSidebar = document.querySelector(".basket-sidebar");
const basketPanel = basketSidebar.querySelector(".basket-panel");
const basketItems = basketSidebar.querySelector(".basket-items");
const basketTotal = basketSidebar.querySelector(".total-price");
const basketCount = document.querySelector(".basket-count");
const basketToggle = document.querySelector(".basket-toggle");

function renderBasket() {
  basketItems.innerHTML = "";

  if (basket.length === 0) {
    basketItems.innerHTML = '<p class="basket-empty">Your basket is empty</p>';
    basketTotal.textContent = formatPrice(0);
    basketCount.textContent = "0";
    basketToggle.classList.remove("is-visible");
    return;
  }

  let total = 0;
  let count = 0;

  basket.forEach((item, index) => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    count += item.qty;

    const div = document.createElement("div");
    div.className = "basket-item";

    div.innerHTML = `
      <span class="basket-item-name">${item.name}</span>
      <span class="basket-item-price">${formatPrice(lineTotal)}</span>
      ${item.type ? `<span class="basket-item-type">${item.type}</span>` : ""}
      <div class="basket-item-actions">
        <button class="item-minus" data-index="${index}" aria-label="Decrease quantity">&minus;</button>
        <span class="item-qty">${item.qty}</span>
        <button class="item-plus" data-index="${index}" aria-label="Increase quantity">+</button>
        <button class="basket-item-remove" data-index="${index}">Remove</button>
      </div>
    `;

    basketItems.appendChild(div);
  });

  basketTotal.textContent = formatPrice(total);
  basketCount.textContent = count;
  basketToggle.classList.add("is-visible");

  basketItems.querySelectorAll(".item-minus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.index, 10);
      if (basket[i].qty > 1) {
        basket[i].qty--;
      } else {
        basket.splice(i, 1);
      }
      renderBasket();
    });
  });

  basketItems.querySelectorAll(".item-plus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.index, 10);
      basket[i].qty++;
      renderBasket();
    });
  });

  basketItems.querySelectorAll(".basket-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.index, 10);
      basket.splice(i, 1);
      renderBasket();
    });
  });

  const summaryEl = document.querySelector(".order-basket-summary");
  if (summaryEl) {
    const items = basket.map((i) => `${i.qty}× ${i.name}`).join(", ");
    summaryEl.textContent = count > 0 ? `${count} item${count !== 1 ? "s" : ""}` : "0 items";
    if (count > 0) {
      summaryEl.textContent += ` — ${formatPrice(total)}`;
    }
  }
}

function openBasket() {
  basketSidebar.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeBasket() {
  basketSidebar.classList.remove("is-open");
  document.body.style.overflow = "";
}

basketSidebar.querySelector(".basket-backdrop").addEventListener("click", closeBasket);
basketSidebar.querySelector(".basket-close").addEventListener("click", closeBasket);
basketToggle.addEventListener("click", openBasket);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && basketSidebar.classList.contains("is-open")) {
    closeBasket();
  }
});

document.querySelectorAll(".menu-card").forEach((card) => {
  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    const imgEl = card.querySelector(".card-img img");
    const name = card.querySelector(".card-body h4").textContent;
    const desc = card.querySelector(".card-body p").textContent;
    const price = parseFloat(card.dataset.price) || 0;
    let types = [];
    try { types = JSON.parse(card.dataset.types) || []; } catch (e) {}

    const popup = document.createElement("div");
    popup.className = "order-popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("aria-label", `Order ${name}`);

    const imgHTML = imgEl
      ? `<img src="${imgEl.src}" alt="${name}">`
      : `<div class="popup-placeholder" style="aspect-ratio:1;display:grid;place-items:center;background:var(--paper-warm);"><span style="color:var(--muted);font-size:0.85rem;text-align:center;padding:0.5rem;">Photo coming soon</span></div>`;

    let selectedType = types.length > 0 ? types[0] : "";

    const typesHTML = types.length > 0
      ? `<div class="popup-types">${types.map((t, i) =>
          `<button class="popup-type-btn${i === 0 ? " is-selected" : ""}" data-type="${t}" type="button">${t}</button>`
        ).join("")}</div>`
      : "";

    popup.innerHTML = `
      <div class="popup-backdrop"></div>
      <div class="popup-content">
        <button class="popup-close" type="button" aria-label="Close">&times;</button>
        <div class="popup-image">${imgHTML}</div>
        <div class="popup-body">
          <h3>${name}</h3>
          <p>${desc}</p>
          ${typesHTML}
          <div class="popup-qty">
            <button class="qty-btn qty-minus" type="button" aria-label="Decrease quantity">&minus;</button>
            <span class="qty-value">1</span>
            <button class="qty-btn qty-plus" type="button" aria-label="Increase quantity">+</button>
          </div>
          <button class="popup-add" type="button" data-usd-price="${price}">Add to order — ${formatPrice(price)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    document.body.style.overflow = "hidden";

    const closePopup = () => {
      popup.remove();
      document.body.style.overflow = "";
    };

    popup.querySelector(".popup-backdrop").addEventListener("click", closePopup);
    popup.querySelector(".popup-close").addEventListener("click", closePopup);

    popup.querySelectorAll(".popup-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        popup.querySelectorAll(".popup-type-btn").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        selectedType = btn.dataset.type;
      });
    });

    const qtyEl = popup.querySelector(".qty-value");
    popup.querySelector(".qty-minus").addEventListener("click", () => {
      const val = parseInt(qtyEl.textContent, 10);
      if (val > 1) qtyEl.textContent = val - 1;
    });
    popup.querySelector(".qty-plus").addEventListener("click", () => {
      qtyEl.textContent = parseInt(qtyEl.textContent, 10) + 1;
    });

    popup.querySelector(".popup-add").addEventListener("click", () => {
      const qty = parseInt(qtyEl.textContent, 10);
      const existing = basket.findIndex(
        (item) => item.name === name && item.type === selectedType
      );
      if (existing !== -1) {
        basket[existing].qty += qty;
      } else {
        basket.push({ name, type: selectedType, qty, price });
      }
      renderBasket();
      closePopup();
      openBasket();
    });
  });
});

// ── Order section ───────────────────────────────────────────────────────────

const pickupDate = document.getElementById("pickup-date");
const calendar = document.getElementById("calendar-widget");
const calGrid = calendar ? calendar.querySelector(".cal-grid") : null;
const calLabel = calendar ? calendar.querySelector(".cal-label") : null;

if (pickupDate) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  pickupDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let calMonth = new Date();
calMonth.setDate(1);

function fmtDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

document.querySelectorAll(".slot-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
  });
});

// ── Order storage and limits ────────────────────────────────────────────────

function getOrders() {
  try {
    const val = JSON.parse(localStorage.getItem("brood_orders"));
    return Array.isArray(val) ? val : [];
  } catch { return []; }
}

function getLimits() {
  try {
    const val = JSON.parse(localStorage.getItem("brood_limits"));
    if (val && typeof val === "object") return val;
  } catch {}
  return { maxPerDay: 50, items: {} };
}

function getItemCountForDate(date, itemName) {
  const orders = getOrders().filter((o) => o.date === date && o.status !== "declined");
  let count = 0;
  orders.forEach((o) => {
    o.items.forEach((i) => {
      if (i.name === itemName) count += i.qty;
    });
  });
  return count;
}

function getTotalCountForDate(date) {
  const orders = getOrders().filter((o) => o.date === date && o.status !== "declined");
  return orders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + i.qty, 0), 0);
}

function isDateFull(date) {
  const limits = getLimits();
  if (!limits.maxPerDay) return false;
  return getTotalCountForDate(date) >= limits.maxPerDay;
}

function isItemSoldOut(date, itemName) {
  const limits = getLimits();
  const itemLimit = limits.items[itemName];
  if (!itemLimit || !itemLimit.max) return false;
  return getItemCountForDate(date, itemName) >= itemLimit.max;
}

// ── Calendar with availability ──────────────────────────────────────────────
function renderCalendar() {
  if (!calGrid || !calLabel || !pickupDate) return;
  try {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const startOff = first.getDay() === 0 ? 6 : first.getDay() - 1;

    calLabel.textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    let html = "";

    for (let i = startOff - 1; i >= 0; i--) {
      const d = prevDays - i;
      html += `<div class="cal-day is-other" data-date="${fmtDate(year, month - 1, d)}">${d}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const ds = fmtDate(year, month, d);
      let cls = "cal-day";
      if (date < tomorrow) cls += " is-past";
      if (date.toDateString() === today.toDateString()) cls += " is-today";
      if (ds === pickupDate.value) cls += " is-selected";
      if (isDateFull(ds)) cls += " is-full";
      html += `<div class="${cls}" data-date="${ds}">${d}</div>`;
    }

    const total = startOff + daysInMonth;
    for (let d = 1; d <= (7 - total % 7) % 7; d++) {
      html += `<div class="cal-day is-other" data-date="${fmtDate(year, month + 1, d)}">${d}</div>`;
    }

    calGrid.innerHTML = html;

    calGrid.querySelectorAll(".cal-day:not(.is-past):not(.is-other):not(.is-full)").forEach((day) => {
      day.addEventListener("click", () => {
        calGrid.querySelectorAll(".cal-day").forEach((d) => d.classList.remove("is-selected"));
        day.classList.add("is-selected");
        pickupDate.value = day.dataset.date;
        updateBasketLimits();
      });
    });
  } catch (e) {
    console.warn("Calendar render error:", e);
  }
}

if (calendar) renderCalendar();

if (calendar) {
  document.querySelectorAll(".cal-prev, .cal-next").forEach((btn) => {
    btn.addEventListener("click", () => {
      calMonth.setMonth(calMonth.getMonth() + (btn.classList.contains("cal-next") ? 1 : -1));
      renderCalendar();
    });
  });
}

// ── Basket limit warnings ──────────────────────────────────────────────────

function updateBasketLimits() {
  const date = pickupDate.value;
  const limits = getLimits();

  document.querySelectorAll(".menu-card").forEach((card) => {
    const name = card.querySelector(".card-body h4").textContent;
    const limitEl = card.querySelector(".card-limit");
    if (limitEl) limitEl.remove();

    if (date && isItemSoldOut(date, name)) {
      const badge = document.createElement("span");
      badge.className = "card-limit";
      badge.textContent = "Sold out for this date";
      card.querySelector(".card-body").appendChild(badge);
    }
  });
}

// ── Form submission ─────────────────────────────────────────────────────────

function setOrders(orders) {
  localStorage.setItem("brood_orders", JSON.stringify(orders));
}

function showOrderConfirmation(ref) {
  const existing = document.querySelector(".order-confirmation");
  if (existing) existing.remove();
  const confirm = document.createElement("div");
  confirm.className = "order-confirmation";
  confirm.innerHTML = ref
    ? `<p><strong>Order sent!</strong> We'll confirm your pickup time.</p><p class="order-confirm-ref">Reference: #${ref}</p>`
    : `<p><strong>Order sent!</strong> We'll confirm your pickup time.</p>`;
  orderForm.parentNode.insertBefore(confirm, orderForm);
}

function resetAfterOrder() {
  basket.length = 0;
  renderBasket();
  orderForm.reset();
  pickupDate.value = document.querySelector(".cal-day.is-selected")
    ? document.querySelector(".cal-day.is-selected").dataset.date
    : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return fmtDate(d.getFullYear(), d.getMonth(), d.getDate()); })();
  document.getElementById("order-name").focus();
  renderCalendar();
  updateBasketLimits();
}

const orderForm = document.querySelector(".order-form");
if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("order-name").value.trim();
    const contact = document.getElementById("order-contact").value.trim();
    const notes = document.getElementById("order-notes").value.trim();
    const date = pickupDate ? pickupDate.value : "";
    const slot = document.querySelector(".slot-btn.is-selected");
    const time = slot ? slot.dataset.time : "";

    if (!name || !contact) return;

    if (basket.length === 0) {
      alert("Your basket is empty. Add items from the menu first.");
      return;
    }

    if (isDateFull(date)) {
      alert("Sorry, this date is fully booked. Please choose another date.");
      return;
    }

    for (const item of basket) {
      if (isItemSoldOut(date, item.name)) {
        alert(`Sorry, ${item.name} is sold out for this date.`);
        return;
      }
    }

    const total = basket.reduce((s, i) => s + i.qty * i.price, 0);
    const items = basket.map((i) => ({ name: i.name, type: i.type || "", qty: i.qty, price: i.price }));

    // Try Firestore if user is logged in and Firebase is ready
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (user && typeof placeOrder === "function") {
      try {
        await placeOrder({
          customerId: user.uid,
          customerName: name, customerContact: contact,
          date, time, notes, items, total,
          status: "pending",
          createdAt: new Date().toISOString()
        });
        resetAfterOrder();
        showOrderConfirmation(null);
        return;
      } catch (err) {
        alert("Order failed: " + err.message);
        return;
      }
    }

    // Fallback to localStorage
    const orders = getOrders();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    orders.push({
      id, createdAt: new Date().toISOString(),
      date, time, customerName: name, customerContact: contact, notes,
      items, total, status: "pending"
    });
    setOrders(orders);
    resetAfterOrder();
    showOrderConfirmation(id.slice(-6));
  });
}

// ── Auth UI ─────────────────────────────────────────────────────────────────

const authModal = document.getElementById("auth-modal");
const userBtn = document.getElementById("user-btn");
const adminLinkBelow = document.getElementById("admin-link-below");
const accountPanel = document.getElementById("account-panel");
let currentTab = "login";

function openAuthModal() {
  authModal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  authModal.classList.remove("is-open");
  document.body.style.overflow = "";
}

authModal.querySelector(".auth-backdrop").addEventListener("click", closeAuthModal);
authModal.querySelector(".auth-close").addEventListener("click", closeAuthModal);

userBtn.onclick = openAuthModal;

function syncAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("is-active"));
  tab.classList.add("is-active");
  currentTab = tab.dataset.tab;
  const loginFields = document.getElementById("auth-fields-login");
  const signupFields = document.getElementById("auth-fields-signup");
  loginFields.style.display = currentTab === "login" ? "" : "none";
  signupFields.style.display = currentTab === "signup" ? "" : "none";
  loginFields.querySelectorAll("[required]").forEach((el) => el.required = currentTab === "login");
  signupFields.querySelectorAll("[required]").forEach((el) => el.required = currentTab === "signup");
  document.querySelector(".auth-submit").textContent = currentTab === "login" ? "Sign in" : "Create account";
  document.getElementById("auth-error").textContent = "";
}

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => syncAuthTab(tab));
});
syncAuthTab(document.querySelector(".auth-tab.is-active"));

document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("auth-error");
  errorEl.textContent = "";

  if (currentTab === "login") {
    const email = document.getElementById("auth-email").value.trim();
    const pw = document.getElementById("auth-password").value;
    if (typeof logIn !== "function") { errorEl.textContent = "Firebase not configured. See firebase.js to set up."; return; }
    try {
      await logIn(email, pw);
      closeAuthModal();
      document.getElementById("auth-email").value = "";
      document.getElementById("auth-password").value = "";
    } catch (err) {
      errorEl.textContent = err.message || "Sign in failed";
    }
  } else {
    const name = document.getElementById("auth-name").value.trim();
    const email = document.getElementById("auth-email2").value.trim();
    const pw = document.getElementById("auth-password2").value;
    if (typeof signUp !== "function") { errorEl.textContent = "Firebase not configured. See firebase.js to set up."; return; }
    try {
      const cred = await signUp(email, pw, name);
      await setUserProfile(cred.user.uid, { email, name, memberSince: new Date().toISOString() });
      closeAuthModal();
      document.getElementById("auth-name").value = "";
      document.getElementById("auth-email2").value = "";
      document.getElementById("auth-password2").value = "";
    } catch (err) {
      errorEl.textContent = err.message || "Sign up failed";
    }
  }
});

// ── Auth state ──────────────────────────────────────────────────────────────

function setupAuth() {
  if (typeof onAuthChanged !== "function") return;
  onAuthChanged((user) => {
    if (user) {
      userBtn.setAttribute("aria-label", "My account");
      userBtn.onclick = () => {
        accountPanel.classList.add("is-open");
        document.body.style.overflow = "hidden";
        loadUserOrders(user.uid);
      };
      getUserProfile(user.uid).then((profile) => {
        document.getElementById("account-name").textContent = profile ? profile.name : user.email;
      });
      if (adminLinkBelow && user.email === "broodbypi7@gmail.com") {
        adminLinkBelow.style.display = "";
      } else if (adminLinkBelow) {
        adminLinkBelow.style.display = "none";
      }
    } else {
      userBtn.setAttribute("aria-label", "Sign in");
      userBtn.onclick = openAuthModal;
      if (adminLinkBelow) adminLinkBelow.style.display = "none";
    }
  });
}
if (typeof onAuthChanged === "function") { setupAuth(); }
else { document.addEventListener("DOMContentLoaded", setupAuth); }

loadPrices();

document.querySelector(".basket-checkout")?.addEventListener("click", () => {
  closeBasket();
  document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
});

accountPanel.querySelector(".account-backdrop").addEventListener("click", () => {
  accountPanel.classList.remove("is-open");
  document.body.style.overflow = "";
});

accountPanel.querySelector(".account-close").addEventListener("click", () => {
  accountPanel.classList.remove("is-open");
  document.body.style.overflow = "";
});

accountPanel.querySelector(".account-signout").addEventListener("click", () => {
  if (typeof logOut === "function") logOut();
  accountPanel.classList.remove("is-open");
  document.body.style.overflow = "";
});

async function loadUserOrders(uid) {
  const container = document.getElementById("account-orders");
  if (typeof getUserOrders === "function") {
    getUserOrders(uid, (orders) => {
      if (orders.length === 0) {
        container.innerHTML = '<p style="color:var(--muted);font-size:0.9rem;">No orders yet.</p>';
        return;
      }
      container.innerHTML = orders.map((o) => {
        const items = o.items.map((i) => `${i.qty}× ${i.name}${i.type ? " (" + i.type + ")" : ""}`).join(", ");
        return `
          <div class="account-order">
            <div>
              <span class="account-order-date">${o.date}</span>
              <span class="account-order-status ${o.status}">${o.status}</span>
            </div>
            <div style="margin-top:0.3rem">${items}</div>
            <div class="account-order-total">${formatPrice(o.total)}</div>
            <button class="account-order-reorder" data-order-id="${o.id}" data-items='${JSON.stringify(o.items).replace(/'/g, "&#39;")}'>Reorder</button>
          </div>
        `;
      }).join("");

      container.querySelectorAll(".account-order-reorder").forEach((btn) => {
        btn.addEventListener("click", () => {
          try {
            const items = JSON.parse(btn.dataset.items);
            items.forEach((item) => {
              basket.push({ name: item.name, type: item.type || "", qty: item.qty || 1, price: item.price || 0 });
            });
            renderBasket();
            accountPanel.classList.remove("is-open");
            document.body.style.overflow = "";
            openBasket();
          } catch (e) {}
        });
      });
    });
  } else {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.9rem;">Sign in to see your orders.</p>';
  }
}


