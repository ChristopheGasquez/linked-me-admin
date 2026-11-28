#!/bin/sh
PORT=${PORT:-80}
sed -i "s/listen 80;/listen $PORT;/" /etc/nginx/conf.d/default.conf
sed -i "s|__API_URL__|${API_URL:-}|" /etc/nginx/conf.d/default.conf
cat > /usr/share/nginx/html/config.json <<EOF
{
  "apiUrl": "${API_URL:-}",
  "turnstileSiteKey": "${TURNSTILE_SITE_KEY:-}"
}
EOF
exec "$@"
