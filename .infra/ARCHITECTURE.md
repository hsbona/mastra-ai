# 🏗️ Arquitetura da VPS - XpertIA

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VPS (5.189.185.146)                               │
│                        24GB RAM | 8 Cores | 200GB SSD                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DOCKER (Container Engine)                        │   │
│  │                                                                     │   │
│  │  ┌─────────────────────┐      ┌─────────────────────┐              │   │
│  │  │  PostgreSQL         │      │  Nginx              │              │   │
│  │  │  (pgvector)         │      │  (Proxy Reverso)    │              │   │
│  │  │                     │      │                     │              │   │
│  │  │  • Porta: 5432      │      │  • Porta: 80/443    │              │   │
│  │  │  • RAM: 4GB         │      │  • RAM: 512MB       │              │   │
│  │  │  • CPU: 2 cores     │      │  • CPU: 0.5 core    │              │   │
│  │  │                     │      │                     │              │   │
│  │  │  Dados:             │      │  Função:            │              │   │
│  │  │  - Banco relacional │      │  - Recebe requisi-  │              │   │
│  │  │  - Memória agente   │      │    ções na porta 80 │              │   │
│  │  │  - Vetores RAG      │      │  - Encaminha para   │              │   │
│  │  │  - Traces/Observab. │      │    porta 4111       │              │   │
│  │  │                     │      │  - SSL/HTTPS        │              │   │
│  │  └─────────────────────┘      └──────────┬──────────┘              │   │
│  │                                           │                        │   │
│  │                                           │ proxy_pass             │   │
│  │                                           ▼                        │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              PM2 (Process Manager) - FORA DO DOCKER                 │   │
│  │                        ↳ Roda diretamente no Sistema                │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │           Mastra Studio (Aplicação Node.js)                 │   │   │
│  │  │                                                             │   │   │
│  │  │  • Porta: 4111 (localhost apenas)                          │   │   │
│  │  │  • RAM: 4GB                                                │   │   │
│  │  │  • CPU: 3 cores                                            │   │   │
│  │  │                                                             │   │   │
│  │  │  Função:                                                    │   │   │
│  │  │  - Servir a interface do Mastra Studio                     │   │   │
│  │  │  - Executar agents                                         │   │   │
│  │  │  - Executar workflows                                      │   │   │
│  │  │  - Conectar no PostgreSQL (porta 5432)                     │   │   │
│  │  │                                                             │   │   │
│  │  │  Comando: pnpm mastra dev                                  │   │   │
│  │  │                                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


FLUXO DE UMA REQUISIÇÃO:
=======================

Usuário (navegador)
       │
       │ http://5.189.185.146
       │ (porta 80)
       ▼
┌──────────────┐
│    Nginx     │ ◄──── Docker Container
│   (Docker)   │
└──────┬───────┘
       │ proxy_pass para localhost:4111
       │
       ▼
┌──────────────┐
│Mastra Studio │ ◄──── Processo Node.js (PM2)
│    (PM2)     │       FORA do Docker
└──────┬───────┘
       │
       │ Query/Insert
       │ (porta 5432)
       ▼
┌──────────────┐
│  PostgreSQL  │ ◄──── Docker Container
│   (Docker)   │
└──────────────┘
```

---

## ❓ Respondendo suas Perguntas

### 1. "O Mastra Studio funciona no Nginx?"

**NÃO!** São serviços **SEPARADOS** com funções diferentes:

| Serviço | Tipo | Função |
|---------|------|--------|
| **Mastra Studio** | Aplicação Node.js | Interface web + execução de agents/workflows |
| **Nginx** | Proxy Reverso | Recebe conexões externas e encaminha para o Mastra |

**Analogia:**
- **Mastra Studio** = Restaurante (onde a comida é feita)
- **Nginx** = Recepcionista (recebe clientes e os direciona para o restaurante)

**Por que são separados?**
1. **Segurança**: Nginx fica exposto à internet, Mastra fica protegido
2. **SSL**: Nginx gerencia certificados HTTPS
3. **Performance**: Nginx serve arquivos estáticos mais rápido
4. **Múltiplos apps**: Nginx pode rotear para vários serviços

---

### 2. "Por que os recursos são separados?"

Cada serviço tem necessidades diferentes:

| Serviço | Memória | CPU | Por que? |
|---------|---------|-----|----------|
| **PostgreSQL** | 4GB | 2 cores | Cache de dados, queries complexas, índices |
| **Mastra Studio** | 4GB | 3 cores | Executar LLMs, processar embeddings, múltiplos agents |
| **Nginx** | 512MB | 0.5 core | Apenas encaminhar requisições, muito leve |

**Não faz sentido** juntar Mastra + Nginx porque:
- Mastra é Node.js (aplicação)
- Nginx é C (servidor web otimizado)
- Eles rodam em processos completamente diferentes

---

### 3. "Nginx funciona no docker?"

**SIM!** Na VPS atual, o Nginx está rodando em um container Docker:

```bash
# Verificar:
ssh root@5.189.185.146
docker ps

# Saída:
# NAMES              STATUS                  PORTS
# xpertia-nginx      Up 5 days               0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# xpertia-postgres   Up 28 hours (healthy)   0.0.0.0:5432->5432/tcp
```

**Por que Nginx no Docker?**
- ✅ Fácil de configurar e recriar
- ✅ Isolado do sistema
- ✅ Logs gerenciados pelo Docker

**Alternativa**: Também poderia rodar Nginx diretamente no sistema (`apt install nginx`)

---

### 4. "Mastra tem seu próprio docker?"

**NÃO!** O Mastra Studio **NÃO RODA EM DOCKER**!

Ele roda como um **processo Node.js diretamente no sistema**, gerenciado pelo **PM2**:

```
┌─────────────────────────────────────────────────┐
│           VPS (Sistema Operacional)             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐    ┌──────────────────────┐   │
│  │   DOCKER    │    │    SISTEMA (HOST)    │   │
│  │             │    │                      │   │
│  │  ┌───────┐  │    │   ┌──────────────┐   │   │
│  │  │Postgre│  │    │   │ PM2          │   │   │
│  │  │  SQL  │  │    │   │              │   │   │
│  │  └───────┘  │    │   │ ┌──────────┐ │   │   │
│  │             │    │   │ │ Mastra   │ │   │   │
│  │  ┌───────┐  │    │   │ │ Studio   │ │   │   │
│  │  │ Nginx │  │    │   │ │ (Node.js)│ │   │   │
│  │  │       │  │    │   │ └──────────┘ │   │   │
│  │  └───────┘  │    │   └──────────────┘   │   │
│  │             │    │                      │   │
│  └─────────────┘    └──────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Por que Mastra NÃO usa Docker?**
1. **PM2 é melhor para Node.js**: Restart automático, monitoramento nativo
2. **Hot reload**: Mais fácil atualizar código sem rebuildar imagem
3. **Desenvolvimento**: Alinha com `mastra dev` do seu workflow local
4. **Logs**: PM2 gerencia logs de forma mais amigável para Node.js

---

## 🔧 Resumo da Arquitetura

### O que roda em Docker:
- ✅ **PostgreSQL** (banco de dados)
- ✅ **Nginx** (proxy reverso)

### O que roda no Sistema (via PM2):
- ✅ **Mastra Studio** (aplicação Node.js)

### Por que essa separação?

| Componente | Docker? | Motivo |
|------------|---------|--------|
| PostgreSQL | ✅ Sim | Isolamento de dados, fácil backup |
| Nginx | ✅ Sim | Configuração padronizada, fácil recriar |
| Mastra | ❌ Não | PM2 é melhor para Node.js, hot reload |

---

## 🌐 Fluxo Completo de Acesso

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuário   │────▶│   Nginx     │────▶│   Mastra    │────▶│  PostgreSQL │
│  (Browser)  │     │  (Docker)   │     │  (PM2)      │     │   (Docker)  │
│             │     │             │     │             │     │             │
│ Acessa:     │     │ Porta: 80   │     │ Porta: 4111 │     │ Porta: 5432 │
│ xpertia.com │     │             │     │ (localhost) │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │                   │
       │                  │                   │                   │
    Internet         Docker Network        localhost         Docker Network
```

---

## ⚠️ Configuração Importante

### Nginx precisa acessar Mastra na porta 4111

No `docker-compose.yml`, o Nginx precisa estar na mesma network que o host ou usar `host.docker.internal`:

```yaml
services:
  nginx:
    # ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
    # OU modo host para acessar localhost:4111
    network_mode: host  # <-- Se quiser acessar porta 4111 do host
```

**Alternativa recomendada**: Usar `network_mode: host` no Nginx permite ele acessar o Mastra em `localhost:4111`.

---

*Documento criado em: 2026-03-13*
