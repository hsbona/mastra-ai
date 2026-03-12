#!/bin/bash
# ============================================
# XpertIA - Script de Inicialização do Mastra Studio
# ============================================
# Este script gerencia todo o ciclo de vida do Mastra Studio:
# 1. Verifica/inicia túnel SSH para VPS
# 2. Verifica conexão com PostgreSQL
# 3. Inicia o Mastra Studio
# 4. Gerencia graceful shutdown
#
# Uso:
#   ./scripts/mastra-studio.sh start    # Iniciar Studio
#   ./scripts/mastra-studio.sh stop     # Parar Studio + túnel
#   ./scripts/mastra-studio.sh restart  # Reiniciar
#   ./scripts/mastra-studio.sh status   # Verificar status
#   ./scripts/mastra-studio.sh logs     # Ver logs em tempo real
# ============================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
XPERTIA_DIR="$PROJECT_ROOT/XpertIA"
LOG_FILE="/tmp/mastra-studio.log"
PID_FILE="/tmp/mastra-studio.pid"

# Verificar se está no diretório correto
cd "$PROJECT_ROOT"

# ============================================
# Funções Auxiliares
# ============================================

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
    echo -e "${RED}[ERRO]${NC} $1"
}

# ============================================
# Verificação de Dependências
# ============================================

check_dependencies() {
    log_info "Verificando dependências..."
    
    # Verificar se XpertIA existe
    if [ ! -d "$XPERTIA_DIR" ]; then
        log_error "Diretório XpertIA não encontrado em $XPERTIA_DIR"
        exit 1
    fi
    
    # Verificar .env
    if [ ! -f "$XPERTIA_DIR/.env" ]; then
        log_error "Arquivo .env não encontrado em $XPERTIA_DIR/.env"
        log_info "Certifique-se de que o arquivo .env existe em XpertIA/"
        exit 1
    fi
    
    # Verificar node_modules
    if [ ! -d "$XPERTIA_DIR/node_modules" ]; then
        log_warn "node_modules não encontrado. Executando pnpm install..."
        cd "$XPERTIA_DIR" && pnpm install
    fi
    
    log_success "Dependências verificadas"
}

# ============================================
# Gerenciamento do Túnel SSH
# ============================================

start_tunnel() {
    log_info "Iniciando túnel SSH para VPS..."
    
    if [ -f "$SCRIPT_DIR/tunnel-vps.sh" ]; then
        "$SCRIPT_DIR/tunnel-vps.sh" start
    else
        log_error "Script tunnel-vps.sh não encontrado"
        exit 1
    fi
}

stop_tunnel() {
    log_info "Parando túnel SSH..."
    
    if [ -f "$SCRIPT_DIR/tunnel-vps.sh" ]; then
        "$SCRIPT_DIR/tunnel-vps.sh" stop
    fi
}

check_tunnel() {
    if [ -f "$SCRIPT_DIR/tunnel-vps.sh" ]; then
        "$SCRIPT_DIR/tunnel-vps.sh" status > /dev/null 2>&1
        return $?
    fi
    return 1
}

# ============================================
# Verificação do PostgreSQL
# ============================================

check_postgres() {
    log_info "Verificando conexão com PostgreSQL..."
    
    # Carregar DATABASE_URL do .env
    if [ -f "$XPERTIA_DIR/.env" ]; then
        export $(grep -E '^DATABASE_URL=' "$XPERTIA_DIR/.env" | xargs)
    fi
    
    # Tentar conectar
    if timeout 5 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null; then
        log_success "PostgreSQL acessível em localhost:5432"
        return 0
    else
        log_error "Não foi possível conectar ao PostgreSQL em localhost:5432"
        log_info "Verifique se o túnel SSH está ativo"
        return 1
    fi
}

# ============================================
# Gerenciamento do Mastra Studio
# ============================================

start_studio() {
    log_info "Iniciando Mastra Studio..."
    
    # Verificar se já está rodando
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            log_warn "Mastra Studio já está rodando (PID: $OLD_PID)"
            log_info "Acesse: http://localhost:4111"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # Verificar se há processo mastra na porta 4111
    EXISTING_PID=$(lsof -ti:4111 2>/dev/null || true)
    if [ -n "$EXISTING_PID" ]; then
        log_warn "Porta 4111 ocupada (PID: $EXISTING_PID). Encerrando..."
        kill -TERM "$EXISTING_PID" 2>/dev/null || true
        sleep 2
    fi
    
    # Limpar log anterior
    > "$LOG_FILE"
    
    # Iniciar Mastra Studio
    cd "$XPERTIA_DIR"
    nohup pnpm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    log_info "Aguardando inicialização..."
    
    # Aguardar até 30 segundos pelo startup
    for i in {1..30}; do
        if grep -q "ready in" "$LOG_FILE" 2>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Verificar se iniciou corretamente
    sleep 2
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4111 | grep -q "200\|302"; then
        log_success "Mastra Studio iniciado com sucesso!"
        log_info "Studio: http://localhost:4111"
        log_info "API:    http://localhost:4111/api"
        log_info "Logs:   tail -f $LOG_FILE"
        return 0
    else
        log_error "Falha ao iniciar Mastra Studio"
        log_info "Verifique os logs: $LOG_FILE"
        cat "$LOG_FILE" | tail -20
        return 1
    fi
}

stop_studio() {
    log_info "Parando Mastra Studio..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill -TERM "$PID" 2>/dev/null || true
            sleep 2
            
            # Force kill se necessário
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -KILL "$PID" 2>/dev/null || true
            fi
            
            log_success "Mastra Studio parado (PID: $PID)"
        fi
        rm -f "$PID_FILE"
    fi
    
    # Limpar qualquer processo mastra na porta 4111
    EXISTING_PID=$(lsof -ti:4111 2>/dev/null || true)
    if [ -n "$EXISTING_PID" ]; then
        kill -TERM "$EXISTING_PID" 2>/dev/null || true
    fi
}

show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        log_error "Arquivo de log não encontrado: $LOG_FILE"
        exit 1
    fi
}

show_status() {
    echo -e "${GREEN}=== Status do XpertIA ===${NC}"
    echo ""
    
    # Status do túnel
    echo -n "Túnel SSH:     "
    if timeout 2 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null; then
        echo -e "${GREEN}CONECTADO${NC}"
    else
        echo -e "${RED}DESCONECTADO${NC}"
    fi
    
    # Status do PostgreSQL
    echo -n "PostgreSQL:    "
    if timeout 2 bash -c "</dev/tcp/127.0.0.1/5432" 2>/dev/null; then
        echo -e "${GREEN}ACESSÍVEL${NC}"
    else
        echo -e "${RED}INACESSÍVEL${NC}"
    fi
    
    # Status do Mastra
    echo -n "Mastra Studio: "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:4111 | grep -q "200\|302"; then
        echo -e "${GREEN}RODANDO${NC} (http://localhost:4111)"
    else
        echo -e "${RED}PARADO${NC}"
    fi
    
    echo ""
    
    # PIDs
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "PID do Studio: ${GREEN}$PID${NC}"
        fi
    fi
}

# ============================================
# Comando Principal: START
# ============================================

cmd_start() {
    echo -e "${GREEN}=== Iniciando XpertIA ===${NC}"
    echo ""
    
    check_dependencies
    echo ""
    
    start_tunnel
    echo ""
    
    if ! check_postgres; then
        log_error "Não foi possível conectar ao PostgreSQL"
        log_info "Verifique se o túnel SSH está configurado corretamente"
        exit 1
    fi
    echo ""
    
    if start_studio; then
        echo ""
        log_success "XpertIA está pronto!"
        echo ""
        echo -e "${BLUE}Acesse:${NC} http://localhost:4111"
        echo -e "${BLUE}Logs:${NC}   ./scripts/mastra-studio.sh logs"
        echo -e "${BLUE}Parar:${NC}  ./scripts/mastra-studio.sh stop"
    else
        exit 1
    fi
}

# ============================================
# Comando Principal: STOP
# ============================================

cmd_stop() {
    echo -e "${YELLOW}=== Parando XpertIA ===${NC}"
    echo ""
    
    stop_studio
    echo ""
    
    stop_tunnel
    echo ""
    
    log_success "XpertIA parado"
}

# ============================================
# Comando Principal: RESTART
# ============================================

cmd_restart() {
    cmd_stop
    sleep 2
    cmd_start
}

# ============================================
# Main
# ============================================

case "${1:-status}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia túnel SSH + Mastra Studio"
        echo "  stop    - Para Mastra Studio + túnel SSH"
        echo "  restart - Reinicia tudo"
        echo "  status  - Mostra status de todos os serviços"
        echo "  logs    - Acompanha logs em tempo real"
        exit 1
        ;;
esac
