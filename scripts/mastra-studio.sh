#!/bin/bash
# ============================================
# Xpert - Script de Inicialização do Mastra Studio
# ============================================
# Este script gerencia todo o ciclo de vida do Mastra Studio
# na VPS de desenvolvimento (AlmaLinux 9).
#
# Uso:
#   ./scripts/mastra-studio.sh start    # Iniciar Studio
#   ./scripts/mastra-studio.sh stop     # Parar Studio
#   ./scripts/mastra-studio.sh restart  # Reiniciar
#   ./scripts/mastra-studio.sh status   # Verificar status
#   ./scripts/mastra-studio.sh logs     # Ver logs em tempo real
# ============================================
# Ambiente: VPS (AlmaLinux 9.7 - 5.189.185.146)
# PostgreSQL: localhost:5432
# ============================================

set -eo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
XPERT_DIR="$PROJECT_ROOT/Xpert"
LOG_FILE="/tmp/mastra-studio.log"
PID_FILE="/tmp/mastra-studio.pid"

# Configurações do ambiente VPS
VPS_IP="5.189.185.146"
PG_HOST="localhost"
PG_PORT="5432"

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
    
    # Verificar se Xpert existe
    if [ ! -d "$XPERT_DIR" ]; then
        log_error "Diretório Xpert não encontrado em $XPERT_DIR"
        exit 1
    fi
    
    # Verificar .env
    if [ ! -f "$XPERT_DIR/.env" ]; then
        log_error "Arquivo .env não encontrado em $XPERT_DIR/.env"
        log_info "Certifique-se de que o arquivo .env existe em Xpert/"
        exit 1
    fi
    
    # Verificar node_modules
    if [ ! -d "$XPERT_DIR/node_modules" ]; then
        log_warn "node_modules não encontrado. Executando pnpm install..."
        (cd "$XPERT_DIR" && pnpm install)
    fi
    
    # Verificar pnpm
    if ! command -v pnpm &>/dev/null; then
        log_error "pnpm não encontrado. Instale com: npm install -g pnpm"
        exit 1
    fi
    
    log_success "Dependências verificadas"
}

# ============================================
# Verificação do PostgreSQL
# ============================================

check_postgres() {
    log_info "Verificando conexão com PostgreSQL ($PG_HOST:$PG_PORT)..."
    
    # Verificar se PostgreSQL está rodando via systemctl
    local pg_service=""
    if command -v systemctl &>/dev/null; then
        for svc in postgresql postgresql-16 postgresql-15 postgresql-14; do
            if systemctl is-active --quiet "$svc" 2>/dev/null; then
                pg_service="$svc"
                break
            fi
        done
        
        if [ -n "$pg_service" ]; then
            log_success "PostgreSQL service está ativo ($pg_service)"
        else
            log_warn "PostgreSQL service não encontrado ativo"
            log_info "Tentando iniciar: sudo systemctl start postgresql"
        fi
    fi
    
    # Tentar conexão TCP (localhost = 127.0.0.1)
    if timeout 5 bash -c "</dev/tcp/127.0.0.1/$PG_PORT" 2>/dev/null; then
        log_success "PostgreSQL acessível em $PG_HOST:$PG_PORT"
        return 0
    else
        log_error "Não foi possível conectar ao PostgreSQL em $PG_HOST:$PG_PORT"
        log_info "Verifique se o PostgreSQL está rodando:"
        log_info "  sudo systemctl status postgresql"
        log_info "  sudo netstat -tlnp | grep 5432"
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
        local old_pid
        old_pid=$(cat "$PID_FILE")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            log_warn "Mastra Studio já está rodando (PID: $old_pid)"
            log_info "Acesse: http://localhost:4111"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    # Verificar se há processo na porta 4111
    local existing_pid
    existing_pid=$(lsof -ti:4111 2>/dev/null || ss -tlnp 2>/dev/null | grep ':4111' | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2 || true)
    if [ -n "$existing_pid" ]; then
        log_warn "Porta 4111 ocupada (PID: $existing_pid). Encerrando..."
        kill -TERM "$existing_pid" 2>/dev/null || true
        sleep 2
        
        if ps -p "$existing_pid" > /dev/null 2>&1; then
            kill -KILL "$existing_pid" 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Limpar log anterior
    > "$LOG_FILE"
    
    # Iniciar Mastra Studio
    cd "$XPERT_DIR"
    nohup pnpm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    log_info "Aguardando inicialização..."
    
    # Aguardar até 60 segundos pelo startup
    local started=false
    for i in {1..60}; do
        if grep -q "ready in\|Local:\|http://localhost:4111" "$LOG_FILE" 2>/dev/null; then
            started=true
            break
        fi
        
        if ! ps -p "$(cat "$PID_FILE")" > /dev/null 2>&1; then
            log_error "Processo morreu durante inicialização"
            break
        fi
        
        sleep 1
    done
    
    sleep 2
    
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4111 2>/dev/null || echo "000")
    
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "302" ]] || [[ "$started" == "true" ]]; then
        log_success "Mastra Studio iniciado com sucesso!"
        log_info "Studio: http://localhost:4111"
        log_info "API:    http://localhost:4111/api"
        log_info "Logs:   tail -f $LOG_FILE"
        echo ""
        log_info "Ambiente: VPS ($VPS_IP)"
        log_info "Use port forwarding no VSCode Remote para acesso externo"
        return 0
    else
        log_error "Falha ao iniciar Mastra Studio (HTTP $http_code)"
        log_info "Verifique os logs: $LOG_FILE"
        echo "--- Últimas 30 linhas do log ---"
        tail -30 "$LOG_FILE" 2>/dev/null || echo "(log vazio)"
        return 1
    fi
}

stop_studio() {
    log_info "Parando Mastra Studio..."
    
    local killed=false
    
    # Parar pelo PID file
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid" 2>/dev/null || true
            
            for i in {1..5}; do
                if ! ps -p "$pid" > /dev/null 2>&1; then
                    log_success "Mastra Studio parado (PID: $pid)"
                    killed=true
                    break
                fi
                sleep 1
            done
            
            if [[ "$killed" == "false" ]] && ps -p "$pid" > /dev/null 2>&1; then
                log_warn "Forçando encerramento (SIGKILL)..."
                kill -KILL "$pid" 2>/dev/null || true
                sleep 1
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Limpar processos na porta 4111
    local pids
    pids=$(lsof -ti:4111 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | while read -r p; do
            kill -TERM "$p" 2>/dev/null || true
        done
        sleep 2
        
        pids=$(lsof -ti:4111 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | while read -r p; do
                kill -KILL "$p" 2>/dev/null || true
            done
        fi
    fi
    
    # Limpar processos pnpm/node órfãos
    local node_pids
    node_pids=$(pgrep -f "mastra dev\|pnpm.*dev" 2>/dev/null || true)
    if [ -n "$node_pids" ]; then
        echo "$node_pids" | while read -r p; do
            kill -TERM "$p" 2>/dev/null || true
        done
        sleep 1
    fi
    
    if [[ "$killed" == "true" ]] || [[ -z "$(lsof -ti:4111 2>/dev/null)" ]]; then
        log_success "Mastra Studio parado com sucesso"
    fi
}

show_logs() {
    if [ -f "$LOG_FILE" ]; then
        log_info "Mostrando logs (Ctrl+C para sair)..."
        tail -f "$LOG_FILE"
    else
        log_error "Arquivo de log não encontrado: $LOG_FILE"
        exit 1
    fi
}

show_status() {
    echo -e "${GREEN}=== Status do Xpert (VPS) ===${NC}"
    echo ""
    echo -e "Ambiente:      ${GREEN}VPS${NC} ($VPS_IP - AlmaLinux 9)"
    echo ""
    
    # Status do PostgreSQL
    echo -n "PostgreSQL:    "
    if timeout 2 bash -c "</dev/tcp/127.0.0.1/$PG_PORT" 2>/dev/null; then
        echo -e "${GREEN}ACESSÍVEL${NC} (localhost:$PG_PORT)"
    else
        echo -e "${RED}INACESSÍVEL${NC} (localhost:$PG_PORT)"
    fi
    
    # Status do Mastra
    echo -n "Mastra Studio: "
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4111 2>/dev/null || echo "000")
    
    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "302" ]]; then
        echo -e "${GREEN}RODANDO${NC} (http://localhost:4111)"
    else
        echo -e "${RED}PARADO${NC}"
    fi
    
    echo ""
    
    # PIDs
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "PID do Studio: ${GREEN}$pid${NC}"
        else
            echo -e "PID do Studio: ${YELLOW}(stale)${NC}"
            rm -f "$PID_FILE"
        fi
    fi
    
    # Porta 4111
    local port_pids
    port_pids=$(lsof -ti:4111 2>/dev/null || true)
    if [ -n "$port_pids" ]; then
        echo -e "Porta 4111:    ${GREEN}Ocupada${NC} (PIDs: $port_pids)"
    else
        echo -e "Porta 4111:    ${YELLOW}Livre${NC}"
    fi
}

# ============================================
# Comandos Principais
# ============================================

cmd_start() {
    echo -e "${GREEN}=== Iniciando Xpert (VPS) ===${NC}"
    echo ""
    
    check_dependencies
    echo ""
    
    if ! check_postgres; then
        log_error "Não foi possível conectar ao PostgreSQL"
        exit 1
    fi
    echo ""
    
    if start_studio; then
        echo ""
        log_success "Xpert está pronto!"
        echo ""
        echo -e "${BLUE}Acesse:${NC} http://localhost:4111"
        echo -e "${YELLOW}Nota:${NC}  Use port forwarding no VSCode Remote"
        echo -e "${BLUE}Logs:${NC}   ./scripts/mastra-studio.sh logs"
        echo -e "${BLUE}Parar:${NC}  ./scripts/mastra-studio.sh stop"
    else
        exit 1
    fi
}

cmd_stop() {
    echo -e "${YELLOW}=== Parando Xpert (VPS) ===${NC}"
    echo ""
    
    stop_studio
    echo ""
    
    log_success "Xpert parado"
}

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
        echo "  start   - Inicia Mastra Studio"
        echo "  stop    - Para Mastra Studio"
        echo "  restart - Reinicia o Studio"
        echo "  status  - Mostra status de todos os serviços"
        echo "  logs    - Acompanha logs em tempo real"
        echo ""
        echo "Ambiente: VPS $VPS_IP (AlmaLinux 9)"
        exit 1
        ;;
esac
