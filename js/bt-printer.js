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

  // true se esta página já foi usada com uma impressora Bluetooth.
  hasSavedPrinter() {
    try {
      return !!localStorage.getItem(BT_SAVED_DEVICE_KEY);
    } catch (e) {
      return false;
    }
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
  // columns: letras por linha no tamanho normal (32 no papel 58mm, 48 no 80mm).
  // options.upper: tudo em maiúsculas; options.allBold: tudo em negrito.
  constructor(columns, options = {}) {
    this.columns = columns;
    this.upper = !!options.upper;
    this.allBold = !!options.allBold;
    this.widthMult = 1;
    this.bytes = [0x1b, 0x40]; // inicializa a impressora
    if (this.allBold) this.bold(true);
  }

  // Letras que cabem numa linha no tamanho de letra atual.
  get width() {
    return Math.floor(this.columns / this.widthMult);
  }

  clean(value) {
    const text = escposText(value);
    return this.upper ? text.toUpperCase() : text;
  }

  raw(...values) {
    this.bytes.push(...values);
    return this;
  }

  text(value) {
    const clean = this.clean(value);
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
    return this.raw(0x1b, 0x45, on || this.allBold ? 1 : 0);
  }

  // Tamanho da letra: "normal", "tall" (dobro da altura, mesma largura) ou
  // "big" (dobro da altura e da largura — cabe metade das letras por linha).
  size(name) {
    const sizes = { normal: [1, 0x00], tall: [1, 0x01], big: [2, 0x11] };
    const [mult, value] = sizes[name] || sizes.normal;
    this.widthMult = mult;
    return this.raw(0x1d, 0x21, value);
  }

  big(on) {
    return this.size(on ? "big" : "normal");
  }

  // Quebra o texto em linhas sem cortar palavras no meio.
  wrapText(value, width = this.width) {
    const lines = [];
    String(value == null ? "" : value)
      .split("\n")
      .forEach((paragraph) => {
        let current = "";
        this.clean(paragraph)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((word) => {
            while (word.length > width) {
              if (current) {
                lines.push(current);
                current = "";
              }
              lines.push(word.slice(0, width));
              word = word.slice(width);
            }
            if (!word) return;
            if (!current) current = word;
            else if (current.length + 1 + word.length <= width) current += " " + word;
            else {
              lines.push(current);
              current = word;
            }
          });
        if (current) lines.push(current);
      });
    return lines;
  }

  // Imprime o texto quebrado por palavras no tamanho de letra atual.
  wrap(value) {
    this.wrapText(value).forEach((l) => this.line(l));
    return this;
  }

  // Linha separadora na largura toda (volta a letra para o tamanho normal).
  divider(char = "-") {
    return this.size("normal").line(char.repeat(this.columns));
  }

  // Texto à esquerda e valor à direita. Se não couber na mesma linha, o
  // texto quebra por palavras e o valor fica alinhado à direita na última.
  pair(left, right) {
    const width = this.width;
    const r = this.clean(right);
    const lines = this.wrapText(left, width);
    if (!lines.length) lines.push("");
    const last = lines[lines.length - 1];
    if (last.length + 1 + r.length > width) lines.push("");
    lines.forEach((text, i) => {
      if (i < lines.length - 1) this.line(text);
      else this.line(text + " ".repeat(Math.max(1, width - text.length - r.length)) + r);
    });
    return this;
  }

  // Espaço vertical pequeno (em pontos; 8 pontos = 1mm).
  gap(dots = 12) {
    return this.raw(0x1b, 0x4a, dots);
  }

  feed(lines) {
    return this.raw(0x1b, 0x64, lines);
  }

  build() {
    return new Uint8Array(this.bytes);
  }
}
