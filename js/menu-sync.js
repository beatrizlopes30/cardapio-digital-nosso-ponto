// Sincroniza em tempo real a lista de produtos removidos do cardápio, para
// que uma remoção feita pela dona no Menu Administrativo apareça
// instantaneamente para qualquer cliente, em qualquer aparelho.
//
// Usa o Firebase Realtime Database (js/firebase-config.js). Se o Firebase
// ainda não tiver sido configurado, ou falhar por qualquer motivo (sem
// internet, projeto incorreto etc.), cai automaticamente para um modo local
// via localStorage — o site continua funcionando, mas a remoção só vale no
// próprio aparelho/navegador, como antes.

const FIREBASE_DB_PATH = "removedProducts";
const LOCAL_FALLBACK_KEY = "nossoPontoRemovedProducts";

function isFirebaseConfigured() {
  return (
    typeof FIREBASE_CONFIG !== "undefined" &&
    !!FIREBASE_CONFIG.databaseURL &&
    !FIREBASE_CONFIG.databaseURL.includes("COLOQUE_AQUI")
  );
}

let firebaseRefCache = null;
let firebaseFailed = false;

function getFirebaseRef() {
  if (firebaseFailed || !isFirebaseConfigured() || typeof firebase === "undefined") return null;
  if (firebaseRefCache) return firebaseRefCache;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    firebaseRefCache = firebase.database().ref(FIREBASE_DB_PATH);
    return firebaseRefCache;
  } catch (e) {
    console.warn("Firebase indisponível — usando remoções apenas locais neste aparelho.", e);
    firebaseFailed = true;
    return null;
  }
}

// Chaves do Realtime Database não podem conter . # $ [ ] / — os IDs de
// produto usam "::" e nomes livres, então precisam ser codificados.
function toFirebaseKey(id) {
  return encodeURIComponent(id).replace(/\./g, "%2E");
}

function fromFirebaseKey(key) {
  return decodeURIComponent(key);
}

function getLocalRemovedIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setLocalRemovedIds(ids) {
  localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(ids));
}

const localListeners = new Set();

function notifyLocalListeners() {
  const ids = getLocalRemovedIds();
  localListeners.forEach((cb) => cb(ids));
}

// Assina mudanças na lista de produtos removidos. callback(idsArray) é
// chamado imediatamente com o estado atual e de novo a cada mudança.
// Retorna uma função para cancelar a assinatura.
function subscribeRemovedProducts(callback) {
  const ref = getFirebaseRef();

  if (!ref) {
    localListeners.add(callback);
    callback(getLocalRemovedIds());
    const onStorage = (e) => {
      if (e.key === LOCAL_FALLBACK_KEY) callback(getLocalRemovedIds());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      localListeners.delete(callback);
      window.removeEventListener("storage", onStorage);
    };
  }

  const handler = (snapshot) => {
    const val = snapshot.val() || {};
    callback(Object.keys(val).map(fromFirebaseKey));
  };
  ref.on("value", handler, (err) => {
    console.warn("Firebase: erro ao ler removedProducts, caindo para modo local.", err);
    firebaseFailed = true;
    subscribeRemovedProducts(callback);
  });
  return () => ref.off("value", handler);
}

// Marca/desmarca um produto como removido. Retorna uma Promise.
function setProductRemoved(id, removed) {
  const ref = getFirebaseRef();

  if (!ref) {
    const ids = getLocalRemovedIds();
    const idx = ids.indexOf(id);
    if (removed && idx === -1) ids.push(id);
    if (!removed && idx !== -1) ids.splice(idx, 1);
    setLocalRemovedIds(ids);
    notifyLocalListeners();
    return Promise.resolve();
  }

  const key = toFirebaseKey(id);
  return removed ? ref.child(key).set(true) : ref.child(key).remove();
}

// Remove todas as marcações (restaura o cardápio inteiro). Retorna uma Promise.
function restoreAllProducts() {
  const ref = getFirebaseRef();

  if (!ref) {
    setLocalRemovedIds([]);
    notifyLocalListeners();
    return Promise.resolve();
  }

  return ref.remove();
}
