// Registro de pedidos — grava cada pedido enviado pelo cliente (itens, total,
// forma de entrega/mesa, pagamento) para alimentar as estatísticas do Menu
// Administrativo (faturamento do dia, pedidos por mesa, produtos mais
// vendidos etc.).
//
// Usa o mesmo Firebase Realtime Database já configurado em
// js/firebase-config.js (veja FIREBASE_DB_PATH em js/menu-sync.js). Se o
// Firebase não estiver configurado ou falhar, os pedidos caem para um modo
// local (localStorage) — as estatísticas nesse caso só existem no aparelho
// que fez o pedido, então para estatísticas reais é necessário configurar o
// Firebase.
//
// Estrutura gravada em /orders/{id}:
//   {
//     createdAt: 1735500000000,        // epoch ms
//     dateKey: "2026-08-29",           // data local, para agrupar por dia
//     items: [{ name, price, qty }],
//     total: 87.5,
//     deliveryType: "local" | "mesa" | "entrega",
//     tableNumber: "5" | null,
//     address: "Rua..." | null,
//     paymentMethod: "Pix",
//     paymentChange: "R$ 50,00" | null,
//     status: "novo" | "concluido"
//   }

const ORDERS_DB_PATH = "orders";
const ORDERS_LOCAL_KEY = "nossoPontoOrders";

function ordersFirebaseAvailable() {
  return (
    typeof FIREBASE_CONFIG !== "undefined" &&
    !!FIREBASE_CONFIG.databaseURL &&
    !FIREBASE_CONFIG.databaseURL.includes("COLOQUE_AQUI") &&
    typeof firebase !== "undefined"
  );
}

let ordersRefCache = null;
let ordersFirebaseFailed = false;

function getOrdersRef() {
  if (ordersFirebaseFailed || !ordersFirebaseAvailable()) return null;
  if (ordersRefCache) return ordersRefCache;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    ordersRefCache = firebase.database().ref(ORDERS_DB_PATH);
    return ordersRefCache;
  } catch (e) {
    console.warn("Firebase indisponível — pedidos serão registrados apenas localmente.", e);
    ordersFirebaseFailed = true;
    return null;
  }
}

function todayDateKey(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLocalOrders() {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDERS_LOCAL_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setLocalOrders(orders) {
  localStorage.setItem(ORDERS_LOCAL_KEY, JSON.stringify(orders));
}

// Grava um novo pedido. Retorna uma Promise resolvida quando salvo (ou
// imediatamente, no modo local). Nunca deve travar o envio do pedido pelo
// WhatsApp — trate falhas com .catch() sem bloquear o usuário.
function recordOrder(order) {
  const now = new Date();
  const payload = {
    createdAt: now.getTime(),
    dateKey: todayDateKey(now),
    items: order.items || [],
    total: order.total || 0,
    deliveryType: order.deliveryType || "local",
    tableNumber: order.tableNumber || null,
    address: order.address || null,
    paymentMethod: order.paymentMethod || "",
    paymentChange: order.paymentChange || null,
    status: "novo",
  };

  const ref = getOrdersRef();

  if (!ref) {
    const orders = getLocalOrders();
    payload.id = "local-" + now.getTime() + "-" + Math.random().toString(36).slice(2, 8);
    orders.push(payload);
    setLocalOrders(orders);
    return Promise.resolve(payload.id);
  }

  return ref
    .push(payload)
    .then((newRef) => newRef.key)
    .catch((e) => {
      console.warn("Firebase: erro ao gravar pedido, caindo para modo local.", e);
      ordersFirebaseFailed = true;
      return recordOrder(order);
    });
}

// Assina os pedidos em tempo real. callback(ordersArray) é chamado
// imediatamente com o estado atual e de novo a cada mudança. Retorna uma
// função para cancelar a assinatura.
function subscribeOrders(callback) {
  const ref = getOrdersRef();

  if (!ref) {
    const emit = () => callback(getLocalOrders());
    emit();
    const onStorage = (e) => {
      if (e.key === ORDERS_LOCAL_KEY) emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }

  const handler = (snapshot) => {
    const val = snapshot.val() || {};
    const orders = Object.keys(val).map((key) => ({ id: key, ...val[key] }));
    callback(orders);
  };
  ref.on("value", handler, (err) => {
    console.warn("Firebase: erro ao ler pedidos, caindo para modo local.", err);
    ordersFirebaseFailed = true;
    subscribeOrders(callback);
  });
  return () => ref.off("value", handler);
}

// Atualiza o status de um pedido (ex.: "novo" -> "concluido"). Retorna uma Promise.
function setOrderStatus(id, status) {
  const ref = getOrdersRef();

  if (!ref) {
    const orders = getLocalOrders();
    const order = orders.find((o) => o.id === id);
    if (order) {
      order.status = status;
      setLocalOrders(orders);
    }
    return Promise.resolve();
  }

  return ref.child(id).update({ status });
}
