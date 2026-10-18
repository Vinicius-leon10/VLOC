#!/usr/bin/env bash
# Cria o usuário (se não existir) e mostra um link de entrada novo.
# Uso: ./entrar.sh Nome          -> usuário comum
#      ./entrar.sh Nome admin    -> administrador (rank 7, com todos os comandos)
set -euo pipefail
cd "$(dirname "$0")/nitro-docker"

NOME="${1:-}"
[[ "$NOME" =~ ^[A-Za-z0-9._-]{3,25}$ ]] || { echo "Uso: $0 Nome [admin]  (3 a 25 letras/números)"; exit 1; }
RANK=1
[ "${2:-}" = "admin" ] && RANK=7

TICKET="vloc-$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
AGORA=$(date +%s)
HOST=$(grep -o '"socket.url": *"ws://[^:"]*' nitro/renderer-config.json | sed 's#.*ws://##')

docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' 2>&1 <<SQL | grep -v "Using a password" || true
INSERT INTO users (username, password, mail, account_created, last_login, motto, \`rank\`, auth_ticket, ip_register, ip_current)
VALUES ('$NOME', '', NULL, $AGORA, $AGORA, 'VLOC Hotel', $RANK, '$TICKET', '127.0.0.1', '127.0.0.1')
ON DUPLICATE KEY UPDATE auth_ticket = '$TICKET'$( [ "$RANK" = 7 ] && echo ", \`rank\` = 7" );
SQL

echo
echo "Link de entrada de $NOME (vale para um login; rode de novo para gerar outro):"
echo "  http://$HOST:3000/?sso=$TICKET"
