#!/bin/bash
# ============================================
# XpertIA - Script de Túneis SSH para VPS
# ============================================
# Este script estabelece túnel SSH para acessar
# PostgreSQL (5432) no VPS remoto.
#
# Uso:
#   ./scripts/tunnel-vps.sh start    # Iniciar túnel
#   ./scripts/tunnel-vps.sh stop     # Parar túnel
#   ./scripts/tunnel-vps.sh status   # Verificar status
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ler configurações do .env
if [ -f .env ]; then
    export $(cat .env | grep -E '^(VPS_XPERTIA_DEV|SSH_ROOT_KEY_PATH)=' | xargs)
fi

VPS_IP="${VPS_XPERTIA_DEV:-5.189.185.146}"
SSH_KEY="${SSH_ROOT_KEY_PATH:-.key/root_key}"
SSH_KEY="${SSH_KEY%.pub}"  # Remover .pub se presente

# Configurações SSH
SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes"

start_tunnel() {
    echo -e "${GREEN}=== Iniciando túnel SSH para VPS ($VPS_IP) ===${NC}"
    
    # Verificar se a chave existe
    if [ ! -f "$SSH_KEY" ]; then
        echo -e "${RED}Erro: Chave SSH não encontrada: $SSH_KEY${NC}"
        exit 1
    fi
    
    # Verificar permissões da chave
    PERM=$(stat -c %a "$SSH_KEY" 2>/dev/null || stat -f %Lp "$SSH_KEY" 2>/dev/null)
    if [ "$PERM" != "600" ]; then
        echo -e "${YELLOW}Ajustando permissões da chave SSH...${NC}"
        chmod 600 "$SSH_KEY"
    fi
    
    # Verificar se já existe túnel ativo
    PG_PID=$(pgrep -f "ssh.*-L 5432:localhost:5432.*root@$VPS_IP" || true)
    
    if [ -n "$PG_PID" ]; then
        echo -e "${YELLOW}Túnel já está ativo:${NC}"
        echo "  PostgreSQL (5432): PID $PG_PID"
        return 0
    fi
    
    # Criar túnel PostgreSQL
    echo -n "Criando túnel PostgreSQL (5432)... "
    ssh -i "$SSH_KEY" $SSH_OPTS -f -N -L 5432:localhost:5432 root@$VPS_IP
    sleep 2
    if timeout 2 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FALHOU${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Túnel ativo!${NC}"
    echo "  PostgreSQL: localhost:5432 → $VPS_IP:5432"
}

stop_tunnel() {
    echo -e "${YELLOW}=== Parando túnel SSH ===${NC}"
    
    PG_PID=$(pgrep -f "ssh.*-L 5432:localhost:5432.*root@$VPS_IP" || true)
    
    if [ -n "$PG_PID" ]; then
        echo "Encerrando túnel PostgreSQL (PID $PG_PID)..."
        kill $PG_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}Túnel encerrado.${NC}"
}

check_status() {
    echo -e "${GREEN}=== Status do Túnel ===${NC}"
    
    PG_PID=$(pgrep -f "ssh.*-L 5432:localhost:5432.*root@$VPS_IP" || true)
    
    # Verificar PostgreSQL
    echo -n "PostgreSQL (localhost:5432): "
    if [ -n "$PG_PID" ] && timeout 2 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null; then
        echo -e "${GREEN}CONECTADO${NC} (PID $PG_PID)"
    else
        echo -e "${RED}DESCONECTADO${NC}"
    fi
}

# Main
case "${1:-status}" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    status)
        check_status
        ;;
    restart)
        stop_tunnel
        sleep 1
        start_tunnel
        ;;
    *)
        echo "Uso: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
