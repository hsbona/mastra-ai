# 🚀 Guia de Deploy na VPS - XpertIA

## Visão Geral

Este guia documenta como configurar a VPS para rodar o Mastra Studio e o agente XpertIA em produção.

---

## 📋 Pré-requisitos da VPS

| Recurso | Mínimo | Recomendado | Atual (5.189.185.146) |
|---------|--------|-------------|----------------------|
| RAM | 4GB | 8GB | **24GB** (✅ excelente) |
| CPU | 2 cores | 4 cores | **8 cores** (✅ excelente) |
| Disco | 20GB SSD | 50GB SSD | **200GB SSD** (✅ excelente) |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS | - |

---

## 🔧 O que são Nginx e PM2?

### PM2 (Process Manager 2)

**PM2** é um gerenciador de processos Node.js para produção:

| Função | Benefício |
|--------|-----------|
| **Keep-alive** | Se o Mastra cair, reinicia automaticamente (24/7) |
| **Logs** | Gerencia logs com rotação automática |
| **Monitoramento** | Mostra CPU/RAM em tempo real (`pm2 monit`) |
| **Startup** | Inicia automaticamente quando o servidor reinicia |
| **Zero-downtime** | Atualiza o app sem parar o serviço |

**Sem PM2**: Você precisaria rodar `mastra dev` manualmente e ficar monitorando. Se o processo morrer, o fica fora do ar.

**Com PM2**: O processo é gerenciado automaticamente. Você pode desconectar do SSH que o Mastra continua rodando.

### Nginx

**Nginx** é um servidor web e proxy reverso:

| Função | Benefício |
|--------|-----------|
| **Proxy Reverso** | Recebe requisições na porta 80/443 e encaminha para o Mastra (4111) |
| **SSL/HTTPS** | Gerencia certificados de segurança (Let's Encrypt) |
| **Domínio** | Permite acessar via `https://seudominio.com` em vez de `http://ip:4111` |
| **Load Balancing** | Distribui carga entre múltiplas instâncias |
| **Cache** | Cache de arquivos estáticos para melhor performance |
| **Segurança** | Esconde a porta 4111 do mundo exterior |

**Sem Nginx**: Acesso direto `http://5.189.185.146:4111` (porta exposta, sem SSL)

**Com Nginx**: Acesso seguro `https://xpertia.seudominio.com` (SSL + proxy reverso)

---

## 🔧 Serviços Necessários

### 1. PostgreSQL (pgvector) ✅ Já Configurado

**Status:** Rodando em Docker na porta 5432

**Configuração Generosa:**
- **4GB RAM** | **2 cores**
- Cache otimizado para RAG e embeddings

**Propósito:**
- Dados relacionais
- Memória do agente (Mastra Memory)
- Vetores/embeddings (RAG via pgvector)
- Observability e traces

### 2. Node.js + PM2 ❌ PENDENTE

**Configuração Proposta:**
- **4GB RAM** | **3 cores**
- Node.js v22+ (atual: v16 - desatualizado)

**O que falta instalar:**
```bash
# Atualizar Node.js para v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

# Instalar PM2 globalmente
pnpm add -g pm2
```

### 3. Nginx ✅ Já Configurado (pode ser otimizado)

**Configuração Proposta:**
- **512MB RAM** | **0.5 core**

**Status:** Rodando na porta 80/443

**Uso:** Proxy reverso para expor o Mastra Studio na web com SSL

---

## 💻 Deploy do VSCode para a VPS

### Opção 1: SSH + Copiar Arquivos (Recomendado)

Do seu VSCode local, você pode fazer deploy via terminal:

```bash
# 1. Compactar o projeto (excluindo node_modules)
cd /home/henrique-bona/dev/mastra-ai/XpertIA
tar -czf xpertia-deploy.tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' .

# 2. Enviar para a VPS
scp xpertia-deploy.tar.gz root@5.189.185.146:/opt/xpertia/app/

# 3. Conectar na VPS e extrair
ssh root@5.189.185.146
cd /opt/xpertia/app
tar -xzf xpertia-deploy.tar.gz
rm xpertia-deploy.tar.gz

# 4. Instalar dependências e reiniciar
cd XpertIA
pnpm install
pm2 restart xpertia-mastra
```

### Opção 2: VSCode Remote SSH (Mais Conveniente)

Instale a extensão **"Remote - SSH"** no VSCode:

1. Pressione `Ctrl+Shift+P` → "Remote-SSH: Connect to Host..."
2. Adicione: `root@5.189.185.146`
3. O VSCode abrirá uma nova janela conectada diretamente na VPS
4. Edite os arquivos como se estivesse localmente!

**Vantagem:** Você edita código diretamente na VPS, sem precisar copiar arquivos.

### Opção 3: Git Clone (Se usar repositório Git)

```bash
# Na VPS
cd /opt/xpertia/app
git clone <seu-repositorio-git> XpertIA
cd XpertIA
git pull  # Para atualizar
```

---

## 🔒 Firewall (UFW)

### Precisa configurar? **SIM!** ✅

O firewall protege sua VPS contra acessos não autorizados.

### Configuração Recomendada

```bash
# Resetar regras (se necessário)
ufw reset

# Política padrão: bloquear entrada, permitir saída
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH (ESSENCIAL - senão você perde acesso!)
ufw allow 22/tcp comment 'SSH'

# Permitir HTTP/HTTPS (Nginx)
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Permitir PostgreSQL (cuidado!)
ufw allow 5432/tcp comment 'PostgreSQL'
# NOTA: Idealmente restrinja por IP:
# ufw allow from SEU_IP to any port 5432

# NÃO é necessário abrir porta 4111 (Mastra) se usar Nginx!
# O Nginx faz proxy da 80/443 para 4111 internamente

# Ativar firewall
ufw enable

# Verificar status
ufw status verbose
```

### ⚠️ Importante: Nginx e Firewall

**O Nginx precisa das portas 80 e 443 abertas no firewall!**

```bash
# Se você usar Nginx (recomendado), NÃO precisa abrir a porta 4111
# O fluxo é:
# Usuario -> Porta 443 (HTTPS) -> Nginx -> Porta 4111 (localhost)

# Portas necessárias:
ufw allow 22/tcp    # SSH (obrigatório)
ufw allow 80/tcp    # HTTP -> Nginx
ufw allow 443/tcp   # HTTPS -> Nginx
# Porta 4111 NÃO precisa estar aberta!
```

---

## 🌐 Mastra Studio + Nginx

### O Mastra Studio funciona com Nginx? **SIM!** ✅

Mas requer configuração especial para **WebSocket** (que o Mastra Studio usa):

### Configuração Nginx para Mastra Studio

Crie `/opt/xpertia/docker/configs/nginx/conf.d/mastra.conf`:

```nginx
server {
    listen 80;
    server_name xpertia.seudominio.com;  # Ou use IP: 5.189.185.146

    # Redirecionar HTTP para HTTPS (se tiver SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:4111;
        proxy_http_version 1.1;
        
        # WebSocket support (ESSENCIAL para Mastra Studio)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers padrão
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts (aumentados para long-polling)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Configuração HTTPS (com SSL via Let's Encrypt)
# server {
#     listen 443 ssl http2;
#     server_name xpertia.seudominio.com;
#     
#     ssl_certificate /etc/letsencrypt/live/xpertia.seudominio.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/xpertia.seudominio.com/privkey.pem;
#     
#     location / {
#         proxy_pass http://localhost:4111;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#     }
# }
```

Após criar a configuração:

```bash
# Testar configuração
nginx -t

# Recarregar Nginx
docker exec xpertia-nginx nginx -s reload
# ou se rodar nativo:
# systemctl reload nginx
```

---

## 📁 Estrutura de Pastas na VPS

```
/opt/xpertia/                    # Projeto principal
├── docker/                      # Docker Compose (PostgreSQL, Nginx)
│   ├── docker-compose.yml
│   ├── .env
│   └── configs/
│       └── nginx/
│           └── conf.d/
│               └── mastra.conf  # Configuração Nginx para Mastra
├── app/                         # Código da aplicação Mastra
│   ├── XpertIA/
│   │   ├── src/mastra/
│   │   ├── package.json
│   │   └── .env                 # Variáveis de produção
│   └── ecosystem.config.js      # Config PM2
└── backups/                     # Backups do banco
```

---

## 🚀 Deploy do Mastra Studio (Passo a Passo)

### Passo 1: Preparar Ambiente

```bash
# Na VPS
mkdir -p /opt/xpertia/app
cd /opt/xpertia/app
```

### Passo 2: Copiar Projeto (do seu VSCode local)

```bash
# No terminal local
cd /home/henrique-bona/dev/mastra-ai

# Compactar e enviar
tar -czf xpertia-deploy.tar.gz -C XpertIA .
scp xpertia-deploy.tar.gz root@5.189.185.146:/opt/xpertia/app/

# Na VPS, extrair
ssh root@5.189.185.146
cd /opt/xpertia/app
mkdir -p XpertIA
tar -xzf xpertia-deploy.tar.gz -C XpertIA
rm xpertia-deploy.tar.gz
```

### Passo 3: Configurar Variáveis de Ambiente

Criar `/opt/xpertia/app/XpertIA/.env`:

```env
# ============================================================
# XpertIA - Produção
# ============================================================

# Banco de dados (localhost - dentro da VPS)
DATABASE_URL=postgresql://xpertia:xpertia_dev@localhost:5432/xpertia?sslmode=disable

# LLM Provider
DEFAULT_LLM_PROVIDER=groq
GROQ_API_KEY=gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Porta do Mastra Studio
PORT=4111
HOST=0.0.0.0
```

### Passo 4: Instalar Dependências

```bash
cd /opt/xpertia/app/XpertIA

# Instalar dependências
pnpm install
```

### Passo 5: Configurar PM2

Copiar o arquivo de configuração:

```bash
cp /opt/xpertia/.infra/pm2-ecosystem.config.js /opt/xpertia/app/ecosystem.config.js
```

Conteúdo (`ecosystem.config.js`):

```javascript
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
      // Recursos GENEROSOS
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '4G',  // 4GB limite
      // Logs
      log_file: '/var/log/xpertia/mastra-combined.log',
      out_file: '/var/log/xpertia/mastra-out.log',
      error_file: '/var/log/xpertia/mastra-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_rotate_keep: 30,
      // Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
      // Monitoramento
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
    }
  ]
};
```

### Passo 6: Iniciar com PM2

```bash
# Criar pasta de logs
mkdir -p /var/log/xpertia
chown -R root:root /var/log/xpertia

# Iniciar aplicação
cd /opt/xpertia/app
pm2 start ecosystem.config.js

# Salvar configuração para iniciar no boot
pm2 save
pm2 startup systemd

# Verificar status
pm2 status
pm2 logs xpertia-mastra --lines 50
```

### Passo 7: Configurar Nginx

Criar `/opt/xpertia/docker/configs/nginx/conf.d/mastra.conf`:

```nginx
server {
    listen 80;
    server_name 5.189.185.146;  # Ou seu domínio

    location / {
        proxy_pass http://localhost:4111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Recarregar Nginx:

```bash
docker exec xpertia-nginx nginx -s reload
```

### Passo 8: Configurar Firewall

```bash
# Configurar UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP - Nginx'
ufw allow 443/tcp comment 'HTTPS - Nginx'
ufw allow 5432/tcp comment 'PostgreSQL'

# Ativar
ufw enable

# Verificar
ufw status verbose
```

---

## 📊 Alocação de Recursos Final

| Serviço | RAM | CPU | Justificativa |
|---------|-----|-----|---------------|
| **SO** | 3GB | 1 core | Sistema operacional |
| **PostgreSQL** | 4GB | 2 cores | Cache generoso para RAG |
| **Mastra Studio** | 4GB | 3 cores | Múltiplos agents + workflows |
| **Nginx** | 512MB | 0.5 core | Proxy + SSL |
| **Reserva/Crescimento** | **~12GB** | **1.5 cores** | Espaço para Redis, novos serviços |

**Total alocado:** ~12GB RAM | ~7 cores  
**Margem disponível:** ~12GB RAM | ~1 core

---

## 📝 Comandos Úteis

```bash
# Ver logs do Mastra em tempo real
pm2 logs xpertia-mastra

# Reiniciar aplicação
pm2 restart xpertia-mastra

# Ver uso de recursos do PM2
pm2 monit

# Backup do banco
docker exec xpertia-postgres pg_dump -U xpertia xpertia > /opt/xpertia/backups/backup_$(date +%Y%m%d).sql

# Status dos containers Docker
docker ps
docker stats --no-stream

# Ver estatísticas do PostgreSQL
docker exec xpertia-postgres psql -U xpertia -c "SELECT pg_size_pretty(pg_database_size('xpertia'));"
```

---

## ✅ Checklist de Deploy

- [ ] Atualizar Node.js para v22+
- [ ] Instalar pnpm e PM2
- [ ] Copiar código para `/opt/xpertia/app/`
- [ ] Configurar `.env` de produção
- [ ] Instalar dependências (`pnpm install`)
- [ ] Criar `ecosystem.config.js`
- [ ] Criar pasta de logs
- [ ] Testar inicialização (`pm2 start`)
- [ ] Configurar Nginx (`mastra.conf`)
- [ ] Configurar firewall (UFW)
- [ ] Testar acesso via Nginx (porta 80)

---

## 🌐 Acesso Após Deploy

| Método | URL | Situação |
|--------|-----|----------|
| Direto (sem Nginx) | `http://5.189.185.146:4111` | ❌ Não recomendado (porta exposta) |
| Via Nginx | `http://5.189.185.146` | ✅ Recomendado (porta 80) |
| Via Nginx + SSL | `https://seudominio.com` | ✅ Ideal (com domínio) |

---

*Última atualização: 2026-03-13*
