// Estação de impressão — fica aberta no celular ou computador do Nosso Ponto
// perto da impressora térmica. Assina os pedidos em tempo real
// (js/orders.js) e, a cada pedido novo, imprime a comanda:
//   - pela impressora Bluetooth conectada direto (js/bt-printer.js), sem
//     nenhuma janela; ou
//   - pela impressão do navegador (window.print()), se não houver impressora
//     Bluetooth conectada. Para essa não abrir janela de confirmação, abra o
//     Chrome com a opção --kiosk-printing.
//
// Cada pedido é "reservado" com uma transação no Firebase (campo printedAt)
// antes de imprimir, então mesmo com a página aberta em mais de um lugar o
// pedido sai uma vez só.
(function () {
  const STATION_PASSWORD = "Nosso@Ponto2026";
  const SESSION_KEY = "nossoPontoStationAuthed";
  const PAPER_KEY = "nossoPontoStationPaper";
  const AUTO_KEY = "nossoPontoStationAuto";
  // Pedidos não impressos mais antigos que isso não saem sozinhos ao abrir a
  // página (evita imprimir uma pilha de pedidos antigos de uma vez) — ficam
  // na lista com o botão "Imprimir".
  const AUTO_PRINT_MAX_AGE_MS = 60 * 60 * 1000;

  const DELIVERY_LABELS = {
    local: "RETIRADA NO LOCAL",
    mesa: "COMER NO LOCAL",
    entrega: "DELIVERY",
  };

  const loginSection = document.getElementById("stationLogin");
  const panelSection = document.getElementById("stationPanel");
  const loginForm = document.getElementById("stationLoginForm");
  const passwordInput = document.getElementById("stationPassword");
  const loginError = document.getElementById("stationLoginError");
  const noticeEl = document.getElementById("stationNotice");
  const btBtn = document.getElementById("stationBtBtn");
  const btStatusEl = document.getElementById("stationBtStatus");
  const autoPrintEl = document.getElementById("stationAutoPrint");
  const paperEl = document.getElementById("stationPaper");
  const testBtn = document.getElementById("stationTestBtn");
  const listEl = document.getElementById("stationOrdersList");
  const emptyEl = document.getElementById("stationOrdersEmpty");
  const ticketEl = document.getElementById("ticket");
  const paperStyleEl = document.getElementById("paperStyle");

  let printQueue = Promise.resolve();
  let unsubscribe = null;
  let lastOrders = [];
  const failedIds = new Set();

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function formatDateTime(ms) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function shortId(id) {
    return String(id).slice(-5).toUpperCase();
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Papel ----------

  function applyPaper(width) {
    paperStyleEl.textContent =
      `@page { size: ${width}mm auto; margin: 0; }\n` +
      `.ticket { width: ${width === "80" ? "72mm" : "48mm"}; font-size: ${width === "80" ? "13px" : "11px"}; }`;
  }

  // ---------- Comanda ----------

  function buildTicketHtml(order) {
    const rows = (order.items || [])
      .map(
        (item) =>
          `<div class="ticket-item"><span>${item.qty}x ${escapeHtml(item.name)}</span>` +
          `<span>${formatBRL(item.price * item.qty)}</span></div>`
      )
      .join("");

    const delivery = [`<div class="ticket-big">${DELIVERY_LABELS[order.deliveryType] || "PEDIDO"}</div>`];
    if (order.deliveryType === "mesa" && order.tableNumber) {
      delivery.push(`<div class="ticket-big">MESA ${escapeHtml(order.tableNumber)}</div>`);
    }
    if (order.deliveryType === "entrega" && order.address) {
      delivery.push(`<div>Endereço: ${escapeHtml(order.address)}</div>`);
    }

    const payment = [`<div>Pagamento: ${escapeHtml(order.paymentMethod || "—")}</div>`];
    if (order.paymentChange) payment.push(`<div>Troco para: ${escapeHtml(order.paymentChange)}</div>`);

    return (
      `<div class="ticket-center ticket-big">NOSSO PONTO</div>` +
      `<div class="ticket-center">Pedido #${shortId(order.id)}</div>` +
      `<div class="ticket-center">${formatDateTime(order.createdAt || Date.now())}</div>` +
      `<hr>${delivery.join("")}<hr>${rows}<hr>` +
      `<div class="ticket-item ticket-big"><span>TOTAL</span><span>${formatBRL(order.total)}</span></div>` +
      `<hr>${payment.join("")}` +
      `<div class="ticket-center ticket-feed">.</div>`
    );
  }

  function buildTicketEscPos(order) {
    const columns = paperEl.value === "80" ? 48 : 32;
    const p = new EscPosBuilder(columns);

    p.align("center").bold(true).big(true).line("NOSSO PONTO").big(false).bold(false);
    p.line(`Pedido #${shortId(order.id)}`);
    p.line(formatDateTime(order.createdAt || Date.now()));
    p.align("left").divider();

    p.bold(true).big(true).line(DELIVERY_LABELS[order.deliveryType] || "PEDIDO");
    if (order.deliveryType === "mesa" && order.tableNumber) p.line(`MESA ${order.tableNumber}`);
    p.big(false).bold(false);
    if (order.deliveryType === "entrega" && order.address) p.line(`Endereço: ${order.address}`);
    p.divider();

    (order.items || []).forEach((item) => {
      p.pair(`${item.qty}x ${item.name}`, formatBRL(item.price * item.qty));
    });
    p.divider();

    // Letra dupla ocupa o dobro do espaço, então cabe metade das colunas.
    p.bold(true).big(true).pair("TOTAL", formatBRL(order.total), columns / 2).big(false).bold(false);
    p.divider();

    p.line(`Pagamento: ${order.paymentMethod || "-"}`);
    if (order.paymentChange) p.line(`Troco para: ${order.paymentChange}`);

    return p.feed(4).build();
  }

  // Com a impressora Bluetooth escolhida, a comanda vai direto para ela;
  // senão, usa a impressão do navegador (impressora instalada no Windows).
  // As comandas saem uma de cada vez pela fila.
  function printTicket(order) {
    const job = () => {
      if (btPrinter.device) return btPrinter.write(buildTicketEscPos(order));
      return new Promise((resolve) => {
        ticketEl.innerHTML = buildTicketHtml(order);
        setTimeout(() => {
          window.print();
          resolve();
        }, 50);
      });
    };
    const result = printQueue.then(job);
    printQueue = result.catch(() => {});
    return result;
  }

  // Marca o pedido como impresso no Firebase. Resolve true só para quem
  // conseguiu reservar — assim o pedido nunca sai em duplicidade.
  function claimOrder(id) {
    const ref = getOrdersRef();
    if (!ref) return Promise.resolve(false);
    return ref
      .child(id)
      .child("printedAt")
      .transaction((current) => (current ? undefined : Date.now()))
      .then((result) => result.committed);
  }

  function markPrinted(id) {
    const ref = getOrdersRef();
    if (!ref) return Promise.resolve();
    return ref.child(id).update({ printedAt: Date.now() });
  }

  // Se a impressora estiver desligada ou fora de alcance, o pedido volta a
  // ficar "não impresso" e só é tentado de novo ao reconectar (ou pelo botão
  // "Imprimir" da lista).
  function handlePrintFailure(order, err) {
    console.warn("Falha ao imprimir o pedido.", err);
    failedIds.add(order.id);
    const ref = getOrdersRef();
    if (ref) ref.child(order.id).child("printedAt").remove().catch(() => {});
    renderBtStatus(`⚠️ Não consegui imprimir o pedido #${shortId(order.id)}. Verifique se a impressora está ligada.`);
  }

  function handleOrders(orders) {
    lastOrders = orders;
    const now = Date.now();
    if (autoPrintEl.checked) {
      orders
        .filter((o) => !o.printedAt && !failedIds.has(o.id) && now - (o.createdAt || 0) <= AUTO_PRINT_MAX_AGE_MS)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .forEach((order) => {
          claimOrder(order.id)
            .then((claimed) => {
              if (claimed) return printTicket(order).catch((err) => handlePrintFailure(order, err));
            })
            .catch((err) => console.warn("Não foi possível reservar o pedido para impressão.", err));
        });
    }
    renderList(orders);
  }

  // ---------- Lista ----------

  function renderList(orders) {
    const today = todayDateKey();
    const todays = orders
      .filter((o) => o.dateKey === today)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    listEl.innerHTML = "";
    emptyEl.hidden = todays.length > 0;

    todays.forEach((order) => {
      const row = document.createElement("div");
      row.className = "station-order";

      const info = document.createElement("div");
      info.className = "station-order-info";
      const title = document.createElement("strong");
      const where =
        order.deliveryType === "mesa" && order.tableNumber
          ? `Mesa ${order.tableNumber}`
          : (DELIVERY_LABELS[order.deliveryType] || "").toLowerCase();
      title.textContent = `#${shortId(order.id)} · ${formatDateTime(order.createdAt).slice(-5)} · ${where}`;
      const detail = document.createElement("span");
      detail.textContent = `${formatBRL(order.total)} · ${order.printedAt ? "impresso ✓" : "não impresso"}`;
      info.appendChild(title);
      info.appendChild(detail);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-btn";
      btn.textContent = order.printedAt ? "Reimprimir" : "Imprimir";
      btn.addEventListener("click", () => {
        failedIds.delete(order.id);
        printTicket(order)
          .then(() => {
            if (!order.printedAt) return markPrinted(order.id);
          })
          .catch((err) => handlePrintFailure(order, err));
      });

      row.appendChild(info);
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  }

  // ---------- Impressora Bluetooth ----------

  let wakeLock = null;

  // No celular, impede a tela de apagar — com a tela apagada o navegador
  // pausa a página e os pedidos param de sair.
  function keepScreenOn() {
    if (!("wakeLock" in navigator) || wakeLock) return;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLock = lock;
        lock.addEventListener("release", () => (wakeLock = null));
      })
      .catch(() => {});
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && btPrinter.device) keepScreenOn();
  });

  function renderBtStatus(message) {
    if (!btPrinter.supported()) {
      btBtn.hidden = true;
      btStatusEl.textContent =
        "Este navegador não conecta em impressora Bluetooth. Use o Chrome no Android ou no Windows.";
      return;
    }
    btBtn.textContent = btPrinter.isConnected() ? "Trocar impressora" : "Conectar impressora Bluetooth";
    if (message) {
      btStatusEl.textContent = message;
    } else if (btPrinter.isConnected()) {
      btStatusEl.textContent = `🟢 Impressora conectada: ${btPrinter.deviceName()}`;
    } else if (btPrinter.device) {
      btStatusEl.textContent = `🟠 ${btPrinter.deviceName()} desconectada — tento reconectar no próximo pedido.`;
    } else {
      btStatusEl.textContent = "Nenhuma impressora Bluetooth conectada.";
    }
  }

  btPrinter.onStatusChange = () => {
    renderBtStatus();
    if (btPrinter.isConnected() && failedIds.size) {
      failedIds.clear();
      handleOrders(lastOrders);
    }
  };

  btBtn.addEventListener("click", () => {
    btPrinter
      .choose()
      .then(keepScreenOn)
      .catch((err) => {
        if (err && err.name === "NotFoundError") return; // cancelou a escolha
        console.warn("Não foi possível conectar à impressora.", err);
        renderBtStatus("⚠️ Não consegui conectar. Ligue a impressora, chegue perto e tente de novo.");
      });
  });

  // ---------- Inicialização ----------

  function renderNotice() {
    if (getOrdersRef()) {
      noticeEl.innerHTML =
        "🟢 <strong>Conectado.</strong> Os pedidos feitos no site aparecem aqui e são impressos na hora. " +
        "Mantenha esta página aberta na tela.";
    } else {
      noticeEl.innerHTML =
        "⚠️ <strong>Firebase não configurado.</strong> Sem ele esta página não recebe os pedidos dos clientes " +
        "(configure js/firebase-config.js).";
    }
  }

  // Reconecta sozinho à impressora da última vez e, se ela estiver
  // desligada ou longe, continua tentando — sem precisar de ninguém tocar
  // na tela.
  const BT_RETRY_MS = 20 * 1000;
  const BT_RESTORE_WAIT_MS = 8 * 1000;

  // Resolve quando a reconexão terminar (ou após BT_RESTORE_WAIT_MS).
  function restorePrinter() {
    setInterval(() => {
      if (btPrinter.device && !btPrinter.isConnected()) btPrinter.connect().catch(() => {});
    }, BT_RETRY_MS);

    const attempt = btPrinter
      .restore()
      .then((restored) => {
        if (restored) keepScreenOn();
      })
      .catch((err) => {
        console.warn("Não foi possível reconectar à impressora salva.", err);
        renderBtStatus();
      });
    return Promise.race([attempt, new Promise((r) => setTimeout(r, BT_RESTORE_WAIT_MS))]);
  }

  function start() {
    loginSection.hidden = true;
    panelSection.hidden = false;
    renderNotice();
    renderBtStatus();
    if (!unsubscribe) {
      // Espera a tentativa de reconexão antes de assinar os pedidos, para
      // que os pedidos pendentes saiam pela impressora Bluetooth e não pela
      // janela de impressão do navegador.
      unsubscribe = () => {};
      restorePrinter().then(() => {
        unsubscribe = subscribeOrders(handleOrders);
      });
    }
  }

  const savedPaper = storageGet(PAPER_KEY) || "58";
  paperEl.value = savedPaper;
  applyPaper(savedPaper);
  paperEl.addEventListener("change", () => {
    storageSet(PAPER_KEY, paperEl.value);
    applyPaper(paperEl.value);
  });

  autoPrintEl.checked = storageGet(AUTO_KEY) !== "0";
  autoPrintEl.addEventListener("change", () => storageSet(AUTO_KEY, autoPrintEl.checked ? "1" : "0"));

  testBtn.addEventListener("click", () => {
    const sample = {
      id: "teste",
      createdAt: Date.now(),
      items: [
        { name: "Coxinha", price: 6, qty: 2 },
        { name: "Refrigerante lata", price: 6, qty: 1 },
      ],
      total: 18,
      deliveryType: "mesa",
      tableNumber: "3",
      paymentMethod: "Dinheiro",
      paymentChange: "R$ 20,00",
    };
    printTicket(sample).catch((err) => {
      console.warn("Falha ao imprimir o teste.", err);
      renderBtStatus("⚠️ Não consegui imprimir o teste. Verifique se a impressora está ligada.");
    });
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passwordInput.value === STATION_PASSWORD) {
      storageSet(SESSION_KEY, "1");
      loginError.textContent = "";
      start();
    } else {
      loginError.textContent = "Senha incorreta.";
    }
  });

  // Fica logado mesmo depois de reiniciar o aparelho, para a impressão
  // voltar sozinha.
  if (storageGet(SESSION_KEY) === "1") start();
})();
