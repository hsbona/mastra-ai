#!/bin/bash
# ============================================
# Xpert - Script de Gerenciamento do Mastra Studio (Desenvolvimento)
# ============================================
# Ambiente: VPS de Desenvolvimento (AlmaLinux 9)
# Uso:
#   ./scripts/mastra-studio.sh start    # Iniciar Studio
#   ./scripts/mastra-studio.sh stop     # Parar Studio
#   ./scripts/mastra-studio.sh restart  # Reiniciar Studio
#   ./scripts/mastra-studio.sh status   # Verificar status
#   ./scripts/mastra-studio.sh logs     # Ver logs
# ============================================

set -eo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
XPERT_DIR="$PROJECT_ROOT/Xpert"
LOG_FILE="/tmp/mastra-studio.log"
PID_FILE="/tmp/mastra-studio.pid"
STUDIO_PORT="4111"

cd "$PROJECT_ROOT"

# ============================================
# Funções Auxiliares
# ============================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1"; }

# ============================================
# Gerenciamento de Processos
# ============================================

kill_mastra_processes() {
    log_info "Encerrando processos Mastra..."
    
    # Matar processos na porta 4111
    fuser -k $STUDIO_PORT/tcp 2>/dev/null || true
    
    # Matar por padrão
    pkill -f "mastra/dist/index.js" 2>/dev/null || true
    pkill -f "pnpm.*mastra" 2>/dev/null || true
    pkill -f "pnpm run dev" 2>/dev/null || true
    pkill -f "esbuild" 2>/dev/null || true
    
    sleep 2
    
    # Forçar se ainda existirem
    for pattern in "mastra/dist/index.js" "pnpm.*mastra" "pnpm run dev"; do
        local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
        for pid in $pids; do
            kill -9 "$pid" 2>/dev/null || true
        done
    done
    
    log_success "Processos encerrados"
}

wait_for_port() {
    local timeout=${1:-10}
    log_info "Aguardando porta $STUDIO_PORT..."
    
    for i in $(seq 1 $timeout); do
        if ! ss -tlnp 2>/dev/null | grep -q ":$STUDIO_PORT"; then
            log_success "Porta liberada"
            return 0
        fi
        sleep 1
    done
    
    log_warn "Timeout aguardando porta"
    return 1
}

# ============================================
# Comandos
# ============================================

cmd_start() {
    echo -e "${GREEN}=== Iniciando Mastra Studio ===${NC}\n"
    
    # Verificar dependências
    if [ ! -d "$XPERT_DIR/node_modules" ]; then
        log_warn "node_modules não encontrado. Instalando..."
        (cd "$XPERT_DIR" && pnpm install)
    fi
    
    # Verificar PostgreSQL
    if ! timeout 3 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null; then
        log_error "PostgreSQL não acessível"
        exit 1
    fi
    
    # Limpar porta se necessário
    if ss -tlnp 2>/dev/null | grep -q ":$STUDIO_PORT"; then
        log_warn "Porta $STUDIO_PORT ocupada. Limpando..."
        kill_mastra_processes
        wait_for_port 5 || true
    fi
    
    # Limpar logs
    > "$LOG_FILE"
    rm -f "$PID_FILE"
    
    # Iniciar
    cd "$XPERT_DIR"
    log_info "Iniciando: pnpm run dev"
    nohup pnpm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    # Aguardar startup
    log_info "Aguardando inicialização..."
    for i in $(seq 1 60); do
        if grep -q "ready in\|Local:" "$LOG_FILE" 2>/dev/null; then
            break
        fi
        if [ $((i % 10)) -eq 0 ]; then
            log_info "  Aguardando... (${i}s)"
        fi
        sleep 1
    done
    
    sleep 2
    
    # Verificar
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$STUDIO_PORT 2>/dev/null || echo "000")
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "302" ]]; then
        log_success "Mastra Studio iniciado!"
        echo ""
        echo -e "${BLUE}Studio:${NC} http://localhost:$STUDIO_PORT"
        echo -e "${BLUE}API:${NC}    http://localhost:$STUDIO_PORT/api"
        echo -e "${BLUE}Logs:${NC}   tail -f $LOG_FILE"
    else
        log_error "Falha ao iniciar (HTTP $http_code)"
        tail -20 "$LOG_FILE"
        return 1
    fi
}

cmd_stop() {
    echo -e "${YELLOW}=== Parando Mastra Studio ===${NC}\n"
    
    # Pelo PID file
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    
    kill_mastra_processes
    wait_for_port 10 || true
    
    rm -f "$LOG_FILE"
    log_success "Mastra Studio parado"
}

cmd_restart() {
    echo -e "${YELLOW}=== Reiniciando Mastra Studio ===${NC}\n"
    cmd_stop
    sleep 2
    cmd_start
}

cmd_status() {
    echo -e "${GREEN}=== Status ===${NC}\n"
    
    echo -n "PostgreSQL:    "
    timeout 2 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null && echo -e "${GREEN}OK${NC}" || echo -e "${RED}OFF${NC}"
    
    echo -n "Mastra Studio: "
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$STUDIO_PORT 2>/dev/null || echo "000")
    [[ "$http_code" == "200" ]] && echo -e "${GREEN}ON${NC} (http://localhost:$STUDIO_PORT)" || echo -e "${RED}OFF${NC}"
    
    echo -n "Porta $STUDIO_PORT:    "
    ss -tlnp 2>/dev/null | grep -q ":$STUDIO_PORT" && echo -e "${GREEN}Ocupada${NC}" || echo -e "${YELLOW}Livre${NC}"
}

cmd_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        log_error "Log não encontrado"
        exit 1
    fi
}

# ============================================
# Main
# ============================================

case "${1:-status}" in
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart) cmd_restart ;;
    status) cmd_status ;;
    logs) cmd_logs ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia Mastra Studio"
        echo "  stop    - Para Mastra Studio"
        echo "  restart - Reinicia o Studio (use após alterar código)"
        echo "  status  - Mostra status"
        echo "  logs    - Acompanha logs"
        exit 1
        ;;
esac
