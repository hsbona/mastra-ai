# Infraestrutura Docker - XpertIA

Esta pasta contém a configuração Docker para a infraestrutura de suporte do projeto XpertIA.

## Serviços

### PostgreSQL com pgvector

Banco de dados principal para:
- **Storage do Mastra**: Persistência de dados, traces, observability
- **Memory**: Armazenamento de histórico de conversas
- **Vector Store**: Embeddings e busca semântica (RAG) via extensão pgvector

## Requisitos

- Docker 20.10+
- Docker Compose 2.0+

## Uso

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 2. Iniciar os serviços

```bash
docker-compose up -d
```

### 3. Verificar status

```bash
docker-compose ps
```

### 4. Logs

```bash
docker-compose logs -f postgres
```

### 5. Parar os serviços

```bash
docker-compose down
```

### 6. Reset completo (⚠️ apaga todos os dados)

```bash
docker-compose down -v
```

## Conexão

### Aplicação (Mastra)

```bash
# Variável de ambiente no .env do projeto raiz
DATABASE_URL=postgresql://mastra:mastra_secret@localhost:5432/xpertia
```

### Cliente PostgreSQL (psql)

```bash
docker exec -it xpertia-postgres psql -U mastra -d xpertia
```

### Ferramentas GUI

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `xpertia`
- **User**: `mastra`
- **Password**: (conforme definido no .env)

## Extensões Habilitadas

- `pgvector`: Vetores e busca semântica
- `uuid-ossp`: Geração de UUIDs

## Troubleshooting

### Problema: Porta 5432 já em uso

**Solução**: Altere a porta no `.env`:
```bash
POSTGRES_PORT=5433
```

### Problema: Erro de permissão no volume

**Solução**: Remova o volume e recrie:
```bash
docker-compose down -v
docker-compose up -d
```

### Problema: Conexão recusada

**Solução**: Aguarde o healthcheck completar (verifique com `docker-compose ps`)
