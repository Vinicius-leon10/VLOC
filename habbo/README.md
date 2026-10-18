# VLOC Hotel: Habbo privado 🏨

Habbo fiel ao original, rodando no seu computador, só para você e seus amigos.
É um projeto pessoal e de estudo, sem uso público nem comercial.

- **Cliente:** [Nitro](https://github.com/Gurkengewuerz/nitro), o cliente HTML5 que reproduz o Habbo atual (React + PixiJS)
- **Servidor:** [Arcturus Morningstar](https://git.mc8051.de/nitro/Arcturus-Community), emulador em Java
- **Infraestrutura:** [nitro-docker](https://github.com/Gurkengewuerz/nitro-docker), tudo em contêineres Docker

## Requisitos

- [Docker Desktop](https://www.docker.com/get-started/). No Windows, ative o WSL 2 na instalação.
- Git, curl e unzip. No Windows, rode tudo dentro do **WSL (Ubuntu)**.
- ~10 GB livres e 8 GB de RAM. A primeira instalação leva de 20 a 60 minutos.
- Opcional: [Node.js LTS](https://nodejs.org/), só para o modo `--br`.

## Instalar

Com o Docker Desktop aberto:

```bash
git clone https://github.com/Vinicius-leon10/VLOC.git
cd VLOC
habbo/instalar.sh
```

O script baixa o nitro-docker e os assets, cria o banco de dados, compila o
emulador e o cliente e sobe tudo. Se cair no meio, rode de novo: ele continua
de onde parou.

Para ter os móveis, roupas e textos mais recentes do **Habbo BR**, use
`habbo/instalar.sh --br`. Demora bem mais.

## Entrar no hotel

```bash
habbo/entrar.sh Vinicius admin   # você, com todos os poderes
habbo/entrar.sh Amigo            # usuário comum
```

O script mostra um link como `http://127.0.0.1:3000/?sso=vloc-...`. Abra no
navegador. Cada link vale para um login; rode de novo para gerar outro.

Como admin, digite `:commands` no chat para ver os comandos (`:credits`,
`:badge`, `:give`...).

## Jogar com amigos

Os amigos precisam alcançar seu computador. O jeito mais simples e privado é uma
VPN entre vocês, no estilo Hamachi, sem abrir portas no roteador:

1. Instale o [Tailscale](https://tailscale.com/download) (grátis) em você e nos
   amigos e coloque todos na mesma rede (ou use Radmin VPN / ZeroTier).
2. Descubra seu IP na VPN (algo como `100.x.y.z`) e rode:
   ```bash
   habbo/configurar-ip.sh 100.x.y.z
   ```
3. Gere um link para cada amigo com `habbo/entrar.sh NomeDoAmigo` e mande o
   link para ele.

Na mesma casa/Wi-Fi, use o IP local (ex.: `192.168.0.10`) no lugar do IP da VPN.
Se o Windows perguntar sobre o firewall, permita as portas 3000, 2096 e 8080.

## Dia a dia

| Comando | O que faz |
|---|---|
| `habbo/ligar.sh` | Liga o hotel |
| `habbo/desligar.sh` | Desliga sem apagar nada |
| `habbo/entrar.sh Nome` | Cria o usuário (se precisar) e gera link de entrada |
| `habbo/configurar-ip.sh IP` | Muda o endereço do hotel |

Logs do emulador: `cd habbo/nitro-docker && docker compose logs -f arcturus`

## Portas

| Serviço | Endereço |
|---|---|
| Cliente Nitro (o jogo) | http://127.0.0.1:3000 |
| WebSocket do emulador | ws://127.0.0.1:2096 |
| Assets (imagens, móveis) | http://127.0.0.1:8080 |
| Banco MySQL | 127.0.0.1:3310 (usuário `arcturus_user`, senha `arcturus_pw`) |

## Para estudar

- `nitro-docker/nitro/`: configuração do cliente (`renderer-config.json`, `ui-config.json`)
- `nitro-docker/arcturus/`: build do emulador e SQL base
- Código do cliente: https://github.com/Gurkengewuerz/nitro (`libs/renderer` é o motor isométrico)
- Banco: conecte o [HeidiSQL](https://www.heidisql.com/) ou o DBeaver na porta 3310 para ver usuários, quartos, catálogo...

> Os gráficos, sons e a marca Habbo pertencem à Sulake. Use só de forma
> privada, sem divulgar nem cobrar nada.
