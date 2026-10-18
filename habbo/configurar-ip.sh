#!/usr/bin/env bash
# Troca o endereço do hotel para que amigos possam entrar de outros computadores.
# Uso: ./configurar-ip.sh 100.64.0.5   (IP da sua máquina na VPN, ex.: Tailscale ou Radmin VPN)
#      ./configurar-ip.sh 127.0.0.1    (volta a ser só local)
set -euo pipefail
cd "$(dirname "$0")/nitro-docker"

IP="${1:-}"
[[ "$IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || { echo "Uso: $0 IP  (ex.: 100.64.0.5)"; exit 1; }

for f in nitro/renderer-config.json nitro/ui-config.json; do
  sed -i.bak -E "s#(ws|http)://[0-9]{1,3}(\.[0-9]{1,3}){3}:(2096|8080|8081)#\1://$IP:\3#g" "$f"
  rm -f "$f.bak"
done
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' 2>&1 <<SQL | grep -v "Using a password" || true
UPDATE emulator_settings SET \`value\` = REGEXP_REPLACE(\`value\`, 'http://[0-9.]+:8080', 'http://$IP:8080') WHERE \`key\` IN ('camera.url', 'imager.url.youtube');
SQL
docker compose restart nitro arcturus >/dev/null
echo "Pronto! O hotel agora responde em http://$IP:3000"
