(function () {
  const menuEl = document.getElementById("menu");
  const navEl = document.getElementById("categoryNav");

  function formatPrice(value) {
    return "R$ " + value.toFixed(2).replace(".", ",");
  }

  function buildItemCard(item, fallbackPrice) {
    const price = typeof item.price === "number" ? item.price : fallbackPrice;
    const card = document.createElement("div");
    card.className = "item-card";

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

    const btn = document.createElement("button");
    btn.className = "item-order-btn";
    btn.type = "button";
    btn.textContent = "+ Adicionar ao carrinho";
    btn.addEventListener("click", () => addToCart(item.name, price));
    card.appendChild(btn);

    return card;
  }

  function buildSizeCard(groupName, size) {
    const label = `${groupName} ${size.label}`;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "size-card";
    card.addEventListener("click", () => addToCart(label, size.price));

    const labelEl = document.createElement("span");
    labelEl.className = "size-label";
    labelEl.textContent = size.label;
    card.appendChild(labelEl);

    const priceEl = document.createElement("span");
    priceEl.className = "size-price";
    priceEl.textContent = formatPrice(size.price);
    card.appendChild(priceEl);

    return card;
  }

  function buildGroup(group) {
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
      group.items.forEach((item) => grid.appendChild(buildItemCard(item, group.price)));
      wrap.appendChild(grid);
    }

    if (group.sizes) {
      const grid = document.createElement("div");
      grid.className = "size-grid";
      group.sizes.forEach((size) => grid.appendChild(buildSizeCard(group.name, size)));
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
      category.items.forEach((item) => grid.appendChild(buildItemCard(item)));
      section.appendChild(grid);
    }

    if (category.groups) {
      category.groups.forEach((group) => section.appendChild(buildGroup(group)));
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

  function render() {
    buildNav();
    MENU_DATA.forEach((category) => menuEl.appendChild(buildCategory(category)));
  }

  function setupScrollSpy() {
    const pills = Array.from(navEl.querySelectorAll(".nav-pill"));
    const sections = MENU_DATA.map((c) => document.getElementById(c.id));

    const observer = new IntersectionObserver(
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

    sections.forEach((s) => s && observer.observe(s));
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

  render();
  setupScrollSpy();
  setupMobileNav();
})();
