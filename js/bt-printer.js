// Conexão direta com a mini impressora térmica Bluetooth (58mm) pelo Chrome,
// usando Web Bluetooth — sem driver e sem janela de impressão.
//
// Funciona no Chrome do Android e do Windows (não funciona no iPhone/Safari).
// Exige o site em HTTPS. O navegador só deixa escolher a impressora depois
// de um toque no botão "Conectar impressora"; depois disso, os pedidos são
// enviados sozinhos enquanto a página estiver aberta.

// Serviços BLE usados pelas mini impressoras térmicas genéricas mais comuns.
const BT_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4b77-9f37-e1d5f3d3d2b0",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];

const BT_SAVED_DEVICE_KEY = "nossoPontoBtPrinterId";

// Pacotes pequenos: essas impressoras não aceitam escritas longas.
const BT_CHUNK_SIZE = 20;

const btPrinter = {
  device: null,
  characteristic: null,
  onStatusChange: null,

  supported() {
    return typeof navigator !== "undefined" && !!navigator.bluetooth;
  },

  isConnected() {
    return !!(this.device && this.device.gatt.connected && this.characteristic);
  },

  deviceName() {
    return this.device ? this.device.name || "Impressora" : "";
  },

  notify() {
    if (typeof this.onStatusChange === "function") this.onStatusChange();
  },

  setDevice(device) {
    this.device = device;
    device.addEventListener("gattserverdisconnected", () => {
      this.characteristic = null;
      this.notify();
    });
    try {
      localStorage.setItem(BT_SAVED_DEVICE_KEY, device.id);
    } catch (e) {}
  },

  // Precisa ser chamado a partir de um clique (exigência do navegador).
  async choose() {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BT_PRINTER_SERVICES,
    });
    this.setDevice(device);
    await this.connect();
  },

  // Reabre a impressora escolhida da última vez, sem clique — assim, depois
  // de recarregar a página ou reiniciar o aparelho, a impressão volta
  // sozinha. Usa navigator.bluetooth.getDevices(), que só existe nas versões
  // mais novas do Chrome; nas outras, resolve false e é preciso tocar em
  // "Conectar impressora" de novo.
  async restore() {
    if (!this.supported() || typeof navigator.bluetooth.getDevices !== "function") return false;
    let savedId = null;
    try {
      savedId = localStorage.getItem(BT_SAVED_DEVICE_KEY);
    } catch (e) {}
    if (!savedId) return false;
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find((d) => d.id === savedId);
    if (!device) return false;
    this.setDevice(device);
    this.notify();
    await this.connect();
    return true;
  },

  async connect() {
    if (!this.device) throw new Error("Nenhuma impressora escolhida.");
    const server = await this.device.gatt.connect();
    this.characteristic = await findWritableCharacteristic(server);
    this.notify();
  },

  // Reconecta sozinho se a impressora caiu (desligou, saiu de alcance...).
  async ensureConnected() {
    if (this.isConnected()) return;
    await this.connect();
  },

  async write(bytes) {
    await this.ensureConnected();
    const ch = this.characteristic;
    const withoutResponse = ch.properties.writeWithoutResponse && !ch.properties.write;
    for (let i = 0; i < bytes.length; i += BT_CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + BT_CHUNK_SIZE);
      if (withoutResponse) {
        await ch.writeValueWithoutResponse(chunk);
        await new Promise((r) => setTimeout(r, 15));
      } else {
        await ch.writeValue(chunk);
      }
    }
  },
};

async function findWritableCharacteristic(server) {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const found = characteristics.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (found) return found;
  }
  throw new Error("Não achei como enviar dados para esta impressora.");
}

// ---------- Montagem da comanda em ESC/POS ----------

// A maioria dessas impressoras não tem acentos na fonte padrão — tira os
// acentos para não sair caractere estranho.
function escposText(text) {
  return String(text == null ? "" : text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[^\x20-\x7e\n]/g, "");
}

class EscPosBuilder {
  constructor(columns) {
    this.columns = columns;
    this.bytes = [0x1b, 0x40]; // inicializa a impressora
  }

  raw(...values) {
    this.bytes.push(...values);
    return this;
  }

  text(value) {
    const clean = escposText(value);
    for (let i = 0; i < clean.length; i++) this.bytes.push(clean.charCodeAt(i));
    return this;
  }

  line(value = "") {
    return this.text(value).raw(0x0a);
  }

  align(pos) {
    return this.raw(0x1b, 0x61, { left: 0, center: 1, right: 2 }[pos]);
  }

  bold(on) {
    return this.raw(0x1b, 0x45, on ? 1 : 0);
  }

  big(on) {
    return this.raw(0x1d, 0x21, on ? 0x11 : 0x00);
  }

  divider() {
    return this.line("-".repeat(this.columns));
  }

  // Texto à esquerda e valor à direita na mesma linha; se o texto não couber,
  // quebra em mais linhas.
  pair(left, right, columns = this.columns) {
    const l = escposText(left);
    const r = escposText(right);
    const room = columns - r.length - 1;
    const words = l.split(" ");
    const lines = [];
    let current = "";
    words.forEach((w) => {
      if ((current + " " + w).trim().length > room && current) {
        lines.push(current);
        current = w;
      } else {
        current = (current + " " + w).trim();
      }
    });
    lines.push(current);
    lines.forEach((text, i) => {
      if (i < lines.length - 1) this.line(text);
      else this.line(text + " ".repeat(Math.max(1, columns - text.length - r.length)) + r);
    });
    return this;
  }

  feed(lines) {
    return this.raw(0x1b, 0x64, lines);
  }

  build() {
    return new Uint8Array(this.bytes);
  }
}
