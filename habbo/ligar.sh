#!/usr/bin/env bash
# Liga o hotel (depois de instalado).
cd "$(dirname "$0")/nitro-docker" && docker compose up -d db assets imager imgproxy arcturus nitro && echo "Hotel ligado."
