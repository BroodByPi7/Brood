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

const knownImages = [];
const discoveryPromises = [];

document.querySelectorAll(".menu-card").forEach((card) => {
  const imgEl = card.querySelector(".card-img img");
  if (imgEl) {
    knownImages.push(imgEl.src);
    return;
  }

  const name = card.querySelector(".card-body h4").textContent;
  const isPreorder = card.closest(".menu-block").querySelector(".block-heading h3").textContent.includes("Pre Order");
  const folder = isPreorder ? "Preorder" : "Daily";
  const placeholder = card.querySelector(".card-placeholder");
  if (!placeholder) return;

  const words = name.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const candidates = [];
  const seen = new Set();

  const add = (s) => {
    const lower = s.toLowerCase();
    if (!seen.has(lower)) { seen.add(lower); candidates.push(s); }
  };

  const allCap = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  add(allCap);
  add(allCap.replace(/s$/, ""));
  add(words.map(w => w.toLowerCase()).join(""));
  add(words.map(w => w.toLowerCase()).join("").replace(/s$/, ""));

  const firstCap = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() + words.slice(1).map(w => w.toLowerCase()).join("");
  add(firstCap);
  add(firstCap.replace(/s$/, ""));

  if (words.length > 2) {
    const last = words[words.length - 1];
    const firstLast = words[0].charAt(0).toUpperCase() + words[0].slice(1) + last.charAt(0).toUpperCase() + last.slice(1);
    add(firstLast);
    add(firstLast.replace(/s$/, ""));
    const firstLastLower = words[0].toLowerCase() + last.toLowerCase();
    add(firstLastLower);
    add(firstLastLower.replace(/s$/, ""));
  }

  discoveryPromises.push(tryCandidate(candidates, folder, placeholder, card));
});

async function tryCandidate(candidates, folder, placeholder, card) {
  const name = card.querySelector(".card-body h4").textContent;
  try {
    const url = await Promise.any(candidates.map(c => {
      const u = `Images/${folder}/${c}.jpg`;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(u);
        img.onerror = reject;
        img.decoding = "async";
        img.src = u;
      });
    }));
    const wrapper = document.createElement("div");
    wrapper.className = "card-img";
    wrapper.innerHTML = `<img src="${url}" alt="${name}" loading="lazy">`;
    placeholder.parentNode.replaceChild(wrapper, placeholder);
    knownImages.push(url);
  } catch (e) {}
}

Promise.allSettled(discoveryPromises).then(() => {
  const slideshow = document.querySelector(".menu-slideshow");
  if (!slideshow || knownImages.length === 0) return;

  knownImages.forEach((src) => {
    const div = document.createElement("div");
    div.className = "slide-bg";
    div.style.backgroundImage = `url(${src})`;
    slideshow.appendChild(div);
  });

  const slides = slideshow.querySelectorAll(".slide-bg");
  if (slides.length === 0) return;
  slides[0].classList.add("is-active");

  let current = 0;
  setInterval(() => {
    slides[current].classList.remove("is-active");
    current = (current + 1) % slides.length;
    slides[current].classList.add("is-active");
  }, 5000);
});

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
