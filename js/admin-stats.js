// Aba "Pedidos, Despesas & Lucro" do Menu Administrativo — mostra faturamento,
// despesas, lucro, número de pedidos, ticket médio, produtos mais vendidos e
// a lista de pedidos recentes, a partir dos pedidos gravados por
// js/orders.js e das despesas lançadas aqui (js/expenses.js).
(function () {
  const periodSelect = document.getElementById("statsPeriod");
  const dateInput = document.getElementById("statsDate");
  const syncNoticeEl = document.getElementById("statsSyncNotice");
  const cardsEl = document.getElementById("statsCards");
  const topProductsEl = document.getElementById("statsTopProducts");
  const deliveryBreakdownEl = document.getElementById("statsDeliveryBreakdown");
  const paymentBreakdownEl = document.getElementById("statsPaymentBreakdown");
  const ordersListEl = document.getElementById("statsOrdersList");
  const ordersEmptyEl = document.getElementById("statsOrdersEmpty");
  const expenseForm = document.getElementById("expenseForm");
  const expenseDateInput = document.getElementById("expenseDate");
  const expenseDescriptionInput = document.getElementById("expenseDescription");
  const expenseCategorySelect = document.getElementById("expenseCategory");
  const expenseAmountInput = document.getElementById("expenseAmount");
  const expenseErrorEl = document.getElementById("expenseError");
  const expensesByCategoryEl = document.getElementById("expensesByCategory");
  const expensesListEl = document.getElementById("expensesList");
  const expensesEmptyEl = document.getElementById("expensesEmpty");

  const DELIVERY_LABELS = {
    local: "Retirada no local",
    mesa: "Mesa",
    entrega: "Delivery",
  };

  let allOrders = [];
  let allExpenses = [];
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
    if (period === "date") {
      return new Set([dateInput.value || todayDateKey()]);
    }
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

  function filteredExpenses() {
    const keys = dateKeysForPeriod(periodSelect.value);
    const expenses = keys ? allExpenses.filter((e) => keys.has(e.dateKey)) : allExpenses.slice();
    return expenses.sort(
      (a, b) => (b.dateKey || "").localeCompare(a.dateKey || "") || (b.createdAt || 0) - (a.createdAt || 0)
    );
  }

  // Converte "12,50" ou "12.50" em 12.5. Retorna null se não for um valor válido.
  function parseAmountInput(raw) {
    const normalized = (raw || "").trim().replace(",", ".");
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function renderCards(orders, expenses) {
    const total = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = total - expensesTotal;
    const margin = total > 0 ? Math.round((profit / total) * 100) : null;
    const count = orders.length;
    const avg = count > 0 ? total / count : 0;

    cardsEl.innerHTML = "";
    [
      { label: "Faturamento", value: formatBRLValue(total) },
      { label: "Despesas", value: formatBRLValue(expensesTotal), modifier: "is-expense" },
      {
        label: margin === null ? "Lucro" : `Lucro (margem ${margin}%)`,
        value: (profit < 0 ? "- " : "") + formatBRLValue(Math.abs(profit)),
        modifier: profit < 0 ? "is-loss" : "is-profit",
      },
      { label: "Pedidos", value: String(count) },
      { label: "Ticket médio", value: formatBRLValue(avg) },
    ].forEach((card) => {
      const el = document.createElement("div");
      el.className = "stat-card" + (card.modifier ? " " + card.modifier : "");
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

  function formatDateKey(dateKey) {
    const [y, m, d] = (dateKey || "").split("-");
    return d ? `${d}/${m}/${y}` : "";
  }

  function renderExpenses(expenses) {
    const byCategory = {};
    expenses.forEach((e) => {
      const cat = e.category || "Outros";
      if (!byCategory[cat]) byCategory[cat] = { qty: 0, total: 0 };
      byCategory[cat].qty += 1;
      byCategory[cat].total += e.amount || 0;
    });
    const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
    expensesByCategoryEl.innerHTML = "";
    if (sortedCategories.length > 0) {
      renderBreakdown(expensesByCategoryEl, sortedCategories, (cat) => cat);
    }

    expensesListEl.innerHTML = "";
    expensesEmptyEl.hidden = expenses.length !== 0;

    expenses.forEach((expense) => {
      const row = document.createElement("div");
      row.className = "order-row expense-row";

      const info = document.createElement("div");
      info.className = "order-row-info";

      const date = document.createElement("span");
      date.className = "order-row-time";
      date.textContent = formatDateKey(expense.dateKey);

      const desc = document.createElement("span");
      desc.className = "order-row-items";
      desc.textContent = expense.description;

      const meta = document.createElement("span");
      meta.className = "order-row-meta";
      meta.textContent = expense.category || "Outros";

      info.appendChild(date);
      info.appendChild(desc);
      info.appendChild(meta);

      const amountEl = document.createElement("span");
      amountEl.className = "order-row-total expense-row-amount";
      amountEl.textContent = "- " + formatBRLValue(expense.amount);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "admin-btn admin-edit-reset";
      removeBtn.textContent = "Excluir";
      removeBtn.addEventListener("click", () => {
        if (!confirm(`Excluir a despesa "${expense.description}" (${formatBRLValue(expense.amount)})?`)) return;
        removeExpense(expense.id).catch((e) => {
          alert("Não foi possível excluir a despesa.\n" + e.message);
        });
      });

      row.appendChild(info);
      row.appendChild(amountEl);
      row.appendChild(removeBtn);
      expensesListEl.appendChild(row);
    });
  }

  function refreshStats() {
    renderSyncNotice();
    const orders = filteredOrders();
    const expenses = filteredExpenses();
    renderCards(orders, expenses);
    renderExpenses(expenses);
    renderTopProducts(orders);
    renderDeliveryBreakdown(orders);
    renderPaymentBreakdown(orders);
    renderOrdersList(orders);
  }

  window.refreshStats = refreshStats;

  periodSelect.addEventListener("change", () => {
    const isDate = periodSelect.value === "date";
    dateInput.hidden = !isDate;
    if (isDate && !dateInput.value) dateInput.value = todayDateKey();
    refreshStats();
  });

  dateInput.addEventListener("change", refreshStats);

  expenseDateInput.value = todayDateKey();

  expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const description = expenseDescriptionInput.value.trim();
    const amount = parseAmountInput(expenseAmountInput.value);
    if (!description) {
      expenseErrorEl.textContent = "Informe uma descrição para a despesa.";
      return;
    }
    if (amount === null) {
      expenseErrorEl.textContent = "Informe um valor válido (ex: 42,90).";
      return;
    }
    expenseErrorEl.textContent = "";
    addExpense({
      dateKey: expenseDateInput.value || todayDateKey(),
      description,
      category: expenseCategorySelect.value,
      amount,
    })
      .then(() => {
        expenseDescriptionInput.value = "";
        expenseAmountInput.value = "";
        expenseDescriptionInput.focus();
      })
      .catch((err) => {
        alert("Não foi possível salvar a despesa. Verifique sua conexão e tente novamente.\n" + err.message);
      });
  });

  if (typeof subscribeOrders === "function" && !subscribed) {
    subscribed = true;
    subscribeOrders((orders) => {
      allOrders = orders;
      refreshStats();
    });
  }

  if (typeof subscribeExpenses === "function") {
    subscribeExpenses((expenses) => {
      allExpenses = expenses;
      refreshStats();
    });
  }
})();
