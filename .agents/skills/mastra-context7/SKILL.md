---
name: mastra-context7
description: Consulta a documentação oficial e atualizada do Mastra framework via Context7 (Upstash). Use esta skill para obter informações precisas sobre APIs, exemplos de código e melhores práticas diretamente da documentação oficial.
---

# Mastra Context7 Documentation

Consulte a documentação oficial e atualizada do Mastra framework usando o Context7.

## Propósito

Esta skill fornece acesso à documentação completa do Mastra através do Context7, garantindo que você sempre obtenha informações atualizadas sobre:

- APIs e métodos do framework
- Exemplos de código funcionais
- Melhores práticas
- Padrões de uso recomendados

## Versão do Projeto

O projeto XpertIA utiliza:
- `@mastra/core`: ^1.11.0
- `mastra` (CLI): ^1.3.8
- `@mastra/memory`: ^1.6.2
- `@mastra/evals`: ^1.1.2
- `@mastra/libsql`: ^1.7.0

## Como usar esta skill

Quando o usuário fizer perguntas sobre Mastra:

1. **SEMPRE** use o Context7 para buscar informações atualizadas
2. Use a biblioteca `/mastra-ai/mastra` para consultas gerais
3. Use `/mastra-ai/skills` para informações sobre skills oficiais
4. Forneça exemplos de código TypeScript completos
5. Adapte as respostas à versão 1.11.0 do projeto quando relevante

## Bibliotecas Disponíveis no Context7

| Biblioteca | ID | Uso recomendado |
|------------|-----|-----------------|
| Mastra Core | `/mastra-ai/mastra` | APIs gerais, agents, workflows, tools |
| Mastra Skills | `/mastra-ai/skills` | Skills oficiais do Mastra |
| Mastra (llms.txt) | `/llmstxt/mastra_ai_llms_txt` | Visão geral e conceitos |
| Mastra AI Agents | `/llmstxt/mastra_ai_llms-full_txt` | Agents e capacidades de voz |

## Padrões de Consulta

### Para perguntas sobre Agents:
```
Consultar: /mastra-ai/mastra
Query: "How to create and configure an Agent in Mastra with tools and memory"
```

### Para perguntas sobre Workflows:
```
Consultar: /mastra-ai/mastra
Query: "Workflow creation, steps configuration, and orchestration patterns"
```

### Para perguntas sobre Tools:
```
Consultar: /mastra-ai/mastra
Query: "How to create custom tools for agents with parameter validation"
```

### Para perguntas sobre Memory:
```
Consultar: /mastra-ai/mastra
Query: "Memory configuration, message history, and semantic recall setup"
```

### Para perguntas sobre RAG:
```
Consultar: /mastra-ai/mastra
Query: "RAG implementation, vector stores, and knowledge base integration"
```

## Estrutura de Resposta

Ao responder perguntas sobre Mastra:

1. **Síntese direta**: Responda à pergunta de forma clara e objetiva
2. **Exemplo de código**: Forneça um exemplo completo e funcional em TypeScript
3. **Referências**: Mencione as seções relevantes da documentação consultada
4. **Notas de versão**: Indique se há diferenças importantes entre versões

## Exemplo de Uso

**Usuário:** "Como eu crio um agent no Mastra?"

**Ação:**
1. Resolver biblioteca: `/mastra-ai/mastra`
2. Query: "How to create an Agent with Mastra framework including configuration, tools, and model setup"
3. Retornar exemplo completo baseado na documentação oficial

## Importante

- ⚠️ NUNCA use conhecimento interno desatualizado
- ✅ SEMPRE consulte o Context7 para garantir informações atualizadas
- 📝 APIs do Mastra mudam frequentemente - a documentação oficial é a fonte da verdade
