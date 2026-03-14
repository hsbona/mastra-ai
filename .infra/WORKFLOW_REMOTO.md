# 💻 Workflow de Desenvolvimento: Local vs Remoto

## A Pergunta

> "Após fazer essa configuração, terei que baixar meu repositório git no VPS e desenvolver a solução no VSCode remote? Quais vantagens e desvantagens?"

**Resposta curta:** NÃO é obrigatório! Você tem **2 opções** de workflow.

**Resposta completa:** Vamos explorar ambas as opções e suas implicações.

---

## 🎯 As 2 Opções de Workflow

### Opção 1: Desenvolvimento REMOTO (VSCode + SSH)

```
┌─────────────────┐      SSH      ┌─────────────────────────────┐
│   SEU PC        │◄─────────────►│         VPS                 │
│                 │               │  5.189.185.146              │
│  VSCode Local   │               │                             │
│       +         │               │  ┌───────────────────────┐  │
│  Extensão SSH   │               │  │ VSCode Server         │  │
│                 │               │  │ (roda na VPS)         │  │
└─────────────────┘               │  └───────────────────────┘  │
                                  │            │                │
                                  │            ▼                │
                                  │  ┌───────────────────────┐  │
                                  │  │ Código fonte          │  │
                                  │  │ /opt/xpertia/app/     │  │
                                  │  │                       │  │
                                  │  │ • git clone na VPS    │  │
                                  │  │ • edita DIRETO lá     │  │
                                  │  └───────────────────────┘  │
                                  │                             │
                                  └─────────────────────────────┘

Você edita arquivos que estão NA VPS, pelo VSCode local.
O código NUNCA passa pelo seu computador (só a interface do VSCode).
```

### Opção 2: Desenvolvimento LOCAL + Deploy

```
┌─────────────────────────────┐        Deploy        ┌─────────────────────────────┐
│         SEU PC              │◄────────────────────►│         VPS                 │
│                             │    (git push/pull    │  5.189.185.146              │
│  ┌───────────────────────┐  │     ou scp/rsync)    │                             │
│  │ VSCode Local          │  │                      │  ┌───────────────────────┐  │
│  │                       │  │                      │  │ Código fonte          │  │
│  │ • Edita localmente    │  │                      │  │ /opt/xpertia/app/     │  │
│  │ • git commit          │  │                      │  │                       │  │
│  │ • git push            │  │                      │  │ • git pull na VPS     │  │
│  └───────────────────────┘  │                      │  │ • recebe atualizações │  │
│            │                │                      │  └───────────────────────┘  │
│            ▼                │                      │                             │
│  ┌───────────────────────┐  │                      │                             │
│  │ Repositório Git       │  │                      │                             │
│  │ (GitHub/GitLab)       │◄─┘                      │                             │
│  │                       │                         │                             │
│  └───────────────────────┘                         │                             │
│                                                    │                             │
└─────────────────────────────┘                      └─────────────────────────────┘

Você edita localmente, commita, pusha.
Na VPS, faz git pull para atualizar.
```

---

## 🔍 Opção 1: Desenvolvimento Remoto (VSCode Remote SSH)

### Como funciona?

```bash
# 1. Instalar extensão "Remote - SSH" no VSCode local

# 2. Conectar na VPS
Ctrl+Shift+P → "Remote-SSH: Connect to Host..."
→ root@5.189.185.146

# 3. VSCode abre uma NOVA JANELA conectada na VPS
#    Tudo que você faz nessa janela roda NA VPS!

# 4. Clonar repositório (dentro do VSCode remoto)
git clone https://github.com/seu-usuario/xpertia.git

# 5. Editar, salvar, testar - tudo roda na VPS!
```

### ✅ Vantagens

| Vantagem | Explicação |
|----------|------------|
| **Zero Latência** | Código está na VPS, sem transferir arquivos |
| **Teste Imediato** | Salva o arquivo → PM2 reinicia → testa no navegador |
| **Ambiente Único** | Não precisa instalar Node.js localmente |
| **Backup Automático** | Código na VPS = backup no servidor |
| **Acesso de Qualquer Lugar** | Só precisa de internet + VSCode |
| **Recursos da VPS** | Usa CPU/RAM da VPS (24GB!) não do seu PC |

### ❌ Desvantagens

| Desvantagem | Explicação |
|-------------|------------|
| **Depende de Internet** | Sem internet = sem desenvolvimento |
| **Latência na Interface** | Digitar pode ter delay (depende da conexão) |
| **Risco de Perda** | Se VPS cair, pode perder trabalho não commitado |
| **Git na VPS** | Precisa configurar SSH keys na VPS para GitHub |
| **Custo** | VPS ligada 24/7 (mas já está assim) |

---

## 🔍 Opção 2: Desenvolvimento Local + Deploy

### Como funciona?

```bash
# 1. No seu PC local
cd ~/projetos

# 2. Clonar repositório (já deve ter)
git clone https://github.com/seu-usuario/xpertia.git

# 3. Desenvolver localmente
#    Editar arquivos...
#    Testar localmente (se quiser)...

# 4. Commit e push
git add .
git commit -m "feat: nova feature"
git push origin main

# 5. Na VPS, atualizar
ssh root@5.189.185.146
cd /opt/xpertia/app/XpertIA
git pull
pm2 restart xpertia-mastra
```

### ✅ Vantagens

| Vantagem | Explicação |
|----------|------------|
| **Offline** | Desenvolve sem internet, só deploy precisa |
| **Zero Latência** | Digitar, salvar, navegar = instantâneo |
| **Controle Total** | Código sempre no seu computador |
| **Git Local** | Usa suas SSH keys, configurações locais |
| **Backup Local** | Código no PC + no GitHub = dupla segurança |
| **Teste Local** | Pode testar primeiro localmente antes de deployar |

### ❌ Desvantagens

| Desvantagem | Explicação |
|-------------|------------|
| **Deploy Manual** | Precisa lembrar de fazer git push + pull |
| **Sincronização** | Pode esquecer de deployar uma mudança |
| **Ambiente Diferente** | Seu PC ≠ VPS (pode funcionar local e falhar na VPS) |
| **Duplicação** | Código em 2 lugares (PC + VPS) |
| **Instalação Local** | Precisa Node.js, pnpm no seu PC também |

---

## 📊 Comparação Direta

| Aspecto | Remoto (VSCode SSH) | Local + Deploy | Melhor? |
|---------|---------------------|----------------|---------|
| **Velocidade de edição** | 🟡 (pode ter delay) | 🟢 (instantâneo) | Local |
| **Velocidade de teste** | 🟢 (instantâneo) | 🟡 (precisa deploy) | Remoto |
| **Independência** | 🟡 (precisa internet) | 🟢 (offline) | Local |
| **Segurança do código** | 🟡 (só na VPS) | 🟢 (PC + GitHub) | Local |
| **Simplicidade** | 🟢 (um ambiente só) | 🟡 (dois ambientes) | Remoto |
| **Custo** | 🟡 (VPS sempre ligada) | 🟢 (só deploy usa VPS) | Local |
| **Backup** | 🟡 (commit frequente!) | 🟢 (natural) | Local |

---

## 🎯 Recomendação para XpertIA

### Para Desenvolvimento Ativo: **REMOTO** (VSCode SSH)

```bash
# Por que?
# • Você está experimentando o Mastra
# • Precisa testar mudanças rapidamente
# • O PostgreSQL está na VPS (dados reais)
# • Menos fricção: salva → testa → salva → testa
```

### Para Produção Estável: **LOCAL + Deploy**

```bash
# Por que?
# • Código mais seguro (seu PC + GitHub)
# • Pode desenvolver offline
# • Deploy controlado (só quando pronto)
# • Histórico de versões claro
```

---

## 🛠️ Configurando VSCode Remote SSH

### Passo 1: Instalar Extensão

```
1. Abra VSCode local
2. Extensões (Ctrl+Shift+X)
3. Procure: "Remote - SSH" (Microsoft)
4. Instale
```

### Passo 2: Adicionar Host

```bash
# Terminal local
# Editar arquivo de configuração SSH

# Linux/Mac:
nano ~/.ssh/config

# Windows:
# %USERPROFILE%\.ssh\config
```

Adicione:

```
Host xpertia-vps
    HostName 5.189.185.146
    User root
    IdentityFile ~/.ssh/id_rsa  # ou onde está sua chave
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### Passo 3: Conectar

```bash
# Opção A: Pelo terminal
ssh root@5.189.185.146

# Opção B: Pelo VSCode
Ctrl+Shift+P → "Remote-SSH: Connect to Host..."
→ Selecione "xpertia-vps"

# Vai abrir uma NOVA JANELA do VSCode conectada na VPS!
```

### Passo 4: Clonar Projeto (na VPS)

```bash
# No terminal do VSCode remoto (já está na VPS!)
cd /opt/xpertia/app

# Clonar repositório
git clone https://github.com/seu-usuario/mastra-ai.git XpertIA

# Ou copiar do repositório existente
```

### Passo 5: Configurar Git na VPS

```bash
# Gerar SSH key na VPS (se não tiver)
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Adicionar no GitHub:
# Settings → SSH and GPG keys → New SSH key

# Configurar git
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

### Passo 6: Instalar Extensões no VSCode Remoto

```
Na nova janela do VSCode (conectada na VPS):
1. Extensões
2. Instale as que você usa:
   - TypeScript Importer
   - ESLint
   - Prettier
   - Outras...

IMPORTANTE: Clique em "Install in SSH: xpertia-vps"
```

---

## 🔄 Workflow Híbrido (Recomendado)

Você pode usar **AMBOS** os workflows!

### Durante Desenvolvimento Ativo

```bash
# Use VSCode Remote SSH
# • Edita direto na VPS
# • Testa instantaneamente
# • Faz commits frequentes
```

### Quando Travar/Viajar

```bash
# Use Local
# • git pull no seu PC
# • Desenvolve offline
# • git push quando voltar
```

### Sincronização

```bash
# Sempre que mudar de um para outro:

# Do Remoto para Local (no PC)
git pull origin main

# Do Local para Remoto (na VPS)
git pull origin main
```

---

## ⚠️ Cuidados Importantes

### Se usar Remoto (VSCode SSH)

```bash
# 1. COMMIT FREQUENTE!
# O código está só na VPS. Se ela cair, perde tudo.

# Faça isso sempre que possível:
git add .
git commit -m "wip: trabalhando em X"
git push

# 2. Configure auto-save no VSCode
# File → Auto Save

# 3. Tenha backup do .env
# O .env não vai pro GitHub (está no .gitignore)
# Faça backup manual: scp, ou anote em local seguro
```

### Se usar Local

```bash
# 1. Não esqueça de deployar!
# Após push, lembre de entrar na VPS e fazer git pull

# 2. Teste na VPS
# Pode funcionar local e falhar na VPS (diferenças de ambiente)

# 3. Mantenha .env sincronizado
# Se mudar variáveis, atualiza em ambos os lugares
```

---

## 🎯 Checklist de Decisão

### Use REMOTO se:
- ✅ Está experimentando/testando muito
- ✅ Precisa de feedback rápido (salva → vê resultado)
- ✅ Não quer instalar Node.js no PC
- ✅ Tem boa internet (baixa latência)
- ✅ VPS é confiável (backups frequentes)

### Use LOCAL se:
- ✅ Desenvolve em locais sem internet
- ✅ Prefere segurança do código no seu PC
- ✅ Internet é lenta/instável
- ✅ Quer controle total do ambiente
- ✅ Prefere deploys controlados

---

## 📚 Resumo Visual

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW REMOTO (VSCode SSH)                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SEU PC                    VPS                                     │
│   ┌──────────┐             ┌──────────────┐                         │
│   │ VSCode   │◄── SSH ───►│ VSCode Server│                         │
│   │ (UI)     │             │              │                         │
│   └──────────┘             │ ┌──────────┐ │                         │
│                            │ │ Código   │ │                         │
│                            │ │ Git      │ │                         │
│                            │ │ Node.js  │ │                         │
│                            │ └──────────┘ │                         │
│                            └──────────────┘                         │
│                                                                      │
│   ✅ Teste instantâneo                                               │
│   ⚠️  Precisa de internet                                            │
│   ⚠️  Commit frequente!                                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                 WORKFLOW LOCAL + DEPLOY                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SEU PC                              VPS                           │
│   ┌──────────┐    git push ──┐       ┌──────────────┐              │
│   │ Código   │───────────────┼──────►│ git pull     │              │
│   │ Git      │               │       │ Código       │              │
│   │ Node.js  │               │       └──────────────┘              │
│   └──────────┘               │                                       │
│                              │       GitHub (meio de campo)         │
│                              └──────►┌──────────────┐              │
│                                      │ Repositório  │              │
│                                      └──────────────┘              │
│                                                                      │
│   ✅ Desenvolve offline                                              │
│   ✅ Código seguro no PC                                             │
│   ⚠️  Precisa lembrar de deployar                                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Conclusão

| Pergunta | Resposta |
|----------|----------|
| É obrigatório usar VSCode Remote? | **NÃO!** Você escolhe |
| Qual é melhor? | **Depende do momento** |
| Posso alternar? | **SIM! Use o melhor dos dois mundos** |
| Recomendação inicial? | **Remoto** (mais fácil para experimentar) |
| Para produção? | **Local + Deploy** (mais seguro) |

---

*Documento criado para ajudar na escolha do workflow de desenvolvimento*
