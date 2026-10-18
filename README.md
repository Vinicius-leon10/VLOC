# VLOC Hotel 🏨

Hotel isométrico pequeno, no estilo Habbo, para jogar com amigos no navegador
do iPhone (ou de qualquer celular/computador). Roda direto no **GitHub Pages**,
sem servidor próprio e de graça.

- Toque no chão para andar (o boneco desvia dos móveis)
- Chat com balões que sobem pela tela, como no Habbo
- **A senha é a sala:** quem usa a mesma senha se encontra; o resto não vê nada
- Pode ser adicionado à tela de início do iPhone como um app

## Colocar no ar (tudo pelo iPhone, no site github.com)

1. **Deixe o repositório público:** *Settings → General →* lá embaixo em
   *Danger Zone → Change visibility → Public*.
2. **Ative o Pages:** *Settings → Pages →* em *Build and deployment* escolha
   *Deploy from a branch*, branch **`claude/mini-hotel`** (ou `main`, se já
   tiver juntado) e pasta **`/docs`** → *Save*.
3. Em 1 ou 2 minutos o jogo estará em
   **https://vinicius-leon10.github.io/VLOC/**
4. Mande o link e a senha da sala para os amigos. No Safari, toque em
   *Compartilhar → Adicionar à Tela de Início*.

## Como funciona sem servidor

O GitHub Pages só entrega os arquivos do jogo. Para os jogadores se verem, cada
navegador manda e recebe mensagens por retransmissores públicos gratuitos
(MQTT: HiveMQ, EMQX e Mosquitto, todos ao mesmo tempo, para o caso de um cair).

A senha nunca sai do aparelho: dela saem o nome da sala e a chave que
criptografa tudo (AES-256-GCM). Os retransmissores e quem não tem a senha só
veem dados embaralhados.

Cada navegador calcula o caminho do próprio boneco e avisa os outros, que
animam o mesmo trajeto. Quem fecha a página sai da lista na hora (ou em até
16 s, se a internet cair).

## Código (`docs/`)

| Arquivo | O que faz |
|---|---|
| `index.html` | Login e ajustes para iPhone (tela cheia, ícone, teclado) |
| `game.js` | Sala, caminho (BFS), desenho isométrico em Canvas, zoom para celular e chat |
| `rede.js` | Conexão com os retransmissores e criptografia pela senha |

Para testar no computador: `python3 -m http.server -d docs 8000` e abra
http://localhost:8000.

## Habbo completo

A pasta [`habbo/`](habbo/README.md) tem scripts para rodar um Habbo fiel ao
original (Nitro + Arcturus). Ele precisa de um computador ou servidor ligado e
não roda no GitHub Pages.
