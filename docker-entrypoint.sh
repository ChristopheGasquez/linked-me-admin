#!/bin/sh
cat > /usr/share/nginx/html/config.json <<EOF
{
  "apiUrl": "${API_URL:-}"
}
EOF
exec "$@"
