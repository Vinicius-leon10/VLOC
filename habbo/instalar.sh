#!/usr/bin/env bash
# Instala um Habbo privado (cliente Nitro + emulador Arcturus Morningstar) via nitro-docker.
# Uso: ./instalar.sh            -> instalação completa
#      ./instalar.sh --br       -> também baixa os assets mais recentes do Habbo BR (demorado)
set -euo pipefail

cd "$(dirname "$0")"
AQUI="$(pwd)"
DIR="$AQUI/nitro-docker"
NITRO_DOCKER_COMMIT="aa5826938aa1f9f1660d75f0163e8af1f2fe5dcb"
MIRROR="https://git.mc8051.de/nitro"

passo() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
erro() { printf '\n\033[1;31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }

for cmd in git docker curl unzip; do
  command -v "$cmd" >/dev/null || erro "'$cmd' não encontrado. Veja os requisitos no README."
done
docker compose version >/dev/null 2>&1 || erro "Docker Compose não encontrado. Abra o Docker Desktop e tente de novo."

passo "1/7 Baixando o nitro-docker"
if [ ! -d "$DIR/.git" ]; then
  git clone https://github.com/Gurkengewuerz/nitro-docker.git "$DIR"
  git -C "$DIR" checkout -q "$NITRO_DOCKER_COMMIT"
fi
cd "$DIR"

passo "2/7 Criando arquivos de configuração"
for f in $(find . -type f -name 'example-*' -not -path './.git/*'); do
  destino="${f/example-/}"
  [ -f "$destino" ] || cp "$f" "$destino"
done

passo "3/7 Baixando os assets do Habbo (pode demorar)"
[ -d assets/swf/.git ] || git clone --depth 1 "$MIRROR/arcturus-morningstar-default-swf-pack.git" assets/swf/
[ -d assets/assets/.git ] || git clone --depth 1 "$MIRROR/default-assets.git" assets/assets/
if [ ! -f assets/assets/bundled/generic/room.nitro ]; then
  curl -fL -o room.nitro.zip "https://git.mc8051.de/attachments/e948e603-d0ea-4948-b313-e8290a1c4bc9"
  unzip -o room.nitro.zip -d assets/assets/bundled/generic
  rm -f room.nitro.zip
fi

passo "4/7 Subindo o banco de dados"
docker compose up db -d
printf 'Aguardando o MySQL ficar pronto'
for _ in $(seq 1 90); do
  if docker compose exec -T db sh -c 'mysqladmin ping -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then break; fi
  printf '.'; sleep 2
done
echo
docker compose exec -T db sh -c 'mysqladmin ping -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1 \
  || erro "O MySQL não respondeu. Veja: docker compose -f '$DIR/compose.yaml' logs db"

sql() { docker compose exec -T db sh -c 'mysql --force --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' 2>&1 | grep -v "Using a password" || true; }

passo "5/7 Criando as tabelas do hotel"
if docker compose exec -T db sh -c 'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE \"users\""' 2>/dev/null | grep -q users; then
  echo "Banco já instalado, pulando."
else
  [ -d sqlupdates-src ] || git clone --depth 1 --branch ms4/dev "$MIRROR/Arcturus-Community.git" sqlupdates-src
  U=sqlupdates-src/sqlupdates
  for f in arcturus/arcturus_3.0.0-stable_base_database--compact.sql \
           "$U/3_0_0 to 3_5_0.sql" "$U/3_5_0 to 4_0_0.sql" \
           "$U/4_0_0_pets_EN.sql" "$U/4_0_0_permissions.sql" \
           arcturus/perms_groups.sql; do
    [ -f "$f" ] || erro "Arquivo SQL não encontrado: $f"
    echo "Importando $(basename "$f")"
    sql < "$f"
  done
  sql < "$AQUI/configuracoes.sql"
fi

passo "6/7 Convertendo os assets e subindo o servidor (a primeira vez demora bastante)"
docker compose up assets -d
echo y | ./assets-build.sh
docker compose up arcturus --build -d

if [ "${1:-}" = "--br" ]; then
  passo "Extra: baixando os assets mais recentes do Habbo BR"
  command -v npx >/dev/null || erro "Node.js não encontrado (necessário para --br)."
  rm -rf assets/swf/gordon/PRODUCTION
  for c in badgeparts badges clothes effects furnitures gamedata gordon hotelview icons mp3 pets promo; do
    npx -y habbo-downloader --output ./assets/swf --domain com.br --command "$c"
  done
  cp -n assets/swf/dcr/hof_furni/icons/* assets/swf/dcr/hof_furni || true
  mv assets/swf/gordon/*PRODUCTION* assets/swf/gordon/PRODUCTION
  echo y | ./assets-build.sh
  docker compose restart arcturus
fi

passo "7/7 Compilando e subindo o cliente Nitro"
docker compose up nitro --build -d

cat <<EOF

$(printf '\033[1;32m')Hotel instalado!$(printf '\033[0m')

Crie seu usuário e pegue o link de entrada:
  habbo/entrar.sh SeuNome admin

Para os amigos entrarem de outro computador, veja "Jogar com amigos" no README.
EOF
