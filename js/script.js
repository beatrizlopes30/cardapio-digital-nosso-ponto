// Renderização do cardápio a partir de MENU_DATA: categorias, cards de
// produto/tamanho e navegação. Seleção de opções e quantidade vivem em
// product-options.js e qty-control.js.
(function () {
  const menuEl = document.getElementById("menu");
  const navEl = document.getElementById("categoryNav");

  function formatPrice(value) {
    return "R$ " + value.toFixed(2).replace(".", ",");
  }

  function appendAvailabilityBadge(card, available) {
    if (available) return;
    const badge = document.createElement("span");
    badge.className = "unavailable-badge";
    badge.textContent = "Indisponível no momento";
    card.appendChild(badge);
  }

  function buildItemCard(item, fallbackPrice, category, parentGroup) {
    const price = typeof item.price === "number" ? item.price : fallbackPrice;
    const available = isAvailable(item, parentGroup);

    const card = document.createElement("div");
    card.className = "item-card" + (available ? "" : " is-unavailable");

    const top = document.createElement("div");
    top.className = "item-top";

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;
    top.appendChild(name);

    if (typeof price === "number") {
      const priceEl = document.createElement("span");
      priceEl.className = "item-price";
      priceEl.textContent = formatPrice(price);
      top.appendChild(priceEl);
    }

    card.appendChild(top);

    if (item.desc) {
      const desc = document.createElement("p");
      desc.className = "item-desc";
      desc.textContent = item.desc;
      card.appendChild(desc);
    }

    appendAvailabilityBadge(card, available);

    let stepperRef = null;
    const optionGroups = getOptionGroups(category, item);
    const { wrapper, controllers } = createOptionControls(optionGroups, () => stepperRef && stepperRef.refresh());
    card.appendChild(wrapper);

    const getLabel = () => buildLabelWithOptions(item.name, controllers);
    const getPrice = () => price + getControllersExtra(controllers);
    const getKey = () => cartKey(getLabel(), getPrice());

    stepperRef = buildQtyControl(getKey, getPrice, getLabel, controllers, available);
    card.appendChild(stepperRef.el);

    return card;
  }

  function buildSizeCard(groupName, size, category, group) {
    const available = isAvailable(size, group);

    const card = document.createElement("div");
    card.className = "size-card" + (available ? "" : " is-unavailable");

    const labelEl = document.createElement("span");
    labelEl.className = "size-label";
    labelEl.textContent = size.label;
    card.appendChild(labelEl);

    const priceEl = document.createElement("span");
    priceEl.className = "size-price";
    priceEl.textContent = formatPrice(size.price);
    card.appendChild(priceEl);

    appendAvailabilityBadge(card, available);

    let stepperRef = null;
    const optionGroups = getOptionGroups(category, size);
    const { wrapper, controllers } = createOptionControls(optionGroups, () => stepperRef && stepperRef.refresh());
    card.appendChild(wrapper);

    const baseLabel = `${groupName} ${size.label}`;
    const getLabel = () => buildLabelWithOptions(baseLabel, controllers);
    const getPrice = () => size.price + getControllersExtra(controllers);
    const getKey = () => cartKey(getLabel(), getPrice());

    stepperRef = buildQtyControl(getKey, getPrice, getLabel, controllers, available);
    card.appendChild(stepperRef.el);

    return card;
  }

  function buildGroup(group, category) {
    const wrap = document.createElement("div");

    const heading = document.createElement("div");
    heading.className = "group-heading";
    const h3 = document.createElement("h3");
    h3.textContent = group.name;
    heading.appendChild(h3);
    if (typeof group.price === "number") {
      const tag = document.createElement("span");
      tag.className = "group-price-tag";
      tag.textContent = formatPrice(group.price);
      heading.appendChild(tag);
    }
    wrap.appendChild(heading);

    if (group.desc) {
      const desc = document.createElement("p");
      desc.className = "group-desc";
      desc.textContent = group.desc;
      wrap.appendChild(desc);
    }

    if (group.items) {
      const grid = document.createElement("div");
      grid.className = "card-grid";
      group.items.forEach((item) => grid.appendChild(buildItemCard(item, group.price, category, group)));
      wrap.appendChild(grid);
    }

    if (group.sizes) {
      const grid = document.createElement("div");
      grid.className = "size-grid";
      group.sizes.forEach((size) => grid.appendChild(buildSizeCard(group.name, size, category, group)));
      wrap.appendChild(grid);
    }

    return wrap;
  }

  function buildCategory(category) {
    const section = document.createElement("section");
    section.className = "category-section";
    section.id = category.id;

    const heading = document.createElement("div");
    heading.className = "category-heading";
    heading.innerHTML = `<span class="cat-icon">${category.icon}</span><h2>${category.title}</h2>`;
    section.appendChild(heading);

    if (category.subtitle) {
      const subtitle = document.createElement("p");
      subtitle.className = "category-subtitle";
      subtitle.textContent = category.subtitle;
      section.appendChild(subtitle);
    }

    if (category.items) {
      const grid = document.createElement("div");
      grid.className = "card-grid";
      category.items.forEach((item) => grid.appendChild(buildItemCard(item, undefined, category, null)));
      section.appendChild(grid);
    }

    if (category.groups) {
      category.groups.forEach((group) => section.appendChild(buildGroup(group, category)));
    }

    return section;
  }

  function buildNav() {
    MENU_DATA.forEach((category) => {
      const pill = document.createElement("a");
      pill.className = "nav-pill";
      pill.href = `#${category.id}`;
      pill.dataset.target = category.id;
      pill.innerHTML = `${category.icon} ${category.title}`;
      navEl.appendChild(pill);
    });
  }

  function renderMenu() {
    menuEl.innerHTML = "";
    MENU_DATA.forEach((category) => menuEl.appendChild(buildCategory(category)));
  }

  let scrollObserver = null;

  function setupScrollSpy() {
    if (scrollObserver) scrollObserver.disconnect();

    const pills = Array.from(navEl.querySelectorAll(".nav-pill"));
    const sections = MENU_DATA.map((c) => document.getElementById(c.id));

    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            pills.forEach((p) => p.classList.toggle("active", p.dataset.target === id));
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => s && scrollObserver.observe(s));
  }

  function setupMobileNav() {
    const toggle = document.getElementById("navToggle");
    toggle.addEventListener("click", () => {
      const open = navEl.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    navEl.addEventListener("click", (e) => {
      if (e.target.closest(".nav-pill")) {
        navEl.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  buildNav();
  renderMenu();
  setupScrollSpy();
  setupMobileNav();

  // Repinta o cardápio sempre que a dona remover/reativar um produto no
  // Menu Administrativo — em tempo real, via Firebase (ou localStorage se
  // o Firebase não estiver configurado; ver js/menu-sync.js).
  subscribeRemovedProducts((removedIds) => {
    applyMenuOverrides(removedIds);
    renderMenu();
    setupScrollSpy();
  });
})();
