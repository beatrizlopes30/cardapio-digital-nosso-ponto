// Opções configuráveis de um produto (sabor, cobertura, frutas, texto livre...).
// Um único mecanismo genérico atende sabor, adicionais e campos de texto,
// para não duplicar lógica de seleção por categoria.

function isAvailable(entity, parentGroup) {
  if (entity && entity.available === false) return false;
  if (parentGroup && parentGroup.available === false) return false;
  return true;
}

// Combina o seletor de sabor (campo legado "flavors" da categoria) com
// opções extras da categoria e opções específicas do item/tamanho.
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

function buildSelectGroup(group, onAnyChange) {
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

  return { el: select, getValue: () => select.value };
}

function buildTextGroup(group, onAnyChange) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "option-text-input";
  input.placeholder = group.placeholder || "";
  input.addEventListener("input", () => onAnyChange && onAnyChange());

  return { el: input, getValue: () => input.value.trim() };
}

function buildCheckboxGroup(group, onAnyChange) {
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

  return {
    el: list,
    getValue: () => checkboxes.filter((c) => c.checked).map((c) => c.value).join(", "),
  };
}

// Adicionais com preço por unidade/colher (ex: coberturas de açaí). Cada
// opção tem sua própria quantidade, e o total soma qty * price de todas.
// `freeQty` (opcional) é a quantidade que já vem inclusa sem custo — só a
// parte que exceder esse valor entra no preço (ex: 1ª colher de granola
// já vem no açaí, a partir da 2ª colher cobra-se o preço unitário).
function buildPricedCheckboxGroup(group, onAnyChange) {
  const list = document.createElement("div");
  list.className = "option-priced-list";
  const rows = group.options.map((opt) => ({ opt, qty: opt.freeQty || 0 }));

  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "option-priced-item";

    const info = document.createElement("span");
    info.className = "option-priced-info";
    const priceLabel = row.opt.price.toFixed(2).replace(".", ",");
    info.textContent = row.opt.freeQty
      ? `${row.opt.name} — ${row.opt.freeQty}x inclusa(s), R$ ${priceLabel} ${row.opt.unit || ""} a mais`.trim()
      : `${row.opt.name} — R$ ${priceLabel} ${row.opt.unit || ""}`.trim();
    item.appendChild(info);

    const stepper = document.createElement("div");
    stepper.className = "option-priced-stepper";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "qty-btn qty-btn-sm";
    minusBtn.textContent = "−";
    minusBtn.setAttribute("aria-label", `Diminuir ${row.opt.name}`);

    const qtyEl = document.createElement("span");
    qtyEl.className = "qty-value qty-value-sm";
    qtyEl.textContent = String(row.qty);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "qty-btn qty-btn-sm";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", `Aumentar ${row.opt.name}`);

    function refresh() {
      qtyEl.textContent = row.qty;
      minusBtn.disabled = row.qty <= 0;
    }

    minusBtn.addEventListener("click", () => {
      if (row.qty <= 0) return;
      row.qty -= 1;
      refresh();
      onAnyChange && onAnyChange();
    });

    plusBtn.addEventListener("click", () => {
      row.qty += 1;
      refresh();
      onAnyChange && onAnyChange();
    });

    refresh();
    stepper.appendChild(minusBtn);
    stepper.appendChild(qtyEl);
    stepper.appendChild(plusBtn);
    item.appendChild(stepper);
    list.appendChild(item);
  });

  return {
    el: list,
    getValue: () =>
      rows
        .filter((r) => r.qty !== (r.opt.freeQty || 0))
        .map((r) => {
          const free = r.opt.freeQty || 0;
          if (r.qty > free) return `${r.opt.name} +${r.qty - free}`;
          return `Sem ${r.opt.name}`;
        })
        .join(", "),
    getPriceExtra: () => rows.reduce((sum, r) => sum + Math.max(r.qty - (r.opt.freeQty || 0), 0) * r.opt.price, 0),
  };
}

const OPTION_GROUP_BUILDERS = {
  select: buildSelectGroup,
  text: buildTextGroup,
  checkbox: buildCheckboxGroup,
  "priced-checkbox": buildPricedCheckboxGroup,
};

function createOptionControls(optionGroups, onAnyChange) {
  const wrapper = document.createDocumentFragment();
  const controllers = [];

  optionGroups.forEach((group) => {
    const groupWrap = document.createElement("div");
    groupWrap.className = "option-group";

    const labelTag = group.type === "checkbox" || group.type === "priced-checkbox" ? "span" : "label";
    const label = document.createElement(labelTag);
    label.className = "option-group-label";
    label.textContent = group.label;
    groupWrap.appendChild(label);

    const build = OPTION_GROUP_BUILDERS[group.type] || buildSelectGroup;
    const { el, getValue, getPriceExtra } = build(group, onAnyChange);
    groupWrap.appendChild(el);

    controllers.push({ group, getValue, getPriceExtra: getPriceExtra || (() => 0) });
    wrapper.appendChild(groupWrap);
  });

  return { wrapper, controllers };
}

function findMissingRequired(controllers) {
  return controllers.find((c) => c.group.required && !c.getValue());
}

function getControllersExtra(controllers) {
  return controllers.reduce((sum, c) => sum + (c.getPriceExtra ? c.getPriceExtra() : 0), 0);
}

function buildLabelWithOptions(baseName, controllers) {
  const parts = [baseName];
  controllers.forEach((c) => {
    const val = c.getValue();
    if (val) parts.push(val);
  });
  return parts.join(" — ");
}
