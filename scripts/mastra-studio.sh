#!/bin/bash

# Script para gerenciar o Mastra Studio
# Uso: ./mastra-studio.sh [start|stop|restart|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/mastra-studio.log"
PID_FILE="$PROJECT_DIR/.mastra-studio.pid"
PORT=3000

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Mata qualquer processo usando a porta 3000
kill_port_processes() {
    log_info "Verificando processos na porta $PORT..."
    local pids=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$pids" ]; then
        log_warn "Encerrando processos na porta $PORT: $pids"
        echo "$pids" | xargs -r kill -9 2>/dev/null || true
        sleep 1
        log_success "Processos encerrados"
    else
        log_info "Nenhum processo encontrado na porta $PORT"
    fi
}

# Obtém o PID do Mastra Studio
get_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Verifica se o servidor está rodando
is_running() {
    local pid=$(get_pid)
    if [ -n "$pid" ]; then
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    # Verifica também pela porta
    if lsof -ti:$PORT >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Inicia o Mastra Studio
start() {
    if is_running; then
        log_warn "Mastra Studio já está rodando!"
        status
        return 0
    fi

    log_info "Iniciando Mastra Studio..."
    
    # Mata qualquer processo na porta 3000
    kill_port_processes
    
    # Limpa arquivos antigos
    rm -f "$LOG_FILE"
    rm -f "$PID_FILE"
    
    # Inicia o servidor
    cd "$PROJECT_DIR"
    nohup mastra studio > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Aguarda o servidor iniciar
    log_info "Aguardando servidor iniciar..."
    local retries=0
    local max_retries=30
    
    while [ $retries -lt $max_retries ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT | grep -q "200"; then
            log_success "Mastra Studio iniciado com sucesso!"
            log_info "URL: http://localhost:$PORT"
            log_info "PID: $pid"
            log_info "Log: $LOG_FILE"
            return 0
        fi
        if ! kill -0 $pid 2>/dev/null; then
            log_error "O processo morreu inesperadamente"
            log_error "Verifique o log: $LOG_FILE"
            rm -f "$PID_FILE"
            return 1
        fi
        sleep 1
        retries=$((retries + 1))
    done
    
    log_error "Timeout ao iniciar o servidor"
    return 1
}

# Para o Mastra Studio
stop() {
    log_info "Parando Mastra Studio..."
    
    local pid=$(get_pid)
    local stopped=false
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        stopped=true
    fi
    
    # Mata qualquer processo na porta 3000 (garantia)
    kill_port_processes
    
    rm -f "$PID_FILE"
    
    if [ "$stopped" = true ]; then
        log_success "Mastra Studio parado"
    else
        log_warn "Mastra Studio não estava rodando"
    fi
}

# Reinicia o Mastra Studio
restart() {
    log_info "Reiniciando Mastra Studio..."
    stop
    sleep 1
    start
}

# Mostra o status
status() {
    local pid=$(get_pid)
    local http_status=""
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null | grep -q "200"; then
        http_status="${GREEN}Online${NC}"
    else
        http_status="${RED}Offline${NC}"
    fi
    
    echo "========================================"
    echo -e "Status do Mastra Studio: $http_status"
    echo "========================================"
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo -e "Processo: ${GREEN}Rodando${NC} (PID: $pid)"
    else
        echo -e "Processo: ${RED}Parado${NC}"
    fi
    
    echo "Porta: $PORT"
    echo "URL: http://localhost:$PORT"
    echo "Log: $LOG_FILE"
    echo "========================================"
}

# Ajuda
usage() {
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  start    - Inicia o Mastra Studio"
    echo "  stop     - Para o Mastra Studio"
    echo "  restart  - Reinicia o Mastra Studio"
    echo "  status   - Mostra o status do serviço"
    echo "  help     - Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 start"
    echo "  $0 stop"
    echo "  $0 restart"
}

# Main
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo "Comando desconhecido: ${1:-}"
        usage
        exit 1
        ;;
esac
