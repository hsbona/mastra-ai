# Context7 MCP Configuration

Configuração do servidor MCP para acesso à documentação Mastra via Context7.

## Sobre o Context7

O Context7 fornece acesso à documentação atualizada de bibliotecas populares via MCP (Model Context Protocol). Para o projeto XpertIA, usamos principalmente:

- `/mastra-ai/mastra` - Documentação completa do Mastra Framework
- `/mastra-ai/skills` - Skills oficiais do Mastra

## Configuração

### Opção 1: Servidor HTTP (Remoto)

**Sem API Key (limitado):**
```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

**Com API Key (recomendado):**
```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "sua-chave-aqui"
      }
    }
  }
}
```

Obtenha sua API key em: https://context7.com/dashboard

### Opção 2: Servidor Local (STDIO)

O arquivo `context7.json` nesta pasta contém a configuração STDIO:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "transport": "stdio"
    }
  }
}
```

## Uso

### Para VSCode + Kimi Code

O Kimi Code lê configuração MCP de diferentes fontes. Para habilitar o Context7:

1. **Via configuração global do Kimi:**
   Adicione ao seu `~/.kimi/config.toml`:
   ```toml
   [mcp.servers.context7]
   command = "npx"
   args = ["-y", "@upstash/context7-mcp@latest"]
   ```

2. **Via variável de ambiente:**
   ```bash
   export KIMI_MCP_SERVERS='{"context7":{"command":"npx","args":["-y","@upstash/context7-mcp@latest"]}}'
   ```

### Testando a Conexão

```bash
# Testar se o MCP server está acessível
npx -y @upstash/context7-mcp@latest --help

# Ou testar via HTTP
curl -s https://mcp.context7.com/mcp/health
```

## Uso na Skill Mastra

Quando o Context7 MCP está disponível, a skill `/mastra` usa automaticamente as ferramentas:

- `resolve-library-id` - Resolve nome da biblioteca para ID
- `get-library-docs` - Obtém documentação específica

Exemplo de consulta:
```
Library: /mastra-ai/mastra
Query: "How to create an Agent with tools and memory"
```

## Troubleshooting

### "context7 command not found"
```bash
# Verifique se npx está instalado
which npx

# Instale o pacote globalmente se necessário
npm install -g @upstash/context7-mcp
```

### "MCP server not responding"
```bash
# Teste o servidor manualmente
npx @upstash/context7-mcp@latest

# Verifique conectividade
ping mcp.context7.com
```

### Fallback Automático

Se o Context7 MCP não estiver disponível, a skill `/mastra` faz fallback automaticamente para:
1. Embedded docs (`node_modules/@mastra/*/dist/docs/`)
2. Remote docs (`https://mastra.ai/llms.txt`)

## Referências

- [Context7 MCP npm](https://www.npmjs.com/package/@upstash/context7-mcp)
- [Context7 Dashboard](https://context7.com/dashboard)
- [Mastra Documentation](https://mastra.ai/llms.txt)
