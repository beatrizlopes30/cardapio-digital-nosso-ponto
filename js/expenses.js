// Registro de despesas — gastos lançados pela dona do ponto no Menu
// Administrativo (insumos, embalagens, gás, aluguel etc.), usados para
// calcular o lucro do período (faturamento - despesas).
//
// Usa o mesmo Firebase Realtime Database de js/orders.js. Se o Firebase não
// estiver configurado ou falhar, cai para um modo local (localStorage),
// válido só neste aparelho.
//
// Estrutura gravada em /expenses/{id}:
//   {
//     createdAt: 1735500000000,        // epoch ms
//     dateKey: "2026-08-29",           // data da despesa, para agrupar por dia
//     description: "Leite condensado",
//     category: "Insumos",
//     amount: 42.9
//   }

const EXPENSES_DB_PATH = "expenses";
const EXPENSES_LOCAL_KEY = "nossoPontoExpenses";

let expensesRefCache = null;
let expensesFirebaseFailed = false;

function getExpensesRef() {
  if (expensesFirebaseFailed || !ordersFirebaseAvailable()) return null;
  if (expensesRefCache) return expensesRefCache;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    expensesRefCache = firebase.database().ref(EXPENSES_DB_PATH);
    return expensesRefCache;
  } catch (e) {
    console.warn("Firebase indisponível — despesas serão registradas apenas localmente.", e);
    expensesFirebaseFailed = true;
    return null;
  }
}

function getLocalExpenses() {
  try {
    const raw = JSON.parse(localStorage.getItem(EXPENSES_LOCAL_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setLocalExpenses(expenses) {
  localStorage.setItem(EXPENSES_LOCAL_KEY, JSON.stringify(expenses));
  window.dispatchEvent(new Event("nossoPontoExpensesChanged"));
}

// Grava uma nova despesa. Retorna uma Promise com o id gerado.
function addExpense(expense) {
  const payload = {
    createdAt: Date.now(),
    dateKey: expense.dateKey || todayDateKey(),
    description: expense.description || "",
    category: expense.category || "Outros",
    amount: expense.amount || 0,
  };

  const ref = getExpensesRef();
  if (!ref) {
    const expenses = getLocalExpenses();
    payload.id = "local-" + payload.createdAt + "-" + Math.random().toString(36).slice(2, 8);
    expenses.push(payload);
    setLocalExpenses(expenses);
    return Promise.resolve(payload.id);
  }

  return ref.push(payload).then((newRef) => newRef.key);
}

// Remove uma despesa. Retorna uma Promise.
function removeExpense(id) {
  const ref = getExpensesRef();
  if (!ref) {
    setLocalExpenses(getLocalExpenses().filter((e) => e.id !== id));
    return Promise.resolve();
  }
  return ref.child(id).remove();
}

// Assina as despesas em tempo real. callback(expensesArray) é chamado
// imediatamente com o estado atual e de novo a cada mudança. Retorna uma
// função para cancelar a assinatura.
function subscribeExpenses(callback) {
  const ref = getExpensesRef();

  if (!ref) {
    const emit = () => callback(getLocalExpenses());
    emit();
    const onStorage = (e) => {
      if (e.key === EXPENSES_LOCAL_KEY) emit();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("nossoPontoExpensesChanged", emit);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nossoPontoExpensesChanged", emit);
    };
  }

  const handler = (snapshot) => {
    const val = snapshot.val() || {};
    callback(Object.keys(val).map((key) => ({ id: key, ...val[key] })));
  };
  ref.on("value", handler, (err) => {
    console.warn("Firebase: erro ao ler despesas, caindo para modo local.", err);
    expensesFirebaseFailed = true;
    subscribeExpenses(callback);
  });
  return () => ref.off("value", handler);
}
