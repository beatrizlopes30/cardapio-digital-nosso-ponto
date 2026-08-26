// Utilitários compartilhados entre o cardápio público (script.js) e o
// Menu Administrativo (admin.js) para percorrer o MENU_DATA e aplicar
// remoções manuais salvas pela dona do ponto.
//
// A lista de produtos removidos em si é lida/gravada por js/menu-sync.js
// (Firebase Realtime Database, com fallback em localStorage — ver esse
// arquivo para detalhes). Este arquivo só sabe percorrer o cardápio e
// aplicar uma lista de IDs removidos sobre o MENU_DATA.

// Percorre todo o cardápio e chama callback({ id, entity, category, group, label, price })
// para cada produto/tamanho "folha" (o nível que aparece como card no site).
function forEachMenuProduct(callback) {
  MENU_DATA.forEach((category) => {
    if (category.items) {
      category.items.forEach((item) => {
        callback({
          id: `${category.id}::${item.name}`,
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
              id: `${category.id}::${group.name}::${item.name}`,
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
              id: `${category.id}::${group.name}::${size.label}`,
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

// Aplica uma lista de IDs removidos sobre o MENU_DATA em memória, marcando
// `available = false` nos itens/tamanhos removidos pela dona. Preserva
// qualquer `available: false` já fixado no código (js/menu-data.js) e
// reativa itens cuja remoção foi desfeita.
function applyMenuOverrides(removedIds) {
  const removedSet = new Set(removedIds || []);
  forEachMenuProduct(({ id, entity }) => {
    if (!Object.prototype.hasOwnProperty.call(entity, "__baseAvailable")) {
      entity.__baseAvailable = entity.available;
    }
    entity.available = entity.__baseAvailable === false ? false : !removedSet.has(id);
  });
}
