# VLOC Hotel 🏨

Mini hotel isométrico (estilo Habbo), privado e simples, para jogar com amigos.

- Sala isométrica com móveis
- Clique no chão para andar (o avatar desvia dos móveis)
- Chat com balões em cima do avatar
- Protegido por senha
- Nome e cor do avatar personalizáveis

Tudo em ~500 linhas: `server.js` (Node + WebSocket) e `public/` (HTML + Canvas, sem framework).

## Rodar

```bash
npm install
SENHA=minhasenha npm start
```

Abra http://localhost:3000. A senha padrão é `amigos` se `SENHA` não for definida.

## Jogar com amigos pela internet

Opção rápida, sem deploy: com o servidor rodando, exponha a porta 3000 com
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
e mande o link + a senha para os amigos:

```bash
cloudflared tunnel --url http://localhost:3000
```

Opção permanente: publique em qualquer hospedagem Node com suporte a WebSocket
(Render, Railway, Fly.io) e defina a variável de ambiente `SENHA`.
