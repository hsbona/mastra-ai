#!/bin/bash
# ============================================================
# Setup VPS - XpertIA Mastra
# ============================================================
# Script para configurar a VPS de produção automaticamente
# Execute como root na VPS (5.189.185.146)
#
# Uso:
#   chmod +x setup-vps.sh
#   ./setup-vps.sh
# ============================================================

set -e  # Parar em caso de erro

echo "🚀 Iniciando setup da VPS XpertIA..."
echo "===================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================
# 1. VERIFICAÇÕES INICIAIS
# ============================================================
echo ""
echo "📋 Verificações iniciais..."

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Este script deve ser executado como root${NC}"
  exit 1
fi

# Verificar conectividade
if ! ping -c 1 google.com &> /dev/null; then
  echo -e "${RED}❌ Sem conexão com a internet${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Verificações OK${NC}"

# ============================================================
# 2. ATUALIZAR SISTEMA
# ============================================================
echo ""
echo "🔄 Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq
echo -e "${GREEN}✅ Sistema atualizado${NC}"

# ============================================================
# 3. INSTALAR DEPENDÊNCIAS
# ============================================================
echo ""
echo "📦 Instalando dependências..."
apt-get install -y -qq \
  curl \
  wget \
  git \
  vim \
  htop \
  unzip \
  certbot \
  python3-certbot-nginx \
  ufw \
  fail2ban

echo -e "${GREEN}✅ Dependências instaladas${NC}"

# ============================================================
# 4. INSTALAR NODE.JS 22+
# ============================================================
echo ""
echo "⬢ Instalando Node.js 22..."

# Verificar versão atual
CURRENT_NODE=$(node --version 2>/dev/null || echo "none")
if [[ "$CURRENT_NODE" == "v22."* ]] || [[ "$CURRENT_NODE" == "v23."* ]]; then
  echo -e "${YELLOW}⚠️  Node.js $CURRENT_NODE já está instalado${NC}"
else
  # Remover versão antiga se existir
  if command -v node &> /dev/null; then
    echo "Removendo Node.js antigo..."
    apt-get remove -y nodejs npm 2>/dev/null || true
    rm -f /etc/apt/sources.list.d/nodesource.list
  fi
  
  # Instalar Node.js 22
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  
  echo -e "${GREEN}✅ Node.js $(node --version) instalado${NC}"
fi

# ============================================================
# 5. INSTALAR PNPM
# ============================================================
echo ""
echo "📦 Instalando pnpm..."

if command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}⚠️  pnpm $(pnpm --version) já está instalado${NC}"
else
  curl -fsSL https://get.pnpm.io/install.sh | bash -
  export PNPM_HOME="$HOME/.local/share/pnpm"
  export PATH="$PNPM_HOME:$PATH"
  echo -e "${GREEN}✅ pnpm $(pnpm --version) instalado${NC}"
fi

# ============================================================
# 6. INSTALAR PM2
# ============================================================
echo ""
echo "⚙️  Instalando PM2..."

if command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}⚠️  PM2 $(pm2 --version) já está instalado${NC}"
else
  pnpm add -g pm2
  echo -e "${GREEN}✅ PM2 $(pm2 --version) instalado${NC}"
fi

# ============================================================
# 7. CONFIGURAR ESTRUTURA DE PASTAS
# ============================================================
echo ""
echo "📁 Configurando estrutura de pastas..."

# Criar usuário se não existir
if ! id -u xpertia-dev &>/dev/null; then
  useradd -m -s /bin/bash xpertia-dev
  usermod -aG docker xpertia-dev 2>/dev/null || true
  echo -e "${GREEN}✅ Usuário xpertia-dev criado${NC}"
fi

# Criar estrutura
mkdir -p /opt/xpertia/app
mkdir -p /opt/xpertia/backups
mkdir -p /var/log/xpertia
chown -R xpertia-dev:xpertia-dev /opt/xpertia
chown -R xpertia-dev:xpertia-dev /var/log/xpertia

echo -e "${GREEN}✅ Estrutura de pastas criada${NC}"

# ============================================================
# 8. CONFIGURAR FIREWALL
# ============================================================
echo ""
echo "🔒 Configurando firewall (UFW)..."

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 5432/tcp comment 'PostgreSQL'

# Não habilitar automaticamente para evitar lockout
# ufw --force enable

echo -e "${YELLOW}⚠️  Firewall configurado mas não ativado automaticamente${NC}"
echo "   Execute 'ufw enable' manualmente quando confirmar acesso SSH"

# ============================================================
# 9. CONFIGURAR FAIL2BAN
# ============================================================
echo ""
echo "🛡️  Configurando Fail2Ban..."

systemctl enable fail2ban
systemctl start fail2ban

echo -e "${GREEN}✅ Fail2Ban configurado${NC}"

# ============================================================
# 10. OTIMIZAR POSTGRESQL (Opcional)
# ============================================================
echo ""
echo "🗄️  Verificando PostgreSQL..."

if docker ps | grep -q "xpertia-postgres"; then
  echo -e "${GREEN}✅ PostgreSQL container está rodando${NC}"
  
  # Mostrar uso atual
  echo ""
  echo "📊 Uso atual do PostgreSQL:"
  docker stats --no-stream xpertia-postgres 2>/dev/null || true
  
  echo ""
  echo -e "${YELLOW}⚠️  Para otimizar PostgreSQL (reduzir de 6GB para 1.5GB):${NC}"
  echo "   1. Veja: /opt/xpertia/.infra/postgresql-optimization.md"
  echo "   2. Use: docker/docker-compose.prod.yml"
else
  echo -e "${YELLOW}⚠️  PostgreSQL container não encontrado${NC}"
  echo "   Verifique se o Docker Compose está configurado em /opt/xpertia/docker/"
fi

# ============================================================
# 11. RESUMO
# ============================================================
echo ""
echo "===================================="
echo -e "${GREEN}✅ Setup da VPS concluído!${NC}"
echo "===================================="
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Copiar o projeto para a VPS:"
echo "   scp -r XpertIA/ root@5.189.185.146:/opt/xpertia/app/"
echo ""
echo "2. Configurar variáveis de ambiente:"
echo "   vim /opt/xpertia/app/XpertIA/.env"
echo ""
echo "3. Instalar dependências:"
echo "   cd /opt/xpertia/app/XpertIA && pnpm install"
echo ""
echo "4. Configurar PM2:"
echo "   cp /opt/xpertia/.infra/pm2-ecosystem.config.js /opt/xpertia/app/ecosystem.config.js"
echo "   cd /opt/xpertia/app && pm2 start ecosystem.config.js"
echo "   pm2 save && pm2 startup"
echo ""
echo "5. Habilitar firewall (quando confirmar acesso):"
echo "   ufw enable"
echo ""
echo "📚 Documentação:"
echo "   - Guia completo: /opt/xpertia/.infra/vps-deployment-guide.md"
echo "   - Otimização PostgreSQL: /opt/xpertia/.infra/postgresql-optimization.md"
echo ""
echo "🌐 Acesse o Mastra Studio:"
echo "   http://5.189.185.146:4111 (após iniciar o PM2)"
echo ""
