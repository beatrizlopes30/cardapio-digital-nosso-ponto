(function () {
  const menuEl = document.getElementById("menu");
  const navEl = document.getElementById("categoryNav");
  const menuQtyRefreshers = [];

  function formatPrice(value) {
    return "R$ " + value.toFixed(2).replace(".", ",");
  }

  function isAvailable(entity, parentGroup) {
    if (entity && entity.available === false) return false;
    if (parentGroup && parentGroup.available === false) return false;
    return true;
  }

  // Combina o seletor de sabor (campo legado "flavors" da categoria) com
  // opções extras da categoria e opções específicas do item/tamanho, para
  // reaproveitar o mesmo mecanismo de seleção em qualquer produto.
  function getOptionGroups(category, entity) {
    const groups = [];
    if (category && category.flavors && category.flavors.length) {
      groups.push({
        key: "sabor",
        label: "Sabor",
        type: "select",
        required: true,
        placeholder: "Escolha o sabor",
        options: category.flavors,
      });
    }
    if (category && category.extraOptions) groups.push(...category.extraOptions);
    if (entity && entity.options) groups.push(...entity.options);
    return groups;
  }

  function createOptionControls(optionGroups, onAnyChange) {
    const wrapper = document.createDocumentFragment();
    const controllers = [];

    optionGroups.forEach((group) => {
      const groupWrap = document.createElement("div");
      groupWrap.className = "option-group";

      if (group.type === "checkbox") {
        const label = document.createElement("span");
        label.className = "option-group-label";
        label.textContent = group.label;
        groupWrap.appendChild(label);

        const list = document.createElement("div");
        list.className = "option-checkbox-list";
        const checkboxes = [];
        group.options.forEach((opt) => {
          const optLabel = document.createElement("label");
          optLabel.className = "option-checkbox-item";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = opt;
          checkbox.addEventListener("change", () => onAnyChange && onAnyChange());
          optLabel.appendChild(checkbox);
          optLabel.appendChild(document.createTextNode(opt));
          list.appendChild(optLabel);
          checkboxes.push(checkbox);
        });
        groupWrap.appendChild(list);

        controllers.push({
          group,
          getValue: () => checkboxes.filter((c) => c.checked).map((c) => c.value).join(", "),
        });
      } else if (group.type === "text") {
        const label = document.createElement("label");
        label.className = "option-group-label";
        label.textContent = group.label;
        groupWrap.appendChild(label);

        const input = document.createElement("input");
        input.type = "text";
        input.className = "option-text-input";
        input.placeholder = group.placeholder || "";
        input.addEventListener("input", () => onAnyChange && onAnyChange());
        groupWrap.appendChild(input);

        controllers.push({ group, getValue: () => input.value.trim() });
      } else {
        // "select" (padrão)
        const label = document.createElement("label");
        label.className = "option-group-label";
        label.textContent = group.label;
        groupWrap.appendChild(label);

        const select = document.createElement("select");
        select.className = "flavor-select";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = group.placeholder || `Escolha: ${group.label}`;
        select.appendChild(placeholder);

        group.options.forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          select.appendChild(o);
        });

        select.addEventListener("change", () => onAnyChange && onAnyChange());
        groupWrap.appendChild(select);

        controllers.push({ group, getValue: () => select.value });
      }

      wrapper.appendChild(groupWrap);
    });

    return { wrapper, controllers };
  }

  function findMissingRequired(controllers) {
    return controllers.find((c) => c.group.required && !c.getValue());
  }

  function buildLabelWithOptions(baseName, controllers) {
    const parts = [baseName];
    controllers.forEach((c) => {
      const val = c.getValue();
      if (val) parts.push(val);
    });
    return parts.join(" — ");
  }

  // Controle de quantidade [-] qty [+] que lê e escreve diretamente no
  // mesmo carrinho (cart.js) usado pelo drawer — não há um segundo estado.
  function buildQtyControl(getKey, getPrice, getLabel, controllers, available) {
    const wrap = document.createElement("div");
    wrap.className = "menu-qty";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "−";
    minusBtn.setAttribute("aria-label", "Diminuir quantidade");

    const qtyEl = document.createElement("span");
    qtyEl.className = "qty-value";

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", "Aumentar quantidade");

    function refresh() {
      const qty = cartQty(getKey());
      qtyEl.textContent = qty;
      minusBtn.disabled = !available || qty <= 0;
      plusBtn.disabled = !available;
    }

    minusBtn.addEventListener("click", () => {
      const key = getKey();
      if (cartQty(key) <= 0) return;
      changeQty(key, -1);
    });

    plusBtn.addEventListener("click", () => {
      if (!available) {
        showToast("Produto indisponível no momento");
        return;
      }
      const missing = findMissingRequired(controllers);
      if (missing) {
        showToast(`Selecione "${missing.group.label}" antes de adicionar.`);
        return;
      }
      addToCart(getLabel(), getPrice());
    });

    wrap.appendChild(minusBtn);
    wrap.appendChild(qtyEl);
    wrap.appendChild(plusBtn);

    menuQtyRefreshers.push(refresh);
    refresh();

    return { el: wrap, refresh };
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
    const getKey = () => cartKey(getLabel(), price);

    stepperRef = buildQtyControl(getKey, () => price, getLabel, controllers, available);
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
    const getKey = () => cartKey(getLabel(), size.price);

    stepperRef = buildQtyControl(getKey, () => size.price, getLabel, controllers, available);
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

  window.refreshMenuQuantities = () => menuQtyRefreshers.forEach((fn) => fn());
})();
