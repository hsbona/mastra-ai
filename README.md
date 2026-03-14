# Xpert - Mastra AI Platform

Plataforma de aplicações com IA baseada no framework [Mastra](https://mastra.ai) (TypeScript).

> **Desenvolvimento:** Diretamente na VPS (AlmaLinux 9) via VSCode Remote SSH

---

## 🚀 Quick Start

```bash
# Clone o repositório (já na VPS)
git clone <repo-url> /root/dev/xpertia/mastra-ai
cd /root/dev/xpertia/mastra-ai

# Instalar dependências
cd Xpert && pnpm install

# Iniciar Mastra Studio
../scripts/mastra-studio.sh start
```

Acesse via VSCode Remote Port Forwarding: `http://localhost:4111`

---

## 📁 Estrutura

```
.
├── Xpert/              # Código da aplicação Mastra
│   ├── src/mastra/
│   │   ├── agents/     # Definição de agents
│   │   ├── workflows/  # Fluxos multi-etapa
│   │   ├── tools/      # Ferramentas reutilizáveis
│   │   └── index.ts    # Ponto de entrada
│   └── .env            # Variáveis de ambiente
├── infra/              # Infraestrutura como código
│   ├── postgreSQL/     # Scripts do banco
│   ├── docker/         # Configurações Docker
│   └── pm2/            # Configuração PM2
├── scripts/            # Scripts utilitários
│   └── mastra-studio.sh
└── docs/               # Documentação
```

---

## 🖥️ Ambiente de Desenvolvimento

### VPS (AlmaLinux 9.7)

| Configuração | Valor |
|--------------|-------|
| **IP** | `5.189.185.146` |
| **SO** | AlmaLinux 9.7 (headless) |
| **Acesso** | SSH / VSCode Remote |
| **PostgreSQL** | localhost:5432 |
| **Node.js** | >=22.13.0 |
| **pnpm** | 10.30.3 |

### Comandos Úteis

```bash
# Status dos serviços
./scripts/mastra-studio.sh status

# Logs em tempo real
./scripts/mastra-studio.sh logs

# Reiniciar Studio
./scripts/mastra-studio.sh restart

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -d xpertia
```

---

## 📚 Documentação

- [AGENTS.md](AGENTS.md) - Guia completo para desenvolvimento
- [Documentação Mastra](https://mastra.ai/llms.txt)
- [Mastra Studio](http://localhost:4111)

---

## ⚠️ Regras Importantes

1. **Nunca use `rm`** - Use `trash-put` ou `gio trash`
2. **Nunca altere o banco** sem autorização explícita
3. **Mantenha `infra/` atualizado** - Infraestrutura como código
4. **Sem valores hard-coded** - Use `.env`

---

## 🔧 Tecnologias

- [Mastra](https://mastra.ai) ^1.12.0
- TypeScript 5.9.3
- PostgreSQL + pgvector
- Groq (llama-3.3-70b-versatile)
