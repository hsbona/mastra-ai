# 🤔 PM2 dentro ou fora do Docker?

## A Pergunta Central

> "Por que o PM2 não roda dentro de um Docker?"

**Resposta curta:** É POSSÍVEL, mas geralmente **não é necessário** e pode adicionar complexidade.

**Resposta completa:** Depende do que você quer gerenciar - processos ou containers.

---

## 🎯 Conceitos Fundamentais

### O que cada ferramenta faz?

| Ferramenta | Função Principal | Gerencia... |
|------------|------------------|-------------|
| **PM2** | Gerenciador de processos Node.js | **Processos** dentro de um servidor |
| **Docker** | Container Engine | **Containers** inteiros |

### Analogia Simples

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS (Servidor)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Docker é como um PRÉDIO DE APARTAMENTOS:                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    DOCKER (Prédio)                  │   │
│  │                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐   │   │
│  │  │ Container 1 │  │ Container 2 │  │ Container │   │   │
│  │  │  (Nginx)    │  │(PostgreSQL) │  │   (App)   │   │   │
│  │  └─────────────┘  └─────────────┘  └───────────┘   │   │
│  │                                                     │   │
│  │  Docker gerencia os APARTAMENTOS (containers)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PM2 é como um PORTEIRO/ADMINISTRADOR de um apartamento:   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DENTRO de um Container (ou no Host)                │   │
│  │                                                     │   │
│  │  PM2 gerencia os PROCESSOS do Node.js:             │   │
│  │                                                     │   │
│  │  • Iniciar/reiniciar app                            │   │
│  │  • Logs                                             │   │
│  │  • Monitorar memória/CPU                            │   │
│  │  • Cluster mode                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Opção 1: PM2 FORA do Docker (Nossa Escolha)

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
│  │  │  • Docker  │  │      │   │ ┌──────────────┐ │   │    │
│  │  │    restart │  │      │   │ │ Mastra       │ │   │    │
│  │  │  • Health  │  │      │   │ │ Studio       │ │   │    │
│  │  │    checks  │  │      │   │ │              │ │   │    │
│  │  └────────────┘  │      │   │ │ • Node.js    │ │   │    │
│  │                  │      │   │ │ • App        │ │   │    │
│  │  ┌────────────┐  │      │   │ └──────────────┘ │   │    │
│  │  │   Nginx    │  │      │   │                  │   │    │
│  │  │            │  │      │   │ PM2 gerencia:    │   │    │
│  │  │  • Docker  │  │      │   │ • Restart        │   │    │
│  │  │    restart │  │      │   │ • Logs           │   │    │
│  │  │  • Proxy   │  │      │   │ • Cluster        │   │    │
│  │  └────────────┘  │      │   └──────────────────┘   │    │
│  └──────────────────┘      └──────────────────────────┘    │
│                                                             │
│  ✅ Docker cuida dos containers                            │
│  ✅ PM2 cuida do processo Node.js                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Vantagens:
- ✅ **Mais simples** - Não precisa criar Dockerfile
- ✅ **Hot reload** - Altera código e reinicia com `pm2 restart`
- ✅ **Logs fáceis** - `pm2 logs` mostra tudo
- ✅ **Compatível** - Igual ao seu ambiente de desenvolvimento
- ✅ **Menos overhead** - Não gasta recursos com container

### Desvantagens:
- ❌ **Dependência do sistema** - Precisa do Node.js instalado na VPS
- ❌ **Menos isolado** - App tem acesso ao sistema operacional

---

## 🔍 Opção 2: PM2 DENTRO do Docker

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                      DOCKER                           │ │
│  │                                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │  PostgreSQL  │  │    Nginx     │  │    Mastra   │ │ │
│  │  │   Container  │  │   Container  │  │  Container  │ │ │
│  │  └──────────────┘  └──────────────┘  └──────┬──────┘ │ │
│  │                                             │        │ │
│  │                    ┌────────────────────────┘        │ │
│  │                    │                                 │ │
│  │                    ▼                                 │ │
│  │  ┌──────────────────────────────────────┐           │ │
│  │  │     DENTRO do Container Mastra       │           │ │
│  │  │                                      │           │ │
│  │  │   ┌──────────────────────────┐      │           │ │
│  │  │   │    PM2                   │      │           │ │
│  │  │   │                          │      │           │ │
│  │  │   │ ┌────────────────────┐   │      │           │ │
│  │  │   │ │  Node.js App       │   │      │           │ │
│  │  │   │ │  (Mastra Studio)   │   │      │           │ │
│  │  │   │ └────────────────────┘   │      │           │ │
│  │  │   │                          │      │           │ │
│  │  │   │ PM2 gerencia o processo  │      │           │ │
│  │  │   │ DENTRO do container      │      │           │ │
│  │  │   └──────────────────────────┘      │           │ │
│  │  └──────────────────────────────────────┘           │ │
│  │                                                     │ │
│  │   Docker gerencia o container INTEIRO              │ │
│  │   PM2 gerencia o processo DENTRO do container      │ │
│  │                                                     │ │
│  └───────────────────────────────────────────────────────┘
│                                                             │
│  ✅ Totalmente isolado                                     │
│  ✅ Fácil replicar em outro servidor                       │
│  ❌ Mais complexo                                          │
│  ❌ Precisa buildar imagem Docker                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Como seria o Dockerfile:

```dockerfile
# Dockerfile para Mastra com PM2
FROM node:22-alpine

# Instalar PM2 globalmente
RUN npm install -g pm2

# Diretório da aplicação
WORKDIR /app

# Copiar arquivos
COPY package*.json ./
RUN pnpm install

COPY . .

# Expor porta
EXPOSE 4111

# Usar PM2 para rodar
CMD ["pm2-runtime", "ecosystem.config.js"]
```

### Vantagens:
- ✅ **Totalmente isolado** - Não depende do sistema
- ✅ **Portabilidade** - Funciona em qualquer lugar com Docker
- ✅ **Consistência** - Mesmo ambiente em dev/prod
- ✅ **Escalabilidade** - Fácil subir múltiplas instâncias

### Desvantagens:
- ❌ **Mais complexo** - Precisa criar e manter Dockerfile
- ❌ **Build necessário** - Toda mudança precisa rebuildar
- ❌ **Overhead** - Container usa mais recursos
- ❌ **PM2 redundante** - Docker já faz restart automático

---

## 🔍 Opção 3: Docker PURO (sem PM2)

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                      DOCKER                           │ │
│  │                                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │  PostgreSQL  │  │    Nginx     │  │    Mastra   │ │ │
│  │  │   Container  │  │   Container  │  │  Container  │ │ │
│  │  └──────────────┘  └──────────────┘  └──────┬──────┘ │ │
│  │                                             │        │ │
│  │                    ┌────────────────────────┘        │ │
│  │                    │                                 │ │
│  │                    ▼                                 │ │
│  │  ┌──────────────────────────────────────┐           │ │
│  │  │     DENTRO do Container Mastra       │           │ │
│  │  │                                      │           │ │
│  │  │   ┌──────────────────────────┐      │           │ │
│  │  │   │  Node.js Direto          │      │           │ │
│  │  │   │  (sem PM2)               │      │           │ │
│  │  │   │                          │      │           │ │
│  │  │   │  CMD: pnpm mastra dev    │      │           │ │
│  │  │   │                          │      │           │ │
│  │  │   │  Docker gerencia restart │      │           │ │
│  │  │   │  via restart_policy      │      │           │ │
│  │  │   └──────────────────────────┘      │           │ │
│  │  └──────────────────────────────────────┘           │ │
│  │                                                     │ │
│  └───────────────────────────────────────────────────────┘
│                                                             │
│  ✅ Mais simples que PM2+Docker                          │
│  ❌ Perde features do PM2 (logs, monitoramento)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dockerfile (sem PM2):

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
EXPOSE 4111
CMD ["pnpm", "mastra", "dev"]
```

### Docker Compose:

```yaml
services:
  mastra:
    build: ./XpertIA
    restart: unless-stopped  # Docker faz o restart!
    ports:
      - "4111:4111"
```

### Vantagens:
- ✅ **Simples** - Sem PM2, sem complexidade extra
- ✅ **Docker cuida de tudo** - restart, logs, health checks

### Desvantagens:
- ❌ **Sem PM2** - Perde logs organizados, monitoramento, cluster mode

---

## 📊 Comparação das 3 Opções

| Critério | PM2 Fora (Nossa) | PM2 Dentro | Docker Puro |
|----------|------------------|------------|-------------|
| **Complexidade** | 🟢 Baixa | 🟡 Média | 🟢 Baixa |
| **Isolamento** | 🟡 Parcial | 🟢 Total | 🟢 Total |
| **Hot Reload** | 🟢 Sim | 🔴 Rebuild | 🔴 Rebuild |
| **Logs** | 🟢 Excelente (PM2) | 🟢 Excelente (PM2) | 🟡 Básico (Docker) |
| **Monitoramento** | 🟢 PM2 monit | 🟢 PM2 monit | 🟡 Docker stats |
| **Portabilidade** | 🟡 Depende do OS | 🟢 Qualquer Docker | 🟢 Qualquer Docker |
| **Overhead** | 🟢 Mínimo | 🟡 Container + PM2 | 🟢 Só container |
| **Restart** | 🟢 PM2 | 🟢 PM2 + Docker | 🟢 Docker |
| **Bom para dev?** | 🟢 Sim | 🟡 Não | 🟡 Não |

---

## 🤔 Por que escolhemos PM2 FORA do Docker?

### 1. **Simplicidade**
```bash
# PM2 fora: Simples
pm2 start ecosystem.config.js
pm2 logs

# PM2 dentro: Mais passos
docker build -t mastra .
docker run mastra
docker logs mastra
```

### 2. **Compatibilidade com seu Workflow**
Você desenvolve localmente com `mastra dev`, certo?
- **PM2 fora**: Mesma experiência
- **PM2 dentro**: Precisa buildar container a cada mudança

### 3. **Hot Reload**
```bash
# PM2 fora: Edita código e...
pm2 restart xpertia-mastra  # Pronto!

# PM2 dentro: Edita código e...
docker build -t mastra .     # Build demora...
docker stop mastra
docker run mastra            # Agora sim
```

### 4. **Menos Camadas**
```
PM2 fora:    VPS → Node.js → PM2 → App
PM2 dentro:  VPS → Docker → Node.js → PM2 → App
                              ↑
                              Mais uma camada!
```

### 5. **Mastra não foi feito para Docker**
O Mastra é uma ferramenta de desenvolvimento:
- Roda em modo dev (`mastra dev`)
- Faz hot reload
- Conecta em serviços externos (PostgreSQL, LLMs)

Container é melhor para aplicações "stateless" e "imutáveis".

---

## 🎯 Quando USAR PM2 no Docker?

Faça isso se:

✅ Você quer **escalar horizontalmente** (várias instâncias)  
✅ Precisa rodar em **múltiplos servidores** (Kubernetes)  
✅ Quer **imutabilidade total** (infraestrutura como código)  
✅ A equipe é **grande** e precisa de padronização  

**Exemplo de uso real:**
```
Kubernetes Cluster
├── Pod 1: Mastra (PM2 gerencia 4 workers)
├── Pod 2: Mastra (PM2 gerencia 4 workers)
└── Pod 3: Mastra (PM2 gerencia 4 workers)

PM2 dentro = Cluster mode dentro de cada Pod
Kubernetes = Gerencia os Pods
```

---

## 🎯 Quando NÃO usar PM2 no Docker?

Não faça isso se:

❌ É um **projeto pequeno/médio**  
❌ Você faz **deploys frequentes** (hot reload importa)  
❌ **Só tem uma VPS** (sem orquestração)  
❌ Quer **simplicidade**  

**Caso XpertIA:** Projeto em uma VPS só, deploys frequentes durante desenvolvimento.

---

## 🏆 Recomendação Final

### Para XpertIA (nosso caso):
```
✅ PM2 FORA do Docker

Porque:
• Projeto único em uma VPS
• Deploys frequentes
• Hot reload necessário
• Simplicidade é prioridade
```

### Para Produção Enterprise (futuro):
```
✅ Docker Puro (sem PM2)
   ou
✅ PM2 DENTRO do Docker (se precisar de cluster mode)

Porque:
• Múltiplos servidores
• Orquestração (Kubernetes)
• Padronização
```

---

## 📚 Resumo Visual

```
┌────────────────────────────────────────────────────────────────┐
│                      ESCOLHA CERTA                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  VPS ÚNICA + DEPLOYS FREQUENTES = PM2 FORA DO DOCKER ✅       │
│                                                                │
│  CLUSTER K8s + MÚLTIPLOS SERVIDORES = DOCKER PURO ✅          │
│                                                                │
│  PRECISA DE CLUSTER MODE NO CONTAINER = PM2 DENTRO ✅         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

*Documento criado para esclarecer a arquitetura do XpertIA*
