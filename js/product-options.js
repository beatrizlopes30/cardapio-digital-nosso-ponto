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

const OPTION_GROUP_BUILDERS = {
  select: buildSelectGroup,
  text: buildTextGroup,
  checkbox: buildCheckboxGroup,
};

function createOptionControls(optionGroups, onAnyChange) {
  const wrapper = document.createDocumentFragment();
  const controllers = [];

  optionGroups.forEach((group) => {
    const groupWrap = document.createElement("div");
    groupWrap.className = "option-group";

    const labelTag = group.type === "checkbox" ? "span" : "label";
    const label = document.createElement(labelTag);
    label.className = "option-group-label";
    label.textContent = group.label;
    groupWrap.appendChild(label);

    const build = OPTION_GROUP_BUILDERS[group.type] || buildSelectGroup;
    const { el, getValue } = build(group, onAnyChange);
    groupWrap.appendChild(el);

    controllers.push({ group, getValue });
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
