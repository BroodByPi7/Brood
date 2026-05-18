const cornerMenu = document.querySelector(".corner-menu");
const menuTrigger = document.querySelector(".menu-trigger");
const menuLinks = document.querySelectorAll(".menu-panel a");

function setMenuState(isOpen) {
  cornerMenu.classList.toggle("is-open", isOpen);
  menuTrigger.setAttribute("aria-expanded", String(isOpen));
}

menuTrigger.addEventListener("click", () => {
  setMenuState(!cornerMenu.classList.contains("is-open"));
});

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
