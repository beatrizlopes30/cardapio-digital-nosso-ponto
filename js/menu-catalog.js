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
