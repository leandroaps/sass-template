#!/bin/sh
set -e

# Aplica migrations antes de subir o servidor.
# Em produção com múltiplas réplicas, prefira rodar migrations
# como um job separado (release phase) para evitar corrida.
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "→ Aplicando migrations..."
  ./node_modules/.bin/tsx scripts/migrate.ts
fi

exec "$@"
