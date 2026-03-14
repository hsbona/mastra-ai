# 🔧 Configuração do PostgreSQL - XpertIA (AMPLIADA)

## Resumo Executivo

O PostgreSQL na VPS foi configurado com recursos **AMPLIADOS** para máximo desempenho do projeto XpertIA.

Com **24GB RAM disponíveis**, mantemos uma configuração **AMPLIADA** que permite:
- Cache máximo para queries de RAG/embeddings
- Múltiplas conexões simultâneas (agents, workers)
- Espaço generoso para crescimento do banco de dados
- Performance otimizada para operações vetoriais (pgvector)

---

## 📊 Configuração Atual (AMPLIADA)

### Uso Real Medido (2026-03-13)

| Métrica | Valor |
|---------|-------|
| Tamanho do banco | 100 MB |
| Conexões ativas | 6 |
| RAM usada | 270 MB |
| RAM alocada | 6 GB (atual - será ajustado para 8GB) |
| **Utilização** | **4.39%** |

### Configuração AMPLIADA

| Parâmetro | Configuração | Propósito |
|-----------|--------------|-----------|
| **Container Memory** | **8 GB** | Cache máximo + margem |
| **Container CPUs** | **3 cores** | Queries paralelas, indexação pesada |
| `shared_buffers` | **2 GB** | Cache de tabelas e índices |
| `effective_cache_size` | **6 GB** | Estimativa para query planner |
| `work_mem` | **64 MB** | Operações em memória (sort, hash, agregações) |
| `maintenance_work_mem` | **512 MB** | VACUUM, CREATE INDEX, REINDEX rápidos |
| `max_connections` | **200** | Muitos agents + conexões simultâneas |
| `wal_buffers` | **64 MB** | Write-ahead logging otimizado |
| `max_wal_size` | **8 GB** | Checkpoints menos frequentes |
| `min_wal_size` | **2 GB** | WAL reutilizável |
| `effective_io_concurrency` | **300** | SSD de alta performance |
| `effective_parallel_workers` | **6** | Queries paralelas |

---

## 🎯 Justificativa da Configuração AMPLIADA

### Por que 8GB para PostgreSQL?

1. **RAG e Embeddings**: Operações com vetores (pgvector) são intensivas em memória
2. **Múltiplos Agents**: Cada agente pode manter conexões persistentes simultâneas
3. **Workflows Complexos**: Processamento batch de documentos requer memória
4. **Cache Agressivo**: 2GB shared_buffers para queries repetitivas instantâneas
5. **Margem de Segurança**: Ainda sobram ~8GB na VPS para Mastra + SO

### Quando escalar?

| Sinal | Ação |
|-------|------|
| Banco atinge 100GB+ | Aumentar shared_buffers para 4GB |
| Conexões frequentemente >150 | Aumentar max_connections para 300 |
| RAM usage do container >90% | Aumentar limite do container para 12GB |
| Queries lentas observadas | Revisar índices e work_mem |

---

## 📝 Docker Compose (Configuração AMPLIADA)

```yaml
# ============================================================
# XpertIA - PostgreSQL Configuração AMPLIADA
# ============================================================

version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: xpertia-postgres
    hostname: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-xpertia}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-xpertia_dev}
      POSTGRES_DB: ${POSTGRES_DB:-xpertia}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=pt_BR.UTF-8"
      
      # Tuning PostgreSQL AMPLIADO
      POSTGRES_SHARED_BUFFERS: "2GB"
      POSTGRES_EFFECTIVE_CACHE_SIZE: "6GB"
      POSTGRES_WORK_MEM: "64MB"
      POSTGRES_MAINTENANCE_WORK_MEM: "512MB"
      POSTGRES_MAX_CONNECTIONS: "200"
      
      # WAL tuning
      POSTGRES_WAL_BUFFERS: "64MB"
      POSTGRES_MIN_WAL_SIZE: "2GB"
      POSTGRES_MAX_WAL_SIZE: "8GB"
      POSTGRES_CHECKPOINT_COMPLETION_TARGET: "0.9"
      
      # Query planner
      POSTGRES_RANDOM_PAGE_COST: "1.1"
      POSTGRES_EFFECTIVE_IO_CONCURRENCY: "300"
      
      # Performance
      POSTGRES_DEFAULT_STATISTICS_TARGET: "200"
      POSTGRES_EFFECTIVE_PARALLEL_WORKERS: "6"
      
    ports:
      - "0.0.0.0:5432:5432"
      
    volumes:
      - type: volume
        source: postgres_data
        target: /var/lib/postgresql/data
      - type: bind
        source: ./postgreSQL
        target: /docker-entrypoint-initdb.d
        read_only: true
        
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-xpertia} -d ${POSTGRES_DB:-xpertia}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
      
    networks:
      - xpertia-backend
      
    deploy:
      resources:
        limits:
          # AMPLIADO: 8GB RAM, 3 cores
          cpus: '3.0'
          memory: 8G
        reservations:
          cpus: '0.5'
          memory: 1G
          
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

volumes:
  postgres_data:
    driver: local

networks:
  xpertia-backend:
    driver: bridge
```

---

## 📈 Monitoramento

Monitore regularmente estes indicadores:

```bash
# Uso de RAM do container
docker stats --no-stream xpertia-postgres

# Conexões ativas
docker exec xpertia-postgres psql -U xpertia -c "
SELECT count(*) as conexoes,
       count(*) FILTER (WHERE state = 'active') as ativas,
       count(*) FILTER (WHERE state = 'idle') as ociosas
FROM pg_stat_activity;
"

# Cache hit ratio (ideal: >99%)
docker exec xpertia-postgres psql -U xpertia -c "
SELECT 
  'cache hit ratio' as metric,
  round(blks_hit*100.0/(blks_hit+blks_read), 2) as value
FROM pg_stat_database 
WHERE datname = 'xpertia';
"

# Tamanho do banco e tabelas maiores
docker exec xpertia-postgres psql -U xpertia -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# Configurações atuais
docker exec xpertia-postgres psql -U xpertia -c "
SELECT name, setting, unit 
FROM pg_settings 
WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem', 'max_connections')
ORDER BY name;
"
```

---

## ⚠️ Aplicação da Configuração

### Procedimento de Atualização

```bash
# 1. Backup do banco
docker exec xpertia-postgres pg_dump -U xpertia xpertia > /opt/xpertia/backups/backup_pre_upgrade.sql

# 2. Parar containers
cd /opt/xpertia/docker && docker compose down

# 3. Atualizar docker-compose.yml (com conteúdo acima)

# 4. Iniciar com nova configuração
docker compose up -d postgres

# 5. Verificar
docker stats --no-stream xpertia-postgres
docker exec xpertia-postgres psql -U xpertia -c 'SELECT version();'
```

---

*Documento atualizado em: 2026-03-13*  
*Configuração: Recursos AMPLIADOS (8GB RAM)*
