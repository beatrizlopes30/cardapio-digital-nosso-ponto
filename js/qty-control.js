// Controle de quantidade [-] qty [+] usado nos cards do cardápio.
// Lê e escreve diretamente no mesmo carrinho de cart.js — não existe um
// segundo estado. Cada instância se registra para ser atualizada sempre
// que o carrinho mudar em qualquer lugar (drawer, outro card, etc.).

const menuQtyRefreshers = [];

function refreshMenuQuantities() {
  menuQtyRefreshers.forEach((fn) => fn());
}

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
      showToast("Produto esgotado");
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
