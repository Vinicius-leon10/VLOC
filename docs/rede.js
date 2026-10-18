// Rede sem servidor próprio: os jogadores conversam por um retransmissor MQTT público.
// A senha escolhe a sala (tópico) e criptografa tudo com AES-GCM, então o
// retransmissor e quem não tem a senha não conseguem ler nada.

// Servidores públicos gratuitos; se um falhar, tenta o próximo.
const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes) {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function salaDaSenha(senha) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`vloc-hotel:${senha}`)));
  const topico = `vloc-hotel/${[...hash.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  const base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']);
  const chave = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('vloc-hotel-sal'), iterations: 100000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { topico, chave };
}

async function cifrar(chave, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, enc.encode(JSON.stringify(obj))));
  const tudo = new Uint8Array(iv.length + dados.length);
  tudo.set(iv);
  tudo.set(dados, iv.length);
  return toBase64(tudo);
}

async function decifrar(chave, texto) {
  const tudo = fromBase64(texto);
  const dados = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: tudo.slice(0, 12) }, chave, tudo.slice(12));
  return JSON.parse(dec.decode(dados));
}

// Conecta na sala e chama aoReceber(msg) para cada mensagem dos outros jogadores.
// Usa todos os retransmissores ao mesmo tempo (se um cair, os outros seguram) e
// descarta as cópias repetidas. Retorna { enviar(msg), sair() }.
async function conectarSala(senha, meuId, aoReceber, aoMudarStatus) {
  const { topico, chave } = await salaDaSenha(senha);
  const despedida = await cifrar(chave, { type: 'bye', id: meuId, n: 'bye' });
  // ?broker=ws://... permite testar com um retransmissor local.
  const lista = new URLSearchParams(location.search).get('broker')?.split(',') || BROKERS;
  const vistos = new Set();

  const clientes = lista.map((url, i) => {
    const cliente = mqtt.connect(url, {
      clientId: `vloc_${meuId}_${i}`,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
      will: { topic: topico, payload: despedida, qos: 0 },
    });
    cliente.on('connect', () => {
      cliente.subscribe(topico, { qos: 0 });
      atualizarStatus();
    });
    cliente.on('close', atualizarStatus);
    cliente.on('error', () => {});
    cliente.on('message', async (_, payload) => {
      try {
        const msg = await decifrar(chave, payload.toString());
        if (msg.id === meuId || vistos.has(`${msg.id}:${msg.n}`)) return;
        vistos.add(`${msg.id}:${msg.n}`);
        if (vistos.size > 500) vistos.delete(vistos.values().next().value);
        aoReceber(msg);
      } catch {
        // Mensagem de outra sala ou corrompida: ignora.
      }
    });
    return cliente;
  });

  function atualizarStatus() {
    aoMudarStatus(clientes.some((c) => c.connected));
  }

  return {
    async enviar(msg) {
      const texto = await cifrar(chave, { ...msg, id: meuId, n: Math.random().toString(36).slice(2, 10) });
      clientes.forEach((c) => c.connected && c.publish(topico, texto));
    },
    sair() {
      clientes.forEach((c) => c.connected && c.publish(topico, despedida));
    },
  };
}
