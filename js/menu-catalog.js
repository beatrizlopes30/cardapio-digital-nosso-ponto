// Utilitários compartilhados entre o cardápio público (script.js) e o
// Menu Administrativo (admin.js) para percorrer o MENU_DATA e aplicar
// remoções manuais salvas pela dona do ponto.
//
// A lista de produtos removidos em si é lida/gravada por js/menu-sync.js
// (Firebase Realtime Database, com fallback em localStorage — ver esse
// arquivo para detalhes). Este arquivo só sabe percorrer o cardápio e
// aplicar uma lista de IDs removidos sobre o MENU_DATA.

// Nome do campo de texto "editável" de uma entidade: itens usam `name`,
// tamanhos (dentro de um grupo) usam `label`.
function getEntityTextField(entity) {
  return Object.prototype.hasOwnProperty.call(entity, "name") ? "name" : "label";
}

// Texto ORIGINAL (definido no código) de uma entidade, ignorando qualquer
// edição de nome já aplicada. Os IDs de produto usam sempre esse texto —
// nunca o texto editado — para que renomear um produto no Menu
// Administrativo não quebre a remoção/edição já salva para ele.
function getBaseText(entity) {
  const field = getEntityTextField(entity);
  return Object.prototype.hasOwnProperty.call(entity, "__baseText") ? entity.__baseText : entity[field];
}

// Percorre todo o cardápio e chama callback({ id, entity, category, group, label, price })
// para cada produto/tamanho "folha" (o nível que aparece como card no site).
function forEachMenuProduct(callback) {
  MENU_DATA.forEach((category) => {
    if (category.items) {
      category.items.forEach((item) => {
        callback({
          id: `${category.id}::${getBaseText(item)}`,
          entity: item,
          category,
          group: null,
          label: item.name,
          price: item.price,
        });
      });
    }

    if (category.groups) {
      category.groups.forEach((group) => {
        if (group.items) {
          group.items.forEach((item) => {
            callback({
              id: `${category.id}::${group.name}::${getBaseText(item)}`,
              entity: item,
              category,
              group,
              label: `${group.name} — ${item.name}`,
              price: typeof item.price === "number" ? item.price : group.price,
            });
          });
        }

        if (group.sizes) {
          group.sizes.forEach((size) => {
            callback({
              id: `${category.id}::${group.name}::${getBaseText(size)}`,
              entity: size,
              category,
              group,
              label: `${group.name} — ${size.label}`,
              price: size.price,
            });
          });
        }
      });
    }
  });
}

// Aplica uma lista de IDs removidos e um mapa de edições (nome/preço) sobre
// o MENU_DATA em memória. `productOverrides` é um objeto { [id]: { price?,
// text? } } — vem do Menu Administrativo (js/admin.js) via js/menu-sync.js.
// Preserva qualquer `available: false`, nome e preço já fixados no código
// (js/menu-data.js) e reverte para eles quando a edição é desfeita.
function applyMenuOverrides(removedIds, productOverrides) {
  const removedSet = new Set(removedIds || []);
  const overrides = productOverrides || {};

  forEachMenuProduct(({ id, entity }) => {
    if (!Object.prototype.hasOwnProperty.call(entity, "__baseAvailable")) {
      entity.__baseAvailable = entity.available;
    }
    if (!Object.prototype.hasOwnProperty.call(entity, "__basePrice")) {
      entity.__basePrice = entity.price;
    }
    const textField = getEntityTextField(entity);
    if (!Object.prototype.hasOwnProperty.call(entity, "__baseText")) {
      entity.__baseText = entity[textField];
    }

    entity.available = entity.__baseAvailable === false ? false : !removedSet.has(id);

    const override = overrides[id];
    entity.price = override && typeof override.price === "number" ? override.price : entity.__basePrice;
    entity[textField] =
      override && typeof override.text === "string" && override.text.trim()
        ? override.text.trim()
        : entity.__baseText;
  });
}

// Lista as seções onde um produto novo pode entrar: cada categoria e cada
// grupo de itens dentro dela (grupos de tamanhos, como as porções, ficam de
// fora). Retorna [{ value, label }], `value` no formato usado em
// customProducts[].section.
function listMenuSections() {
  const sections = [];
  MENU_DATA.forEach((category) => {
    sections.push({ value: category.id, label: `${category.icon} ${category.title}` });
    (category.groups || []).forEach((group) => {
      if (group.items) {
        sections.push({
          value: `${category.id}::${group.name}`,
          label: `${category.icon} ${category.title} › ${group.name}`,
        });
      }
    });
  });
  return sections;
}

// Encontra a lista de itens de uma seção ("categoria" ou "categoria::grupo").
// Cria `category.items` se a categoria só tinha grupos. Retorna null se a
// seção não existir mais.
function findSectionItems(section, create) {
  const [categoryId, groupName] = String(section || "").split("::");
  const category = MENU_DATA.find((c) => c.id === categoryId);
  if (!category) return null;
  if (groupName) {
    const group = (category.groups || []).find((g) => g.name === groupName && g.items);
    return group ? group.items : null;
  }
  if (!category.items && create) {
    category.items = [];
    category.__customItemsArray = true;
  }
  return category.items || null;
}

// Injeta no MENU_DATA os produtos novos cadastrados no Menu Administrativo
// (ver subscribeCustomProducts em js/menu-sync.js), substituindo os que
// foram injetados antes. Deve rodar ANTES de applyMenuOverrides.
function applyCustomProducts(customProducts) {
  MENU_DATA.forEach((category) => {
    if (category.items) category.items = category.items.filter((i) => !i.__custom);
    (category.groups || []).forEach((group) => {
      if (group.items) group.items = group.items.filter((i) => !i.__custom);
    });
    if (category.__customItemsArray && category.items && category.items.length === 0) {
      delete category.items;
      delete category.__customItemsArray;
    }
  });

  Object.keys(customProducts || {})
    .map((key) => ({ key, ...customProducts[key] }))
    .filter((p) => p && typeof p.name === "string" && p.name.trim() && typeof p.price === "number")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .forEach((p) => {
      const items = findSectionItems(p.section, true);
      if (!items) return;
      const item = { name: p.name.trim(), price: p.price, __custom: p.key };
      if (p.desc && String(p.desc).trim()) item.desc = String(p.desc).trim();
      if (p.emoji && String(p.emoji).trim()) item.emoji = String(p.emoji).trim();
      items.push(item);
    });
}
