// Aba "Pedidos & Estatísticas" do Menu Administrativo — mostra faturamento,
// número de pedidos, ticket médio, produtos mais vendidos e a lista de
// pedidos recentes, a partir dos pedidos gravados por js/orders.js.
(function () {
  const periodSelect = document.getElementById("statsPeriod");
  const syncNoticeEl = document.getElementById("statsSyncNotice");
  const cardsEl = document.getElementById("statsCards");
  const topProductsEl = document.getElementById("statsTopProducts");
  const deliveryBreakdownEl = document.getElementById("statsDeliveryBreakdown");
  const paymentBreakdownEl = document.getElementById("statsPaymentBreakdown");
  const ordersListEl = document.getElementById("statsOrdersList");
  const ordersEmptyEl = document.getElementById("statsOrdersEmpty");

  const DELIVERY_LABELS = {
    local: "Retirada no local",
    mesa: "Mesa",
    entrega: "Delivery",
  };

  let allOrders = [];
  let subscribed = false;

  function formatBRLValue(value) {
    return "R$ " + (value || 0).toFixed(2).replace(".", ",");
  }

  function renderSyncNotice() {
    if (typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
      syncNoticeEl.innerHTML =
        "🟢 <strong>Estatísticas em tempo real.</strong> Todo pedido enviado pelo WhatsApp é registrado automaticamente.";
    } else {
      syncNoticeEl.innerHTML =
        "⚠️ <strong>Firebase ainda não configurado.</strong> Os pedidos estão sendo contados apenas " +
        "<strong>neste navegador/dispositivo</strong> — configure o Firebase (js/firebase-config.js) " +
        "para ver o faturamento de todos os clientes, em qualquer aparelho.";
    }
  }

  function dateKeysForPeriod(period) {
    if (period === "all") return null;
    const days = period === "today" ? 1 : parseInt(period, 10);
    const keys = new Set();
    const d = new Date();
    for (let i = 0; i < days; i++) {
      keys.add(todayDateKey(d));
      d.setDate(d.getDate() - 1);
    }
    return keys;
  }

  function filteredOrders() {
    const keys = dateKeysForPeriod(periodSelect.value);
    const orders = keys ? allOrders.filter((o) => keys.has(o.dateKey)) : allOrders.slice();
    return orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function renderCards(orders) {
    const total = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = orders.length;
    const avg = count > 0 ? total / count : 0;

    cardsEl.innerHTML = "";
    [
      { label: "Faturamento", value: formatBRLValue(total) },
      { label: "Pedidos", value: String(count) },
      { label: "Ticket médio", value: formatBRLValue(avg) },
    ].forEach((card) => {
      const el = document.createElement("div");
      el.className = "stat-card";
      const val = document.createElement("span");
      val.className = "stat-card-value";
      val.textContent = card.value;
      const label = document.createElement("span");
      label.className = "stat-card-label";
      label.textContent = card.label;
      el.appendChild(val);
      el.appendChild(label);
      cardsEl.appendChild(el);
    });
  }

  function renderBreakdown(container, entries, formatLabel) {
    container.innerHTML = "";
    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "stats-breakdown-empty";
      empty.textContent = "Sem dados no período.";
      container.appendChild(empty);
      return;
    }
    entries.forEach(([key, data]) => {
      const row = document.createElement("div");
      row.className = "stats-breakdown-row";
      const name = document.createElement("span");
      name.textContent = formatLabel(key);
      const value = document.createElement("span");
      value.textContent = data.qty !== undefined ? `${data.qty}x — ${formatBRLValue(data.total)}` : `${data.count}`;
      row.appendChild(name);
      row.appendChild(value);
      container.appendChild(row);
    });
  }

  function renderTopProducts(orders) {
    const byProduct = {};
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        if (!byProduct[item.name]) byProduct[item.name] = { qty: 0, total: 0 };
        byProduct[item.name].qty += item.qty || 0;
        byProduct[item.name].total += (item.price || 0) * (item.qty || 0);
      });
    });
    const sorted = Object.entries(byProduct)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10);
    renderBreakdown(topProductsEl, sorted, (name) => name);
  }

  function renderDeliveryBreakdown(orders) {
    const byType = {};
    orders.forEach((o) => {
      const type = o.deliveryType || "local";
      if (!byType[type]) byType[type] = { count: 0 };
      byType[type].count += 1;
    });
    const sorted = Object.entries(byType).sort((a, b) => b[1].count - a[1].count);
    renderBreakdown(deliveryBreakdownEl, sorted, (type) => DELIVERY_LABELS[type] || type);
  }

  function renderPaymentBreakdown(orders) {
    const byMethod = {};
    orders.forEach((o) => {
      const method = o.paymentMethod || "Não informado";
      if (!byMethod[method]) byMethod[method] = { count: 0 };
      byMethod[method].count += 1;
    });
    const sorted = Object.entries(byMethod).sort((a, b) => b[1].count - a[1].count);
    renderBreakdown(paymentBreakdownEl, sorted, (method) => method);
  }

  function orderDetailLabel(order) {
    if (order.deliveryType === "entrega") return `Entrega — ${order.address || "endereço não informado"}`;
    if (order.deliveryType === "mesa") return `Mesa ${order.tableNumber || "?"}`;
    return "Retirada no local";
  }

  function renderOrdersList(orders) {
    ordersListEl.innerHTML = "";
    ordersEmptyEl.hidden = orders.length !== 0;

    orders.slice(0, 50).forEach((order) => {
      const row = document.createElement("div");
      row.className = "order-row" + (order.status === "concluido" ? " is-done" : "");

      const info = document.createElement("div");
      info.className = "order-row-info";

      const time = document.createElement("span");
      time.className = "order-row-time";
      time.textContent = order.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : "";

      const items = document.createElement("span");
      items.className = "order-row-items";
      items.textContent = (order.items || []).map((i) => `${i.qty}x ${i.name}`).join(", ");

      const meta = document.createElement("span");
      meta.className = "order-row-meta";
      meta.textContent = `${orderDetailLabel(order)} · ${order.paymentMethod || "—"}`;

      info.appendChild(time);
      info.appendChild(items);
      info.appendChild(meta);

      const totalEl = document.createElement("span");
      totalEl.className = "order-row-total";
      totalEl.textContent = formatBRLValue(order.total);

      const statusBtn = document.createElement("button");
      statusBtn.type = "button";
      statusBtn.className = "admin-btn order-status-btn";
      statusBtn.textContent = order.status === "concluido" ? "Concluído" : "Marcar concluído";
      statusBtn.addEventListener("click", () => {
        if (typeof setOrderStatus !== "function") return;
        setOrderStatus(order.id, order.status === "concluido" ? "novo" : "concluido").catch((e) => {
          alert("Não foi possível atualizar o pedido.\n" + e.message);
        });
      });

      row.appendChild(info);
      row.appendChild(totalEl);
      row.appendChild(statusBtn);
      ordersListEl.appendChild(row);
    });
  }

  function refreshStats() {
    renderSyncNotice();
    const orders = filteredOrders();
    renderCards(orders);
    renderTopProducts(orders);
    renderDeliveryBreakdown(orders);
    renderPaymentBreakdown(orders);
    renderOrdersList(orders);
  }

  window.refreshStats = refreshStats;

  periodSelect.addEventListener("change", refreshStats);

  if (typeof subscribeOrders === "function" && !subscribed) {
    subscribed = true;
    subscribeOrders((orders) => {
      allOrders = orders;
      refreshStats();
    });
  }
})();
