// Menu Administrativo — permite à dona do ponto ativar/desativar produtos
// do cardápio sem precisar mexer no código.
//
// A senha abaixo é só uma trava simples de tela (não é segurança de
// verdade — qualquer pessoa com acesso ao código-fonte consegue lê-la).
// As remoções são sincronizadas em tempo real via Firebase (js/menu-sync.js);
// se o Firebase não estiver configurado, caem para um modo local
// (localStorage), válido só neste aparelho.
(function () {
  const ADMIN_PASSWORD = "Nosso@Ponto2026";
  const SESSION_KEY = "nossoPontoAdminAuthed";

  const loginSection = document.getElementById("adminLogin");
  const panelSection = document.getElementById("adminPanel");
  const loginForm = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("adminPassword");
  const loginError = document.getElementById("adminLoginError");
  const searchInput = document.getElementById("adminSearch");
  const listEl = document.getElementById("adminList");
  const emptyEl = document.getElementById("adminEmpty");
  const restoreAllBtn = document.getElementById("adminRestoreAllBtn");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const syncNoticeEl = document.getElementById("adminSyncNotice");
  const tabProductsBtn = document.getElementById("tabProductsBtn");
  const tabStatsBtn = document.getElementById("tabStatsBtn");
  const tabProducts = document.getElementById("tabProducts");
  const tabStats = document.getElementById("tabStats");

  let currentRemovedIds = [];

  function formatPrice(value) {
    return typeof value === "number" ? "R$ " + value.toFixed(2).replace(".", ",") : "—";
  }

  function renderSyncNotice() {
    if (isFirebaseConfigured()) {
      syncNoticeEl.innerHTML =
        "🟢 <strong>Sincronização em tempo real ativa.</strong> Ao remover ou reativar um produto aqui, " +
        "a mudança aparece na hora para qualquer cliente, em qualquer aparelho.";
    } else {
      syncNoticeEl.innerHTML =
        "⚠️ <strong>Sincronização em tempo real ainda não configurada.</strong> Por enquanto, as remoções " +
        "feitas aqui valem somente <strong>neste navegador/dispositivo</strong> — configure o Firebase " +
        "(js/firebase-config.js) para que a mudança apareça na hora para todos os clientes.";
    }
  }

  function showPanel() {
    loginSection.hidden = true;
    panelSection.hidden = false;
    renderSyncNotice();
    renderList();
  }

  function showLogin() {
    loginSection.hidden = false;
    panelSection.hidden = true;
  }

  function buildRow(entry, removedSet) {
    const isRemoved = removedSet.has(entry.id);
    const codeDisabled = entry.entity.available === false && !isRemoved;

    const row = document.createElement("div");
    row.className = "admin-row" + (isRemoved || codeDisabled ? " is-removed" : "");

    const info = document.createElement("div");
    info.className = "admin-row-info";

    const name = document.createElement("span");
    name.className = "admin-row-name";
    name.textContent = entry.label;
    info.appendChild(name);

    const meta = document.createElement("span");
    meta.className = "admin-row-meta";
    meta.textContent = formatPrice(entry.price);
    info.appendChild(meta);

    row.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "admin-row-actions";

    const tag = document.createElement("span");
    tag.className = "admin-status-tag " + (codeDisabled ? "code-disabled" : isRemoved ? "removed" : "available");
    tag.textContent = codeDisabled ? "Fixo no código" : isRemoved ? "Removido" : "Disponível";
    actions.appendChild(tag);

    const switchLabel = document.createElement("label");
    switchLabel.className = "admin-toggle-switch";
    switchLabel.title = codeDisabled
      ? "Este produto está marcado como indisponível diretamente no código (js/menu-data.js) e não pode ser reativado por aqui."
      : "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !isRemoved && !codeDisabled;
    checkbox.disabled = codeDisabled;
    checkbox.addEventListener("change", () => {
      toggleProduct(entry.id, !checkbox.checked);
    });
    switchLabel.appendChild(checkbox);

    const slider = document.createElement("span");
    slider.className = "admin-toggle-slider";
    switchLabel.appendChild(slider);

    actions.appendChild(switchLabel);
    row.appendChild(actions);

    return row;
  }

  function toggleProduct(id, remove) {
    setProductRemoved(id, remove).catch((e) => {
      alert("Não foi possível salvar a alteração. Verifique sua conexão e tente novamente.\n" + e.message);
    });
  }

  function renderList() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const removedSet = new Set(currentRemovedIds);

    listEl.innerHTML = "";
    let totalShown = 0;

    MENU_DATA.forEach((category) => {
      const entries = [];
      forEachMenuProduct((entry) => {
        if (entry.category.id !== category.id) return;
        if (query && !entry.label.toLowerCase().includes(query)) return;
        entries.push(entry);
      });

      if (entries.length === 0) return;

      const catBlock = document.createElement("div");
      catBlock.className = "admin-category";

      const heading = document.createElement("h2");
      heading.textContent = `${category.icon} ${category.title}`;
      catBlock.appendChild(heading);

      entries.forEach((entry) => {
        catBlock.appendChild(buildRow(entry, removedSet));
        totalShown++;
      });

      listEl.appendChild(catBlock);
    });

    emptyEl.hidden = totalShown !== 0;
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passwordInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      loginError.textContent = "";
      passwordInput.value = "";
      showPanel();
    } else {
      loginError.textContent = "Senha incorreta. Tente novamente.";
    }
  });

  restoreAllBtn.addEventListener("click", () => {
    if (currentRemovedIds.length === 0) return;
    if (confirm("Restaurar todos os produtos removidos?")) {
      restoreAllProducts().catch((e) => {
        alert("Não foi possível restaurar os produtos. Verifique sua conexão e tente novamente.\n" + e.message);
      });
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  searchInput.addEventListener("input", renderList);

  tabProductsBtn.addEventListener("click", () => {
    tabProductsBtn.classList.add("active");
    tabStatsBtn.classList.remove("active");
    tabProducts.hidden = false;
    tabStats.hidden = true;
  });

  tabStatsBtn.addEventListener("click", () => {
    tabStatsBtn.classList.add("active");
    tabProductsBtn.classList.remove("active");
    tabStats.hidden = false;
    tabProducts.hidden = true;
    if (typeof refreshStats === "function") refreshStats();
  });

  // Mantém a lista de removidos sempre atualizada (inclusive vinda de
  // outro aparelho ou de outra aba), mesmo antes do login.
  subscribeRemovedProducts((ids) => {
    currentRemovedIds = ids;
    if (!panelSection.hidden) renderList();
  });

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showPanel();
  } else {
    showLogin();
  }
})();
