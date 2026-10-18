#!/usr/bin/env bash
# Desliga o hotel sem apagar nada.
cd "$(dirname "$0")/nitro-docker" && docker compose stop && echo "Hotel desligado."
