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
    basketTotal.textContent = "$0.00";
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
      <span class="basket-item-price">$${lineTotal.toFixed(2)}</span>
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

  basketTotal.textContent = `$${total.toFixed(2)}`;
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
      summaryEl.textContent += ` — $${total.toFixed(2)}`;
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
          <button class="popup-add" type="button">Add to order — $${price.toFixed(2)}</button>
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
const calGrid = calendar.querySelector(".cal-grid");
const calLabel = calendar.querySelector(".cal-label");

{
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
  try { return JSON.parse(localStorage.getItem("brood_orders")) || []; } catch { return []; }
}

function getLimits() {
  try { return JSON.parse(localStorage.getItem("brood_limits")); } catch {}
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
}

renderCalendar();

document.querySelectorAll(".cal-prev, .cal-next").forEach((btn) => {
  btn.addEventListener("click", () => {
    calMonth.setMonth(calMonth.getMonth() + (btn.classList.contains("cal-next") ? 1 : -1));
    renderCalendar();
  });
});

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

const orderForm = document.querySelector(".order-form");
if (orderForm) {
  orderForm.addEventListener("submit", (e) => {
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
    const orders = getOrders();
    orders.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      date,
      time,
      customerName: name,
      customerContact: contact,
      notes,
      items: basket.map((i) => ({ name: i.name, type: i.type || "", qty: i.qty, price: i.price })),
      total,
      status: "pending"
    });
    setOrders(orders);

    basket.length = 0;
    renderBasket();
    orderForm.reset();
    pickupDate.value = document.querySelector(".cal-day.is-selected")
      ? document.querySelector(".cal-day.is-selected").dataset.date
      : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return fmtDate(d.getFullYear(), d.getMonth(), d.getDate()); })();
    document.getElementById("order-name").focus();

    // Show confirmation
    const existing = document.querySelector(".order-confirmation");
    if (existing) existing.remove();

    const confirm = document.createElement("div");
    confirm.className = "order-confirmation";
    confirm.innerHTML = `
      <p><strong>Order sent!</strong> We'll confirm your pickup time.</p>
      <p class="order-confirm-ref">Reference: #${orders[orders.length - 1].id.slice(-6)}</p>
    `;
    orderForm.parentNode.insertBefore(confirm, orderForm);

    renderCalendar();
    updateBasketLimits();
  });
}

function setOrders(orders) {
  localStorage.setItem("brood_orders", JSON.stringify(orders));
}
