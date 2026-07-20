const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const projectCards = [...document.querySelectorAll(".project-card[data-category]")];
const projectFilters = [...document.querySelectorAll("[data-filter]")];
const filterStatus = document.querySelector("#filter-status");
let reelController = null;
let filterTimerId = null;

function setupViewportReveals() {
  const wideViewport = window.matchMedia("(min-width: 40rem)");
  if (reducedMotion.matches || !wideViewport.matches || !("IntersectionObserver" in window)) return;

  const groups = [
    [...document.querySelectorAll(".capability-list li")],
    [...document.querySelectorAll(".visual-archive figure")],
    projectCards,
    [
      document.querySelector(".contact-art"),
      document.querySelector(".contact-title"),
      document.querySelector(".contact-section .button"),
      ...document.querySelectorAll(".contact-links li"),
    ].filter(Boolean),
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const item = entry.target;
      item.classList.add("is-revealing");
      item.addEventListener("animationend", () => {
        item.classList.remove("motion-reveal-ready", "is-revealing");
        item.style.removeProperty("--reveal-index");
      }, { once: true });
      observer.unobserve(item);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  groups.forEach((group) => {
    group.forEach((item, index) => {
      item.classList.add("motion-reveal-ready");
      item.style.setProperty("--reveal-index", String(Math.min(index, 5)));
      observer.observe(item);
    });
  });
}

function applyProjectFilter(filter) {
  window.clearTimeout(filterTimerId);
  const visibleCards = projectCards.filter((card) => filter === "all" || card.dataset.category === filter);

  projectFilters.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  });

  const updateCards = () => {
    projectCards.forEach((card) => {
      card.hidden = !visibleCards.includes(card);
      card.classList.remove("is-filtering-out");
    });

    if (filterStatus) {
      const label = filter === "all" ? "all" : filter.replace("-", " ");
      filterStatus.textContent = `Showing ${visibleCards.length} ${label} ${visibleCards.length === 1 ? "project" : "projects"}.`;
    }
    reelController?.refresh();
  };

  if (reducedMotion.matches) {
    updateCards();
    return;
  }

  projectCards.forEach((card) => card.classList.add("is-filtering-out"));
  filterTimerId = window.setTimeout(updateCards, 120);
}

projectFilters.forEach((button) => {
  button.addEventListener("click", () => applyProjectFilter(button.dataset.filter));
});

class MechanicalProjectReel {
  constructor(section) {
    this.section = section;
    this.grid = section.querySelector("#project-grid");
    this.cards = [...section.querySelectorAll(".project-card[data-category]")];
    this.compactQuery = window.matchMedia("(max-width: 47.999rem)");
    this.visibleCards = [];
    this.activeIndex = 0;
    this.position = 0;
    this.stepHeight = 420;
    this.reelTop = 0;
    this.frameId = null;
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  start() {
    if (!this.grid || this.cards.length < 2 || reducedMotion.matches) return;
    this.section.classList.add("project-reel-enabled");
    document.documentElement.classList.add("project-reel-supported");
    this.buildMachine();
    this.wrapCards();
    this.refresh();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.requestAnimationFrame(() => {
      this.measure(false);
      this.handleScroll();
    });
  }

  buildMachine() {
    this.shell = document.createElement("div");
    this.shell.className = "project-reel";
    this.shell.dataset.projectReel = "";
    this.shell.tabIndex = 0;
    this.shell.setAttribute("aria-label", "Scrollable mechanical project archive");

    this.sticky = document.createElement("div");
    this.sticky.className = "project-reel__sticky";

    const toolbar = document.createElement("div");
    toolbar.className = "project-reel__toolbar";
    toolbar.innerHTML = `
      <div class="project-reel__identity" aria-hidden="true">
        <span class="project-reel__signal"></span>
        <span>Manual archive drive</span>
      </div>
      <div class="project-reel__counter" aria-hidden="true">
        <span class="project-reel__counter-label">Project</span>
        <span class="project-reel__counter-window"><span class="project-reel__counter-strip"></span></span>
        <span class="project-reel__counter-total">/ 00</span>
      </div>
      <div class="project-reel__controls">
        <button class="project-reel__button project-reel__button--previous" type="button" aria-label="Show previous project">↑</button>
        <button class="project-reel__button project-reel__button--next" type="button" aria-label="Show next project">↓</button>
      </div>`;

    this.counterStrip = toolbar.querySelector(".project-reel__counter-strip");
    this.counterTotal = toolbar.querySelector(".project-reel__counter-total");
    this.previousButton = toolbar.querySelector(".project-reel__button--previous");
    this.nextButton = toolbar.querySelector(".project-reel__button--next");

    for (let index = 0; index <= 99; index += 1) {
      const row = document.createElement("span");
      row.textContent = String(index).padStart(2, "0");
      this.counterStrip.append(row);
    }

    this.stage = document.createElement("div");
    this.stage.className = "project-reel__stage";
    this.machine = document.createElement("div");
    this.machine.className = "project-reel__machine";
    this.machine.innerHTML = `
      <div class="project-reel__machine-label" aria-hidden="true"><span>INDEX / SELECTED WORK</span><span>DETENT 08—M</span></div>
      <span class="project-reel__screw project-reel__screw--tl" aria-hidden="true"></span>
      <span class="project-reel__screw project-reel__screw--tr" aria-hidden="true"></span>
      <span class="project-reel__screw project-reel__screw--bl" aria-hidden="true"></span>
      <span class="project-reel__screw project-reel__screw--br" aria-hidden="true"></span>
      <span class="project-reel__axle project-reel__axle--left" aria-hidden="true"></span>
      <span class="project-reel__axle project-reel__axle--right" aria-hidden="true"></span>
      <div class="project-reel__drum-window"></div>`;

    this.drumWindow = this.machine.querySelector(".project-reel__drum-window");
    this.indexRail = document.createElement("ol");
    this.indexRail.className = "project-reel__index";
    this.indexRail.setAttribute("aria-label", "Project index");
    this.liveRegion = document.createElement("p");
    this.liveRegion.className = "sr-only";
    this.liveRegion.setAttribute("aria-live", "polite");
    this.liveRegion.setAttribute("aria-atomic", "true");

    this.stage.append(this.machine, this.indexRail);
    this.sticky.append(toolbar, this.stage, this.liveRegion);
    this.shell.append(this.sticky);
    this.grid.parentNode.insertBefore(this.shell, this.grid);
    this.drumWindow.append(this.grid);

    this.previousButton.addEventListener("click", () => this.goTo(this.activeIndex - 1));
    this.nextButton.addEventListener("click", () => this.goTo(this.activeIndex + 1));
    this.shell.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.goTo(this.activeIndex - 1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.goTo(this.activeIndex + 1);
      }
    });
  }

  wrapCards() {
    this.cards.forEach((card, index) => {
      if (card.querySelector(":scope > .project-card__surface")) return;
      const surface = document.createElement("div");
      surface.className = "project-card__surface";
      surface.style.setProperty("--rest-tilt", `${[-0.28, 0.18, -0.12, 0.24, -0.2, 0.14, -0.08, 0.2][index % 8]}deg`);
      while (card.firstChild) surface.append(card.firstChild);
      card.append(surface);
    });
  }

  refresh() {
    if (!this.shell) return;
    const currentCard = this.visibleCards[this.activeIndex];
    this.visibleCards = this.cards.filter((card) => !card.hidden);
    const preservedIndex = currentCard ? this.visibleCards.indexOf(currentCard) : -1;
    this.activeIndex = preservedIndex >= 0 ? preservedIndex : clamp(this.activeIndex, 0, Math.max(0, this.visibleCards.length - 1));
    this.position = this.activeIndex;
    this.buildIndex();
    this.counterTotal.textContent = `/ ${String(this.visibleCards.length).padStart(2, "0")}`;
    this.measure(false);
    this.render(this.activeIndex, false);
  }

  buildIndex() {
    this.indexRail.replaceChildren();
    this.visibleCards.forEach((card, index) => {
      const title = card.querySelector(".project-title")?.textContent?.trim() || `Project ${index + 1}`;
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "project-reel__index-button";
      button.setAttribute("aria-label", `Show ${title}`);
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><i aria-hidden="true"></i>`;
      button.addEventListener("click", () => this.goTo(index));
      item.append(button);
      this.indexRail.append(item);
    });
    this.indexButtons = [...this.indexRail.querySelectorAll("button")];
  }

  measure(preservePosition = true) {
    if (!this.shell || !this.visibleCards.length) return;
    const compact = this.compactQuery.matches;
    this.stepHeight = compact ? clamp(window.innerHeight * 0.54, 300, 480) : clamp(window.innerHeight * 0.62, 380, 640);
    const stickyHeight = Math.ceil(this.sticky.getBoundingClientRect().height);
    this.shell.style.height = `${stickyHeight + this.stepHeight * Math.max(0, this.visibleCards.length - 1)}px`;
    this.shell.style.setProperty("--project-count", String(this.visibleCards.length));
    const stickyTop = parseFloat(window.getComputedStyle(this.sticky).top) || 0;
    this.reelTop = this.shell.getBoundingClientRect().top + window.scrollY - stickyTop;
    if (preservePosition) window.scrollTo({ top: this.reelTop + this.position * this.stepHeight, behavior: "auto" });
  }

  handleResize() {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.measure(true);
      this.handleScroll();
    }, 120);
  }

  handleScroll() {
    if (!this.visibleCards.length || this.frameId) return;
    this.frameId = window.requestAnimationFrame(() => {
      this.frameId = null;
      this.position = clamp((window.scrollY - this.reelTop) / Math.max(1, this.stepHeight), 0, Math.max(0, this.visibleCards.length - 1));
      this.render(this.position, false);
    });
  }

  goTo(index) {
    const target = clamp(index, 0, Math.max(0, this.visibleCards.length - 1));
    window.scrollTo({ top: this.reelTop + target * this.stepHeight, behavior: reducedMotion.matches ? "auto" : "smooth" });
    this.render(target, true);
  }

  render(position, announce = false) {
    if (!this.visibleCards.length) return;
    const compact = this.compactQuery.matches;
    const drumHeight = this.drumWindow.clientHeight || window.innerHeight * 0.62;
    const radius = compact ? clamp(drumHeight * 0.78, 230, 390) : clamp(drumHeight * 0.82, 300, 520);
    const angleStep = compact ? 48 : 52;
    const nearest = clamp(Math.round(position), 0, this.visibleCards.length - 1);
    const detentDistance = Math.abs(position - nearest);
    const neighborReveal = clamp((detentDistance - 0.025) / 0.225, 0, 1);

    this.visibleCards.forEach((card, index) => {
      const delta = index - position;
      const angle = clamp(delta * angleStep, -84, 84);
      const radians = angle * (Math.PI / 180);
      const distance = Math.abs(delta);
      const baseOpacity = clamp(1 - distance * (compact ? 0.8 : 0.72), 0, 1);
      const opacity = index === nearest ? baseOpacity : baseOpacity * neighborReveal;
      const scale = 1 - Math.min(distance * (compact ? 0.045 : 0.05), 0.1);
      card.style.setProperty("--reel-y", `${(Math.sin(radians) * radius).toFixed(2)}px`);
      card.style.setProperty("--reel-z", `${((Math.cos(radians) - 1) * radius).toFixed(2)}px`);
      card.style.setProperty("--reel-angle", `${(-angle).toFixed(2)}deg`);
      card.style.setProperty("--reel-opacity", opacity.toFixed(3));
      card.style.setProperty("--reel-scale", scale.toFixed(3));
      card.style.setProperty("--reel-depth", String(Math.max(1, 100 - Math.round(distance * 30))));
    });

    this.activeIndex = nearest;
    this.sticky.style.setProperty("--counter-position", position.toFixed(4));
    this.sticky.style.setProperty("--drum-turn", `${(position * 37).toFixed(2)}deg`);
    this.sticky.style.setProperty("--mechanical-load", String(Math.min(1, Math.abs(position - nearest) * 2.2)));

    this.cards.forEach((card) => {
      const visibleIndex = this.visibleCards.indexOf(card);
      const active = visibleIndex === nearest;
      const visible = visibleIndex >= 0;
      if (active) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
      card.setAttribute("aria-hidden", String(!active));
      card.inert = !active || !visible;
      card.querySelectorAll("a, button").forEach((control) => { control.tabIndex = active ? 0 : -1; });
    });

    this.indexButtons?.forEach((button, index) => button.setAttribute("aria-current", index === nearest ? "true" : "false"));
    this.previousButton.disabled = nearest <= 0;
    this.nextButton.disabled = nearest >= this.visibleCards.length - 1;

    if (announce) {
      const title = this.visibleCards[nearest]?.querySelector(".project-title")?.textContent?.trim();
      if (title) this.liveRegion.textContent = `Project ${nearest + 1} of ${this.visibleCards.length}: ${title}`;
    }
  }
}

function loadProjectReelStylesheet() {
  return new Promise((resolve, reject) => {
    const href = new URL("./css/project-reel.css", document.baseURI).href;
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find((link) => link.href === href);
    if (existing?.sheet) {
      resolve();
      return;
    }
    const stylesheet = existing || document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = href;
    stylesheet.addEventListener("load", resolve, { once: true });
    stylesheet.addEventListener("error", reject, { once: true });
    if (!existing) document.head.append(stylesheet);
  });
}

async function setupProjectReel() {
  const section = document.querySelector("#projects");
  if (!section || reducedMotion.matches) return;
  try {
    await loadProjectReelStylesheet();
    reelController = new MechanicalProjectReel(section);
    reelController.start();
  } catch (error) {
    console.warn("The mechanical project reel could not be loaded; the standard project grid remains available.", error);
  }
}

setupViewportReveals();
setupProjectReel();
const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = new Date().getFullYear();
