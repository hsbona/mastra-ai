# 🌐 Por que o Nginx fica DENTRO do Docker?

## A Pergunta

> "Qual a vantagem do Nginx ficar dentro do Docker?"

Ótima pergunta! Se o Mastra roda fora do Docker (PM2), por que não rodar o Nginx fora também?

**Resposta curta:** Nginx no Docker é mais **fácil de gerenciar**, mas exige atenção na comunicação com o Mastra.

**Resposta completa:** Vamos explorar as opções.

---

## 🎯 As 2 Opções de Arquitetura

### Opção A: Nginx DENTRO do Docker (Nossa Escolha)

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────┐    │
│  │     DOCKER       │      │   SISTEMA (HOST)         │    │
│  │                  │      │                          │    │
│  │  ┌────────────┐  │      │   ┌──────────────────┐   │    │
│  │  │ PostgreSQL │  │      │   │ PM2              │   │    │
│  │  │            │  │      │   │                  │   │    │
│  │  │  • Porta:  │  │      │   │ ┌──────────────┐ │   │    │
│  │  │    5432    │  │◄─────┼───│ │ Mastra       │ │   │    │
│  │  └────────────┘  │      │   │ │ Studio       │ │   │    │
│  │                  │      │   │ │              │ │   │    │
│  │  ┌────────────┐  │      │   │ │ • Porta:     │ │   │    │
│  │  │   Nginx    │  │      │   │ │   4111       │ │   │    │
│  │  │            │  │      │   │ │ • Localhost  │ │   │    │
│  │  │  • Porta:  │  │      │   │ └──────────────┘ │   │    │
│  │  │    80/443  │  │      │   │                  │   │    │
│  │  │            │◄─┼──────┘   └──────────────────┘   │    │
│  │  │  COMO      │  │         (Network: host)         │    │
│  │  │  ACESSAR   │  │                                 │    │
│  │  │  O MASTRA? │  │                                 │    │
│  │  └────────────┘  │                                 │    │
│  │                  │                                 │    │
│  └──────────────────┘                                 │    │
│                                                       │    │
│  Problema: Nginx no Docker precisa acessar            │    │
│            localhost:4111 que está FORA do Docker     │    │
│                                                       │    │
└─────────────────────────────────────────────────────────────┘
```

### Opção B: Nginx FORA do Docker (Nativo)

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────┐    │
│  │     DOCKER       │      │   SISTEMA (HOST)         │    │
│  │                  │      │                          │    │
│  │  ┌────────────┐  │      │   ┌──────────────────┐   │    │
│  │  │ PostgreSQL │  │      │   │ PM2              │   │    │
│  │  │            │  │      │   │                  │   │    │
│  │  │  • Porta:  │  │◄─────┼───│ ┌──────────────┐ │   │    │
│  │  │    5432    │  │      │   │ │ Mastra       │ │   │    │
│  │  └────────────┘  │      │   │ │              │ │   │    │
│  └──────────────────┘      │   │ │ • Porta:     │ │   │    │
│                            │   │ │   4111       │ │   │    │
│                            │   │ └──────────────┘ │   │    │
│                            │   │                  │   │    │
│                            │   │ ┌──────────────┐ │   │    │
│                            │   │ │ Nginx        │ │   │    │
│                            │   │ │              │ │   │    │
│                            │   │ │ • Porta:     │ │   │    │
│                            │   │ │   80/443     │ │   │    │
│                            │   │ │ • Nativo     │ │   │    │
│                            │   │ └──────────────┘ │   │    │
│                            │   └──────────────────┘   │    │
│                            │                          │    │
│                            └──────────────────────────┘    │
│                                                             │
│  Vantagem: Nginx nativo acessa localhost:4111 diretamente   │
│            (tudo no mesmo sistema)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Vantagens do Nginx no Docker

### 1. **Configuração Imutável**

```bash
# Docker: Configuração é código
# Se algo dá errado, recria o container

docker compose up -d nginx  # Pronto, configurado!

# Nativo: Arquivos espalhados no sistema
sudo nano /etc/nginx/nginx.conf
sudo nano /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl reload nginx
# Se der problema, pode quebrar o servidor
```

### 2. **Fácil Backup e Restore**

```bash
# Docker: Configuração versionada no git
# Basta copiar a pasta configs/

# Nativo: Precisa saber onde estão todos os arquivos
/etc/nginx/nginx.conf
/etc/nginx/sites-available/*
/etc/nginx/conf.d/*
/var/log/nginx/*
# Fácil esquecer algum arquivo
```

### 3. **Isolamento de Dependências**

```bash
# Docker: Versão exata do Nginx
image: nginx:1.25.3-alpine

# Nativo: Versão do repositório do SO
sudo apt install nginx
# Pode instalar versão diferente dependendo do OS
```

### 4. **Portabilidade**

```bash
# Docker: Funciona igual em qualquer VPS
# Só precisa do Docker instalado

# Nativo: Cada SO tem peculiaridades
# Ubuntu: /etc/nginx/sites-available/
# CentOS: /etc/nginx/conf.d/
# Alpine: configuração diferente
```

### 5. **Fácil Reset**

```bash
# Docker: Destruiu? Recria em segundos
docker compose down
docker compose up -d nginx

# Nativo: Desinstalar e reinstalar é mais trabalhoso
sudo apt remove --purge nginx
sudo apt install nginx
# Pode deixar resíduos
```

### 6. **Consistência com PostgreSQL**

```yaml
# Ambos no Docker = mesma forma de gerenciar
services:
  postgres:
    restart: unless-stopped
    
  nginx:
    restart: unless-stopped
```

---

## ❌ Desvantagens do Nginx no Docker

### 1. **Problema: Acessar o Mastra**

```
┌──────────────────────────────────────────┐
│  Container Nginx                         │
│                                          │
│  localhost:4111 ──► ???                  │
│  (não existe dentro do container!)       │
└──────────────────────────────────────────┘
```

**Soluções:**

#### Solução A: Network Mode Host (Nossa Escolha)

```yaml
nginx:
  network_mode: host  # Nginx vê a rede do host
  
# Agora localhost:4111 funciona!
```

**Vantagem:** Simples, direto  
**Desvantagem:** Nginx perde isolamento de rede

#### Solução B: Docker.host.internal

```yaml
nginx:
  extra_hosts:
    - "host.docker.internal:host-gateway"

# Config nginx:
proxy_pass http://host.docker.internal:4111;
```

**Vantagem:** Mantém isolamento  
**Desvantagem:** Mais complexo, nem sempre funciona

#### Solução C: Mastra também no Docker

```yaml
services:
  mastra:
    build: ./XpertIA
    network: backend
    
  nginx:
    network: backend
    # Agora pode usar: proxy_pass http://mastra:4111;
```

**Vantagem:** Tudo isolado  
**Desvantagem:** Perde hot reload do PM2

---

## 🔍 Por que NÃO usamos Nginx nativo?

### Poderíamos! É uma escolha válida:

```bash
# Instalar Nginx nativo
sudo apt update
sudo apt install nginx

# Configurar
sudo nano /etc/nginx/sites-available/xpertia
sudo ln -s /etc/nginx/sites-available/xpertia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Gerenciar
sudo systemctl status nginx
sudo systemctl restart nginx
```

### Por que não fizemos isso?

| Motivo | Explicação |
|--------|------------|
| **Já tinha Nginx no Docker** | VPS já vinha configurada assim |
| **Consistência** | PostgreSQL + Nginx = ambos em Docker |
| **Backup fácil** | Copiar pasta `configs/` salva tudo |
| **Sem dependência do SO** | Não acopla à versão do Ubuntu |

---

## 📊 Comparação: Docker vs Nativo

| Aspecto | Nginx Docker | Nginx Nativo | Vencedor |
|---------|--------------|--------------|----------|
| **Configuração** | Arquivos no git | Arquivos no sistema | 🟢 Docker |
| **Backup** | Copiar pasta | Saber onde estão | 🟢 Docker |
| **Reset** | `docker compose up` | Reinstalar pacote | 🟢 Docker |
| **Performance** | +1% overhead | 100% nativo | 🟢 Nativo |
| **Acesso localhost** | Precisa config extra | Funciona direto | 🟢 Nativo |
| **Complexidade** | Media | Baixa | 🟢 Nativo |
| **Logs** | `docker logs` | Arquivos + journalctl | Empate |

---

## 🎯 Quando usar Nginx Nativo?

Use Nginx **fora** do Docker se:

✅ **VPS dedicada só para isso**  
✅ **Você é expert em Linux/Nginx**  
✅ **Precisa de máxima performance** (remover overhead do Docker)  
✅ **Vai usar certbot-auto com hooks complexos**  
✅ **Já tem scripts de configuração do Nginx**  

---

## 🎯 Quando usar Nginx no Docker?

Use Nginx **no** Docker se:

✅ **Quer infraestrutura como código**  
✅ **Facilidade de backup/restore**  
✅ **Consistência entre ambientes**  
✅ **Evitar conflitos de versão**  
✅ **Time pequeno sem especialista Linux**  

---

## 🏆 Nossa Decisão (Nginx no Docker)

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    network_mode: host  # <-- Chave para acessar Mastra!
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./configs/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./configs/nginx/conf.d:/etc/nginx/conf.d
```

**Por que:**
1. ✅ Configuração versionada no git
2. ✅ Fácil backup (copiar pasta `configs/`)
3. ✅ Reset rápido
4. ✅ Consistente com PostgreSQL
5. ✅ `network_mode: host` resolve a comunicação

---

## 🔧 Configuração Nginx no Docker

### nginx.conf

```nginx
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
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/rss+xml application/atom+xml image/svg+xml;
    
    include /etc/nginx/conf.d/*.conf;
}
```

### conf.d/mastra.conf

```nginx
server {
    listen 80;
    server_name 5.189.185.146;  # Ou seu domínio
    
    # Logs
    access_log /var/log/nginx/mastra-access.log;
    error_log /var/log/nginx/mastra-error.log;
    
    location / {
        proxy_pass http://localhost:4111;
        proxy_http_version 1.1;
        
        # WebSocket (ESSENCIAL para Mastra Studio)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## 🧪 Testando a Configuração

```bash
# 1. Entrar no container Nginx
docker exec -it xpertia-nginx sh

# 2. Testar conexão com Mastra
wget -qO- http://localhost:4111
# Deve retornar HTML do Mastra Studio

# 3. Testar configuração nginx
nginx -t

# 4. Recarregar configuração
nginx -s reload
```

---

## 📚 Resumo

```
┌────────────────────────────────────────────────────────────────┐
│                    POR QUE NGINX NO DOCKER?                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ✅ Configuração versionada (git)                             │
│  ✅ Fácil backup/restore                                      │
│  ✅ Consistente com PostgreSQL (também no Docker)             │
│  ✅ Fácil reset/recreate                                      │
│  ✅ Não depende da versão do SO                               │
│                                                                │
│  ⚠️ DESAFIO: Precisa acessar Mastra fora do Docker           │
│                                                                │
│  ✅ SOLUÇÃO: network_mode: host                               │
│     (Nginx vê a rede do sistema operacional)                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🤔 Alternativa: Tudo no Sistema (sem Docker)

Se quiser simplicidade máxima:

```
VPS
├── PostgreSQL (nativo) - apt install postgresql
├── Nginx (nativo) - apt install nginx
└── Mastra (PM2) - pnpm mastra dev

Vantagem: Tudo roda no mesmo "espaço", fácil comunicação
Desvantagem: Mais difícil de fazer backup, versionar configurações
```

---

*Documento criado para explicar a escolha arquitetural do XpertIA*
