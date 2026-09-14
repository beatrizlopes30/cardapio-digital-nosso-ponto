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

const FIREBASE_OVERRIDES_PATH = "productOverrides";
const LOCAL_OVERRIDES_KEY = "nossoPontoProductOverrides";

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

let firebaseOverridesRefCache = null;

function getFirebaseOverridesRef() {
  if (firebaseFailed || !isFirebaseConfigured() || typeof firebase === "undefined") return null;
  if (firebaseOverridesRefCache) return firebaseOverridesRefCache;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    firebaseOverridesRefCache = firebase.database().ref(FIREBASE_OVERRIDES_PATH);
    return firebaseOverridesRefCache;
  } catch (e) {
    console.warn("Firebase indisponível — usando edições apenas locais neste aparelho.", e);
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

function getLocalOverrides() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_OVERRIDES_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch (e) {
    return {};
  }
}

function setLocalOverrides(map) {
  localStorage.setItem(LOCAL_OVERRIDES_KEY, JSON.stringify(map));
}

const localOverridesListeners = new Set();

function notifyLocalOverridesListeners() {
  const map = getLocalOverrides();
  localOverridesListeners.forEach((cb) => cb(map));
}

// Assina mudanças nas edições de nome/preço dos produtos. callback(map) é
// chamado imediatamente com o estado atual — map: { [id]: { price?, text? } }
// — e de novo a cada mudança. Retorna uma função para cancelar a assinatura.
function subscribeProductOverrides(callback) {
  const ref = getFirebaseOverridesRef();

  if (!ref) {
    localOverridesListeners.add(callback);
    callback(getLocalOverrides());
    const onStorage = (e) => {
      if (e.key === LOCAL_OVERRIDES_KEY) callback(getLocalOverrides());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      localOverridesListeners.delete(callback);
      window.removeEventListener("storage", onStorage);
    };
  }

  const handler = (snapshot) => {
    const val = snapshot.val() || {};
    const map = {};
    Object.keys(val).forEach((key) => {
      map[fromFirebaseKey(key)] = val[key];
    });
    callback(map);
  };
  ref.on("value", handler, (err) => {
    console.warn("Firebase: erro ao ler productOverrides, caindo para modo local.", err);
    firebaseFailed = true;
    subscribeProductOverrides(callback);
  });
  return () => ref.off("value", handler);
}

// Define a edição de nome/preço de um produto. `data` é { price?, text? };
// campos omitidos voltam ao valor original definido no código. Retorna uma Promise.
function setProductOverride(id, data) {
  const ref = getFirebaseOverridesRef();

  if (!ref) {
    const map = getLocalOverrides();
    map[id] = data;
    setLocalOverrides(map);
    notifyLocalOverridesListeners();
    return Promise.resolve();
  }

  return ref.child(toFirebaseKey(id)).set(data);
}

// Remove a edição de um produto, restaurando nome e preço originais. Retorna uma Promise.
function clearProductOverride(id) {
  const ref = getFirebaseOverridesRef();

  if (!ref) {
    const map = getLocalOverrides();
    delete map[id];
    setLocalOverrides(map);
    notifyLocalOverridesListeners();
    return Promise.resolve();
  }

  return ref.child(toFirebaseKey(id)).remove();
}
