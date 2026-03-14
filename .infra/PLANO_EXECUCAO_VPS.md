# 📋 PLANO DE EXECUÇÃO VPS - XpertIA

## 🎯 Status

**SNAPSHOT CRIADO:** ✅ Backup do estado atual disponível  
**AUTORIZAÇÃO:** ⏳ Aguardando aprovação para iniciar  
**PREVISÃO DE TEMPO:** ~30-45 minutos  
**RISCO:** Baixo (snapshot permite rollback)

---

## 📊 RESUMO EXECUTIVO

### Decisões Consolidadas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Workflow** | Remoto (VSCode SSH) | Teste instantâneo, desenvolvimento ágil |
| **PostgreSQL** | 8GB RAM / 3 cores | Cache generoso para RAG e embeddings |
| **Mastra/PM2** | 8GB RAM / 3 cores | Múltiplos agents, workflows pesados |
| **Nginx** | 1GB RAM / 1 core | Cache SSL, múltiplas conexões |
| **SO/Reserva** | ~6GB / 1 core | Sistema operacional e margem |

### Alocação de Recursos Final

| Serviço | RAM | CPU | Status |
|---------|-----|-----|--------|
| **PostgreSQL** | 8GB | 3 cores | ⬆️ Aumentado (era 4GB/2cores) |
| **Mastra/PM2** | 8GB | 3 cores | ⬆️ Aumentado (era 4GB/3cores) |
| **Nginx** | 1GB | 1 core | ⬆️ Aumentado (era 512MB/0.5core) |
| **SO/Reserva** | ~6GB | 1 core | Margem de segurança |
| **Total Alocado** | **~23GB** | **8 cores** | VPS: 24GB/8cores |

---

## 🔍 VERIFICAÇÃO DAS CONFIGURAÇÕES

### ✅ Configurações Validadas em `.infra/`

| Arquivo | Status | Observação |
|---------|--------|------------|
| `docker-compose.prod.yml` | ✅ OK | Ampliado para 8GB PostgreSQL |
| `pm2-ecosystem.config.js` | ✅ OK | Ampliado para 8GB Mastra |
| `setup-vps.sh` | ✅ OK | Script de instalação validado |
| `vps-deployment-guide.md` | ✅ OK | Documentação completa |

### 📁 Arquivos que serão copiados para VPS

```
.infra/
├── docker/docker-compose.prod.yml          → /opt/xpertia/docker/
├── docker/configs/nginx/nginx.conf         → /opt/xpertia/docker/configs/nginx/
├── docker/configs/nginx/conf.d/mastra.conf → /opt/xpertia/docker/configs/nginx/conf.d/
├── pm2-ecosystem.config.js                 → /opt/xpertia/app/
├── postgreSQL/01-init-database.sql         → /opt/xpertia/docker/postgreSQL/
└── scripts/setup-vps.sh                    → /opt/xpertia/scripts/
```

---

## 📋 ORDEM DE EXECUÇÃO DOS PASSOS

### FASE 1: Preparação do Sistema (5 min)
**Objetivo:** Garantir acesso root sem senha e limpar usuários

```bash
# 1.1 Verificar se root já é sudoer sem senha
ssh root@5.189.185.146 "grep 'root' /etc/sudoers"

# 1.2 Se necessário, configurar sudoers
ssh root@5.189.185.146 "echo 'root ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/root-nopasswd"
ssh root@5.189.185.146 "chmod 440 /etc/sudoers.d/root-nopasswd"

# 1.3 Backup do banco de dados atual (precaução)
ssh root@5.189.185.146 "mkdir -p /opt/xpertia/backups && docker exec xpertia-postgres pg_dump -U xpertia xpertia > /opt/xpertia/backups/backup_pre_execucao_$(date +%Y%m%d_%H%M%S).sql"

# 1.4 Verificar usuários existentes
ssh root@5.189.185.146 "cat /etc/passwd | grep -E 'gladson|xpertia'"

# 1.5 Remover usuário gladson (após confirmação de que não é mais necessário)
# NOTA: Só executar após confirmar que não há dados importantes
ssh root@5.189.185.146 "pkill -u gladson 2>/dev/null; userdel -r gladson 2>/dev/null || echo 'Usuário gladson não existe ou já foi removido'"
```

**CHECKPOINT 1:** ✅ Sistema preparado, backup criado

---

### FASE 2: Cópia dos Arquivos de Configuração (3 min)
**Objetivo:** Sincronizar `.infra` com a VPS

```bash
# 2.1 Criar estrutura de pastas
ssh root@5.189.185.146 "mkdir -p /opt/xpertia/{app,backups,scripts}"
ssh root@5.189.185.146 "mkdir -p /opt/xpertia/docker/{configs/nginx/conf.d,postgreSQL}"
ssh root@5.189.185.146 "mkdir -p /var/log/xpertia"

# 2.2 Copiar docker-compose atualizado
scp /home/henrique-bona/dev/mastra-ai/.infra/docker/docker-compose.prod.yml root@5.189.185.146:/opt/xpertia/docker/docker-compose.yml

# 2.3 Copiar configurações do Nginx
scp /home/henrique-bona/dev/mastra-ai/.infra/docker/configs/nginx/nginx.conf root@5.189.185.146:/opt/xpertia/docker/configs/nginx/ 2>/dev/null || echo "nginx.conf será criado manualmente"
scp /home/henrique-bona/dev/mastra-ai/.infra/docker/configs/nginx/conf.d/mastra.conf root@5.189.185.146:/opt/xpertia/docker/configs/nginx/conf.d/ 2>/dev/null || echo "mastra.conf será criado manualmente"

# 2.4 Copiar PM2 ecosystem
scp /home/henrique-bona/dev/mastra-ai/.infra/pm2-ecosystem.config.js root@5.189.185.146:/opt/xpertia/app/

# 2.5 Copiar scripts
scp /home/henrique-bona/dev/mastra-ai/.infra/scripts/setup-vps.sh root@5.189.185.146:/opt/xpertia/scripts/
ssh root@5.189.185.146 "chmod +x /opt/xpertia/scripts/setup-vps.sh"

# 2.6 Verificar cópia
ssh root@5.189.185.146 "ls -la /opt/xpertia/docker/ && ls -la /opt/xpertia/app/"
```

**CHECKPOINT 2:** ✅ Arquivos copiados

---

### FASE 3: Atualização do PostgreSQL (8 min)
**Objetivo:** Aplicar nova configuração com 8GB RAM

```bash
# 3.1 Parar containers atuais
ssh root@5.189.185.146 "cd /opt/xpertia/docker && docker compose down"

# 3.2 Verificar novo docker-compose
ssh root@5.189.185.146 "cat /opt/xpertia/docker/docker-compose.yml | grep -A5 'memory:'"

# 3.3 Iniciar com nova configuração
ssh root@5.189.185.146 "cd /opt/xpertia/docker && docker compose up -d postgres"

# 3.4 Aguardar PostgreSQL iniciar
sleep 15

# 3.5 Verificar status
ssh root@5.189.185.146 "docker ps && docker stats --no-stream xpertia-postgres"

# 3.6 Testar conexão
ssh root@5.189.185.146 "docker exec xpertia-postgres psql -U xpertia -c 'SELECT version();'"
```

**CHECKPOINT 3:** ✅ PostgreSQL atualizado com 8GB

---

### FASE 4: Instalação Node.js + PM2 (10 min)
**Objetivo:** Atualizar Node.js v16 → v22, instalar PM2

```bash
# 4.1 Verificar versão atual
ssh root@5.189.185.146 "node --version"

# 4.2 Atualizar Node.js para v22
ssh root@5.189.185.146 "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
ssh root@5.189.185.146 "apt-get install -y nodejs"

# 4.3 Verificar instalação
ssh root@5.189.185.146 "node --version && npm --version"

# 4.4 Instalar pnpm
ssh root@5.189.185.146 "curl -fsSL https://get.pnpm.io/install.sh | sh -"
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pnpm --version"

# 4.5 Adicionar pnpm ao PATH permanentemente
ssh root@5.189.185.146 "echo 'export PNPM_HOME=\"\$HOME/.local/share/pnpm\"' >> ~/.bashrc"
ssh root@5.189.185.146 "echo 'export PATH=\"\$PNPM_HOME:\$PATH\"' >> ~/.bashrc"

# 4.6 Instalar PM2 globalmente
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pnpm add -g pm2"

# 4.7 Verificar PM2
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 --version"

# 4.8 Configurar PM2 para iniciar no boot
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 startup systemd"
```

**CHECKPOINT 4:** ✅ Node.js v22 + PM2 instalados

---

### FASE 5: Clonar Repositório na VPS (5 min)
**Objetivo:** Preparar código para desenvolvimento remoto

```bash
# 5.1 Verificar se diretório existe
ssh root@5.189.185.146 "ls -la /opt/xpertia/app/"

# 5.2 Clonar repositório (assumindo GitHub)
# NOTA: Usar chave SSH ou HTTPS conforme configurado
ssh root@5.189.185.146 "cd /opt/xpertia/app && git clone https://github.com/henrique-bona/mastra-ai.git XpertIA 2>/dev/null || echo 'Repositório já existe ou URL diferente'"

# 5.3 Alternativa: Copiar do local atual via SCP
# tar -czf /tmp/xpertia-deploy.tar.gz -C /home/henrique-bona/dev/mastra-ai/XpertIA .
# scp /tmp/xpertia-deploy.tar.gz root@5.189.185.146:/opt/xpertia/app/
# ssh root@5.189.185.146 "cd /opt/xpertia/app && tar -xzf xpertia-deploy.tar.gz -C XpertIA && rm xpertia-deploy.tar.gz"

# 5.4 Criar .env de produção
ssh root@5.189.185.146 "cat > /opt/xpertia/app/XpertIA/.env << 'EOF'
# ============================================================
# XpertIA - Produção (VPS)
# ============================================================

# Banco de dados (localhost - dentro da VPS)
DATABASE_URL=postgresql://xpertia:xpertia_dev@localhost:5432/xpertia?sslmode=disable

# LLM Provider
DEFAULT_LLM_PROVIDER=groq
GROQ_API_KEY=\$GROQ_API_KEY

# Porta do Mastra Studio
PORT=4111
HOST=0.0.0.0
EOF"

# 5.5 Instalar dependências
ssh root@5.189.185.146 "cd /opt/xpertia/app/XpertIA && export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pnpm install"

# 5.6 Verificar instalação
ssh root@5.189.185.146 "ls -la /opt/xpertia/app/XpertIA/node_modules/@mastra/ 2>/dev/null | head -5 || echo 'Dependências sendo instaladas...'"
```

**CHECKPOINT 5:** ✅ Código na VPS, dependências instaladas

---

### FASE 6: Configurar Nginx (5 min)
**Objetivo:** Proxy reverso para Mastra Studio

```bash
# 6.1 Criar diretórios de configuração
ssh root@5.189.185.146 "mkdir -p /opt/xpertia/docker/configs/nginx/conf.d"

# 6.2 Criar nginx.conf
ssh root@5.189.185.146 "cat > /opt/xpertia/docker/configs/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    
    include /etc/nginx/conf.d/*.conf;
}
EOF"

# 6.3 Criar configuração do Mastra
ssh root@5.189.185.146 "cat > /opt/xpertia/docker/configs/nginx/conf.d/mastra.conf << 'EOF'
server {
    listen 80;
    server_name 5.189.185.146;
    
    access_log /var/log/nginx/mastra-access.log;
    error_log /var/log/nginx/mastra-error.log;
    
    location / {
        proxy_pass http://localhost:4111;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        access_log off;
        return 200 \"healthy\\n\";
        add_header Content-Type text/plain;
    }
}
EOF"

# 6.4 Iniciar Nginx
ssh root@5.189.185.146 "cd /opt/xpertia/docker && docker compose up -d nginx"

# 6.5 Testar configuração
sleep 5
ssh root@5.189.185.146 "docker exec xpertia-nginx nginx -t"
ssh root@5.189.185.146 "docker exec xpertia-nginx nginx -s reload"
```

**CHECKPOINT 6:** ✅ Nginx configurado e rodando

---

### FASE 7: Iniciar Mastra Studio com PM2 (5 min)
**Objetivo:** Subir aplicação Node.js

```bash
# 7.1 Atualizar ecosystem.config.js com 8GB
ssh root@5.189.185.146 "cat > /opt/xpertia/app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'xpertia-mastra',
      cwd: '/opt/xpertia/app/XpertIA',
      script: 'node_modules/.bin/mastra',
      args: 'dev',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 4111,
        HOST: '0.0.0.0'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '8G',
      log_file: '/var/log/xpertia/mastra-combined.log',
      out_file: '/var/log/xpertia/mastra-out.log',
      error_file: '/var/log/xpertia/mastra-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_rotate_interval: '1d',
      log_rotate_keep: 30,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
      exp_backoff_restart_delay: 100,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist', '.tmp'],
      node_args: [
        '--max-old-space-size=8192',
        '--optimize-for-size'
      ],
      health_check_grace_period: 30000,
      kill_timeout: 10000,
      listen_timeout: 30000,
      pmx: false,
      automation: false,
    }
  ]
};
EOF"

# 7.2 Criar diretório de logs
ssh root@5.189.185.146 "mkdir -p /var/log/xpertia && chown -R root:root /var/log/xpertia"

# 7.3 Iniciar com PM2
ssh root@5.189.185.146 "cd /opt/xpertia/app && export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 start ecosystem.config.js"

# 7.4 Salvar configuração PM2
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 save"

# 7.5 Verificar status
sleep 5
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 status"

# 7.6 Ver logs
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 logs xpertia-mastra --lines 20"
```

**CHECKPOINT 7:** ✅ Mastra Studio rodando com PM2

---

### FASE 8: Configurar Firewall (3 min)
**Objetivo:** Segurança básica

```bash
# 8.1 Configurar UFW
ssh root@5.189.185.146 "ufw default deny incoming"
ssh root@5.189.185.146 "ufw default allow outgoing"
ssh root@5.189.185.146 "ufw allow 22/tcp comment 'SSH'"
ssh root@5.189.185.146 "ufw allow 80/tcp comment 'HTTP - Nginx'"
ssh root@5.189.185.146 "ufw allow 443/tcp comment 'HTTPS - Nginx'"
ssh root@5.189.185.146 "ufw allow 5432/tcp comment 'PostgreSQL'"

# 8.2 Habilitar (com confirmação)
ssh root@5.189.185.146 "echo 'y' | ufw enable"

# 8.3 Verificar status
ssh root@5.189.185.146 "ufw status verbose"
```

**CHECKPOINT 8:** ✅ Firewall configurado

---

### FASE 9: Configurar VSCode Remote (2 min)
**Objetivo:** Preparar ambiente para desenvolvimento remoto

```bash
# 9.1 Criar diretório de workspace
ssh root@5.189.185.146 "mkdir -p /root/.vscode-server"

# 9.2 Configurar git na VPS
ssh root@5.189.185.146 "git config --global user.name 'XpertIA Developer'"
ssh root@5.189.185.146 "git config --global user.email 'dev@xpertia.local'"
ssh root@5.189.185.146 "git config --global init.defaultBranch main"

# 9.3 Gerar SSH key para GitHub (se necessário)
ssh root@5.189.185.146 "ssh-keygen -t ed25519 -C 'xpertia-vps' -f ~/.ssh/id_ed25519 -N ''" 2>/dev/null || echo "Chave já existe"

# 9.4 Mostrar chave pública
ssh root@5.189.185.146 "cat ~/.ssh/id_ed25519.pub"

# NOTA: Adicionar essa chave no GitHub: Settings → SSH Keys
```

**CHECKPOINT 9:** ✅ Pronto para VSCode Remote

---

### FASE 10: Validação Final (5 min)
**Objetivo:** Verificar se tudo funciona

```bash
# 10.1 Verificar todos os serviços
ssh root@5.189.185.146 "echo '=== DOCKER ===' && docker ps && echo '' && echo '=== PM2 ===' && export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 status && echo '' && echo '=== RECURSOS ===' && free -h && df -h"

# 10.2 Testar Nginx
ssh root@5.189.185.146 "curl -s http://localhost:80/health || echo 'Nginx não responde na porta 80'"

# 10.3 Testar Mastra diretamente
ssh root@5.189.185.146 "curl -s http://localhost:4111 | head -20 || echo 'Mastra não responde na porta 4111'"

# 10.4 Testar PostgreSQL
ssh root@5.189.185.146 "docker exec xpertia-postgres psql -U xpertia -c 'SELECT NOW();'"

# 10.5 Verificar uso de recursos
ssh root@5.189.185.146 "docker stats --no-stream && echo '' && export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 monit &"

# 10.6 Listar usuários (verificar remoção gladson)
ssh root@5.189.185.146 "cat /etc/passwd | grep -E 'gladson|xpertia|root'"
```

**CHECKPOINT FINAL:** ✅✅✅ TUDO CONFIGURADO!

---

## 📊 RESUMO PÓS-EXECUÇÃO

### Acesso aos Serviços

| Serviço | URL Local (VPS) | URL Externa | Status |
|---------|-----------------|-------------|--------|
| **Mastra Studio** | http://localhost:4111 | http://5.189.185.146 | ✅ Via Nginx |
| **PostgreSQL** | localhost:5432 | 5.189.185.146:5432 | ✅ Direto |
| **Nginx** | localhost:80 | http://5.189.185.146 | ✅ Proxy |
| **PM2 Status** | `pm2 monit` | - | ✅ CLI |

### VSCode Remote - Próximos Passos

```bash
# No seu PC local:
# 1. Instalar extensão "Remote - SSH"
# 2. Ctrl+Shift+P → "Remote-SSH: Connect to Host..."
# 3. Digitar: root@5.189.185.146
# 4. Abrir pasta: /opt/xpertia/app/XpertIA
# 5. Instalar extensões TypeScript, ESLint, etc. no VSCode remoto
```

---

## 🔄 ROLLBACK (Se necessário)

Se algo der errado:

```bash
# 1. Restaurar snapshot (via painel da VPS)
# 2. Ou manualmente:
ssh root@5.189.185.146 "cd /opt/xpertia/docker && docker compose down"
ssh root@5.189.185.146 "docker volume rm xpertia_postgres_data 2>/dev/null || true"
ssh root@5.189.185.146 "export PNPM_HOME=\"\$HOME/.local/share/pnpm\" && export PATH=\"\$PNPM_HOME:\$PATH\" && pm2 delete all"
# 3. Restaurar backup do banco (se necessário)
ssh root@5.189.185.146 "psql -U xpertia -d xpertia < /opt/xpertia/backups/backup_pre_execucao_*.sql"
```

---

## ✅ CHECKLIST DE AUTORIZAÇÃO

Marque cada item antes de iniciar:

- [ ] **Snapshot criado** e confirmado funcional
- [ ] **Backup do banco** realizado (automático no passo 1.3)
- [ ] **Usuário gladson** pode ser removido (sem dados importantes)
- [ ] **Recursos aprovados**: PostgreSQL 8GB, Mastra 8GB, Nginx 1GB
- [ ] **Horário adequado** para manutenção (sem usuários ativos)
- [ ] **Acesso ao VPS** confirmado (SSH funcional)

---

## 🚀 COMANDO DE AUTORIZAÇÃO

Para autorizar a execução, responda:

> **"Autorizo a execução do Plano de VPS conforme documentado"**

Ou especifique ajustes:
- Alterar alocação de recursos
- Modificar ordem dos passos
- Adicionar/remover etapas

---

## 📞 PÓS-EXECUÇÃO

Após conclusão, você receberá:

1. ✅ Confirmação de cada fase executada
2. ✅ Logs de validação
3. ✅ Instruções de acesso ao VSCode Remote
4. ✅ Comandos úteis para operação diária

---

*Plano criado em: 2026-03-13*  
*Versão: 1.0*  
*Status: Aguardando autorização*
