// Lógica do carrinho de pedidos — acumula itens e monta uma única mensagem para o WhatsApp

const CART_STORAGE_KEY = "nossoPontoCart";
let cart = loadCart();

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function cartKey(name, price) {
  return `${name}__${price}`;
}

function formatBRL(value) {
  return "R$ " + value.toFixed(2).replace(".", ",");
}

function addToCart(name, price) {
  const key = cartKey(name, price);
  const existing = cart.find((i) => i.key === key);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ key, name, price, qty: 1 });
  }
  saveCart();
  renderCart();
  showToast(`${name} adicionado ao carrinho`);
}

function changeQty(key, delta) {
  const item = cart.find((i) => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.key !== key);
  }
  saveCart();
  renderCart();
}

function removeFromCart(key) {
  cart = cart.filter((i) => i.key !== key);
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  resetDeliveryFields();
  renderCart();
}

function cartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function cartQty(key) {
  const item = cart.find((i) => i.key === key);
  return item ? item.qty : 0;
}

function getDeliveryType() {
  const checked = document.querySelector('input[name="deliveryType"]:checked');
  return checked ? checked.value : "local";
}

function getDeliveryAddress() {
  const el = document.getElementById("deliveryAddress");
  return el ? el.value.trim() : "";
}

function getTableNumber() {
  const el = document.getElementById("tableNumber");
  return el ? el.value.trim() : "";
}

function resetDeliveryFields() {
  const localRadio = document.querySelector('input[name="deliveryType"][value="local"]');
  if (localRadio) localRadio.checked = true;
  const addressEl = document.getElementById("deliveryAddress");
  if (addressEl) addressEl.value = "";
  document.getElementById("deliveryAddressWrap").hidden = true;
  const tableEl = document.getElementById("tableNumber");
  if (tableEl) tableEl.value = "";
  document.getElementById("tableSelectWrap").hidden = true;

  const paymentEl = document.getElementById("paymentMethod");
  if (paymentEl) paymentEl.value = "";
  const changeEl = document.getElementById("paymentChange");
  if (changeEl) changeEl.value = "";
  document.getElementById("paymentChangeWrap").hidden = true;
}

function getPaymentMethod() {
  const el = document.getElementById("paymentMethod");
  return el ? el.value : "";
}

function getPaymentChange() {
  const el = document.getElementById("paymentChange");
  return el ? el.value.trim() : "";
}

function buildOrderMessage() {
  const deliveryType = getDeliveryType();
  const address = getDeliveryAddress();

  const lines = ["Olá! Gostaria de fazer o seguinte pedido no Nosso Ponto:", ""];
  cart.forEach((item) => {
    lines.push(`${item.qty}x ${item.name} — ${formatBRL(item.price * item.qty)}`);
  });
  lines.push("");
  lines.push(`Total: ${formatBRL(cartTotal())}`);
  lines.push("");

  if (deliveryType === "entrega") {
    lines.push("Forma de entrega: Delivery");
    lines.push(`Endereço: ${address}`);
  } else if (deliveryType === "mesa") {
    lines.push("Forma de entrega: Comer no local");
    lines.push(`Mesa: ${getTableNumber()}`);
  } else {
    lines.push("Forma de entrega: Retirada no local");
  }

  const paymentMethod = getPaymentMethod();
  const paymentChange = getPaymentChange();
  lines.push(`Forma de pagamento: ${paymentMethod}`);
  if (paymentMethod === "Dinheiro" && paymentChange !== "") {
    lines.push(`Troco para: ${paymentChange}`);
  }

  return lines.join("\n");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderCart() {
  const count = cartCount();

  ["cartBadge", "cartBadgeHeader"].forEach((id) => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  });

  const itemsEl = document.getElementById("cartItems");
  const emptyEl = document.getElementById("cartEmpty");
  const totalEl = document.getElementById("cartTotal");
  const deliveryEl = document.getElementById("cartDelivery");
  const paymentEl = document.getElementById("cartPayment");

  itemsEl.innerHTML = "";

  if (cart.length === 0) {
    emptyEl.style.display = "block";
    deliveryEl.style.display = "none";
    paymentEl.style.display = "none";
  } else {
    emptyEl.style.display = "none";
    deliveryEl.style.display = "block";
    paymentEl.style.display = "block";

    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-row";

      const info = document.createElement("div");
      info.className = "cart-row-info";

      const nameEl = document.createElement("span");
      nameEl.className = "cart-row-name";
      nameEl.textContent = item.name;

      const priceEl = document.createElement("span");
      priceEl.className = "cart-row-price";
      priceEl.textContent = `${formatBRL(item.price)} cada`;

      info.appendChild(nameEl);
      info.appendChild(priceEl);

      const controls = document.createElement("div");
      controls.className = "cart-row-controls";

      const decBtn = document.createElement("button");
      decBtn.className = "qty-btn";
      decBtn.textContent = "−";
      decBtn.setAttribute("aria-label", "Diminuir quantidade");
      decBtn.addEventListener("click", () => changeQty(item.key, -1));

      const qtyEl = document.createElement("span");
      qtyEl.className = "qty-value";
      qtyEl.textContent = item.qty;

      const incBtn = document.createElement("button");
      incBtn.className = "qty-btn";
      incBtn.textContent = "+";
      incBtn.setAttribute("aria-label", "Aumentar quantidade");
      incBtn.addEventListener("click", () => changeQty(item.key, 1));

      const removeBtn = document.createElement("button");
      removeBtn.className = "cart-row-remove";
      removeBtn.textContent = "🗑";
      removeBtn.setAttribute("aria-label", "Remover item");
      removeBtn.addEventListener("click", () => removeFromCart(item.key));

      controls.appendChild(decBtn);
      controls.appendChild(qtyEl);
      controls.appendChild(incBtn);
      controls.appendChild(removeBtn);

      const subtotal = document.createElement("span");
      subtotal.className = "cart-row-subtotal";
      subtotal.textContent = formatBRL(item.price * item.qty);

      row.appendChild(info);
      row.appendChild(controls);
      row.appendChild(subtotal);
      itemsEl.appendChild(row);
    });
  }

  totalEl.textContent = formatBRL(cartTotal());
  updateSendButton();

  if (typeof refreshMenuQuantities === "function") refreshMenuQuantities();
}

function updateSendButton() {
  const sendBtn = document.getElementById("cartSendBtn");
  const msgEl = document.getElementById("cartValidationMsg");

  if (cart.length === 0) {
    sendBtn.classList.add("disabled");
    sendBtn.removeAttribute("href");
    msgEl.textContent = "";
    return;
  }

  if (getDeliveryType() === "entrega" && getDeliveryAddress() === "") {
    sendBtn.classList.add("disabled");
    sendBtn.removeAttribute("href");
    msgEl.textContent = "Informe o endereço de entrega para continuar.";
    return;
  }

  if (getDeliveryType() === "mesa" && getTableNumber() === "") {
    sendBtn.classList.add("disabled");
    sendBtn.removeAttribute("href");
    msgEl.textContent = "Informe o número da mesa para continuar.";
    return;
  }

  if (getPaymentMethod() === "") {
    sendBtn.classList.add("disabled");
    sendBtn.removeAttribute("href");
    msgEl.textContent = "Selecione a forma de pagamento para continuar.";
    return;
  }

  msgEl.textContent = "";
  sendBtn.classList.remove("disabled");
  sendBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildOrderMessage())}`;
}

function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "true");
}

function setupCart() {
  document.getElementById("fabCart").addEventListener("click", openCart);
  document.getElementById("headerCartBtn").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("cartClearBtn").addEventListener("click", clearCart);

  document.querySelectorAll('input[name="deliveryType"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const type = getDeliveryType();
      document.getElementById("deliveryAddressWrap").hidden = type !== "entrega";
      document.getElementById("tableSelectWrap").hidden = type !== "mesa";
      updateSendButton();
    });
  });

  document.getElementById("deliveryAddress").addEventListener("input", updateSendButton);
  document.getElementById("tableNumber").addEventListener("input", updateSendButton);

  document.getElementById("paymentMethod").addEventListener("change", (e) => {
    document.getElementById("paymentChangeWrap").hidden = e.target.value !== "Dinheiro";
    updateSendButton();
  });

  document.getElementById("paymentChange").addEventListener("input", updateSendButton);

  document.getElementById("cartSendBtn").addEventListener("click", (e) => {
    if (e.currentTarget.classList.contains("disabled")) return;
    if (typeof recordOrder !== "function") return;
    const deliveryType = getDeliveryType();
    recordOrder({
      items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
      total: cartTotal(),
      deliveryType,
      tableNumber: deliveryType === "mesa" ? getTableNumber() : null,
      address: deliveryType === "entrega" ? getDeliveryAddress() : null,
      paymentMethod: getPaymentMethod(),
      paymentChange: getPaymentMethod() === "Dinheiro" ? getPaymentChange() || null : null,
    }).catch((err) => console.warn("Não foi possível registrar o pedido para as estatísticas.", err));
  });

  renderCart();
}

document.addEventListener("DOMContentLoaded", setupCart);
