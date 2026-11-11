#!/bin/bash
set -e

if ! command -v fail2ban-client >/dev/null 2>&1; then
    echo "fail2ban-client non installe sur ce serveur."
    exit 0
fi

mkdir -p /etc/fail2ban/filter.d /etc/fail2ban/jail.d

# Filtre strictement limite aux abus 401/403/429 sur /admin et /api sensitives
# N'impacte jamais les pages SEO publiques (/books, /packs, /blog, /sitemap*, /api/merchant-image*)
cat <<'EOF' > /etc/fail2ban/filter.d/riwaya-admin-api.conf
[Definition]
failregex = ^<HOST> - \S+ \[.*?\] "(?:GET|POST|PUT|PATCH|DELETE) /(?:(?:ar|fr|en)/)?admin(?:/[^\s"]*)?\s+HTTP/[^"]+" (?:401|403|429)\s
            ^<HOST> - \S+ \[.*?\] "(?:POST|PUT|PATCH|DELETE) /api/(?:admin|mobile/auth|checkout|public|webhooks)(?:/[^\s"]*)?\s+HTTP/[^"]+" (?:401|403|429)\s
ignoreregex = ^<HOST> - \S+ \[.*?\] "GET /api/merchant-(?:pack-)?image/
              ^<HOST> - \S+ \[.*?\] "GET /(?:(?:ar|fr|en)/)?(?:books|packs|blog|collection|sitemap|robots\.txt|ads\.txt)
EOF

# Surcharge .local prioritaire sur jail.conf et jail.local : fenetre et ban de 2 heures
cat <<'EOF' > /etc/fail2ban/jail.d/99-riwaya.local
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
bantime = 2h
findtime = 2h
maxretry = 5

[sshd]
enabled = true
port = ssh,2222
bantime = 2h
findtime = 2h
maxretry = 5
EOF

if [ -f /var/log/nginx/access.log ]; then
cat <<'EOF' >> /etc/fail2ban/jail.d/99-riwaya.local

[riwaya-admin-api]
enabled = true
port = http,https
filter = riwaya-admin-api
logpath = /var/log/nginx/access.log
bantime = 2h
findtime = 2h
maxretry = 20
EOF
fi

if [ -f /var/log/nginx/error.log ] && [ -f /etc/fail2ban/filter.d/nginx-limit-req.conf ]; then
cat <<'EOF' >> /etc/fail2ban/jail.d/99-riwaya.local

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
bantime = 2h
findtime = 2h
maxretry = 15
EOF
fi

fail2ban-client -t
systemctl reload fail2ban || fail2ban-client reload || systemctl restart fail2ban
echo "Fail2ban configure : bantime=2h, findtime=2h (SSH 2222 + /admin & /api, sans blocage Googlebot SEO)."
fail2ban-client status sshd || true
fail2ban-client status riwaya-admin-api || true
