# Chain of Thought (CoT) e Agentes Coordenadores no Mastra

> **Versão do Documento:** 1.0  
> **Data:** 2026-03-11  
> **Versões do Mastra referenciadas:** @mastra/core ^1.11.0, mastra ^1.3.8  
> **Fonte:** Documentação oficial do Mastra via Context7

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Chain of Thought (CoT) no Mastra](#chain-of-thought-cot-no-mastra)
3. [Padrão Supervisor Agent](#padrão-supervisor-agent)
4. [Implementação Completa](#implementação-completa)
5. [Alternativa: Roteamento Dinâmico](#alternativa-roteamento-dinâmico-de-modelos)
6. [Recomendações por Cenário](#recomendações-por-cenário)
7. [Referências](#referências)

---

## Visão Geral

Este documento apresenta as estratégias oficiais do Mastra framework para implementar agentes com **Chain of Thought (CoT)** e gerenciar tarefas de diferentes complexidades dentro do mesmo chat.

### O Problema

Em aplicações de chat com IA, é comum receber tanto:
- **Tarefas simples**: Saudações, FAQs, perguntas diretas
- **Tarefas complexas**: Análises, pesquisas, planejamento multi-step

Usar um único agente poderoso para tudo é:
- ❌ Caro (modelos avançados custam mais)
- ❌ Lento (desnecessário para tarefas simples)
- ❌ Ineficiente (sem especialização)

### A Solução Recomendada

O Mastra recomenda o padrão **Supervisor Agent com Subagentes Especializados**, onde um coordenador analisa a solicitação e delega para o agente mais adequado.

---

## Chain of Thought (CoT) no Mastra

O Mastra oferece duas abordagens principais para implementar raciocínio em passos:

### Opção A: Reasoning Effort (Modelos Avançados)

Para modelos que suportam reasoning explícito (ex: OpenAI o1/o3):

```typescript
const stream = await reasoningAgent.stream(messages, {
  providerOptions: {
    openai: { reasoningEffort: 'high' }, // 'low' | 'medium' | 'high'
  },
})
```

**Características:**
- O modelo expõe seu processo de pensamento antes de responder
- Ideal para problemas complexos que requerem análise profunda
- Requer modelos específicos com suporte a reasoning

### Opção B: maxSteps para Raciocínio Multi-step

Configure ciclos de pensamento → ação → observação:

```typescript
const response = await agent.generate('Analise as causas da inflação', {
  maxSteps: 10, // Permite até 10 iterações de raciocínio
})
```

**Características:**
- Funciona com qualquer modelo
- O agente pode chamar tools e refinar respostas
- Controle granular de iterações

---

## Padrão Supervisor Agent

### Por Que Usar um Coordenador com Subagentes?

| Benefício | Descrição |
|-----------|-----------|
| **Especialização** | Cada subagente tem função clara e instruções específicas |
| **Escalabilidade** | Adicione novos especialistas sem mudar o coordenador |
| **Controle** | O supervisor decide qual agente usar baseado na complexidade |
| **Custo** | Use modelos mais baratos para tarefas simples |
| **Manutenibilidade** | Lógica separada em agentes menores e testáveis |

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO (Chat)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              COORDINATOR AGENT (Supervisor)                 │
│  - Analisa a solicitação                                    │
│  - Decide qual subagente usar                               │
│  - Gerencia contexto entre delegações                       │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
     ┌─────▼──────┐              ┌────────▼────────┐
     │  Simple    │              │    Complex      │
     │   Agent    │              │     Agent       │
     └────────────┘              └─────────────────┘
           │                               │
     ┌─────▼──────┐              ┌────────▼────────┐
     │  Research  │              │  (outros        │
     │   Agent    │              │  especialistas) │
     └────────────┘              └─────────────────┘
```

---

## Implementação Completa

### 1. Subagentes Especializados

```typescript
import { Agent } from '@mastra/core/agent'

/**
 * Agente para TAREFAS SIMPLES
 * - Respostas diretas, FAQs, saudações
 * - Modelo rápido e econômico
 */
const simpleAgent = new Agent({
  id: 'simple-agent',
  name: 'Simple Assistant',
  description: 'Handles simple, direct questions with quick answers. ' +
    'Use for FAQs, greetings, and straightforward requests.',
  instructions: `You are a quick-response assistant.
    
Your responsibilities:
- Answer simple questions directly and concisely
- Handle greetings, farewells, and small talk
- Provide straightforward information without research
- Keep responses brief (1-2 sentences when possible)

If the request requires research, multi-step reasoning, or complex analysis, 
delegate back to the supervisor.`,
  model: 'openai/gpt-4o-mini', // Modelo rápido e barato
})

/**
 * Agente para TAREFAS COMPLEXAS
 * - Análise, pesquisa, raciocínio multi-step
 * - Chain of Thought explícito
 */
const complexAgent = new Agent({
  id: 'complex-agent',
  name: 'Complex Reasoner',
  description: 'Handles complex tasks requiring deep thinking, research, ' +
    'and multi-step reasoning. Uses Chain of Thought approach.',
  instructions: `You are an advanced reasoning assistant that solves complex 
problems step by step.

When given a task:
1. BREAK DOWN the problem into smaller parts
2. THINK through each step carefully (show your reasoning)
3. RESEARCH if needed (use available tools)
4. SYNTHESIZE information into a comprehensive answer
5. VERIFY your conclusions before responding

Always explain your thought process clearly.`,
  model: 'openai/gpt-4o', // Modelo mais poderoso
})

/**
 * Agente para PESQUISA
 * - Coleta de informações factuais
 * - Retorna dados estruturados
 */
const researchAgent = new Agent({
  id: 'research-agent',
  name: 'Research Specialist',
  description: 'Gathers factual information and returns well-structured ' +
    'research with sources. Returns bullet points for easy reading.',
  instructions: `You are a research specialist focused on gathering accurate information.

Guidelines:
- Always cite your sources
- Structure findings with clear headings
- Include statistics and recent data when available
- Return bullet points for easy reading by other agents`,
  model: 'openai/gpt-4o-mini',
})
```

### 2. Agente Coordenador (Supervisor)

```typescript
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'

export const coordinatorAgent = new Agent({
  id: 'coordinator-agent',
  name: 'Task Coordinator',
  
  instructions: `You are the main coordinator that manages all user requests.

## Available Agents:

1. **simple-agent**: 
   - Use for: Greetings, FAQs, simple questions, small talk
   - Output: Direct, concise answers
   
2. **complex-agent**:
   - Use for: Multi-step problems, analysis, reasoning tasks, planning
   - Output: Detailed explanations with step-by-step thinking
   
3. **research-agent**:
   - Use for: Gathering facts, current information, data collection
   - Output: Structured research with bullet points

## Delegation Strategy:

**IF** the user asks something simple (greeting, FAQ, direct question):
  → Delegate to simple-agent

**IF** the user asks something complex (analysis, planning, problem-solving):
  → Delegate to complex-agent with reasoning enabled

**IF** the user asks for research or facts:
  → Delegate to research-agent first, then complex-agent to synthesize

**IF** unsure about complexity:
  → Start with simple-agent; if insufficient, escalate to complex-agent

## Success Criteria:
- Route to the most appropriate specialist
- Ensure complete and accurate responses
- Maintain conversation context across delegations
- Minimize unnecessary model calls for simple tasks`,
  
  model: 'openai/gpt-4o',
  
  // Registra os subagentes disponíveis
  agents: {
    simpleAgent,
    complexAgent,
    researchAgent,
  },
  
  // Configuração de memória para contexto persistente
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'coordinator-storage',
      url: 'file:mastra.db',
    }),
  }),
  
  // ==========================================
  // CONFIGURAÇÃO AVANÇADA
  // ==========================================
  defaultOptions: {
    // Permite múltiplas delegações (CoT)
    maxSteps: 15,
    
    // Hook executado a cada iteração
    onIterationComplete: async (context) => {
      console.log(`\n✓ Iteration ${context.iteration} complete`)
      console.log(`  Finish reason: ${context.finishReason}`)
      console.log(`  Response length: ${context.text.length} chars\n`)
      return { continue: true }
    },
    
    // Configuração de delegação
    delegation: {
      // Executado ANTES de delegar para um subagente
      onDelegationStart: async (context) => {
        console.log(`→ Delegating to: ${context.primitiveId}`)
        
        // Personaliza prompt baseado no agente
        if (context.primitiveId === 'complex-agent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n` +
              `Think step by step and explain your reasoning clearly.`,
          }
        }
        
        if (context.primitiveId === 'research-agent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n` +
              `Focus on recent developments and include statistics.`,
          }
        }
        
        return { proceed: true }
      },
      
      // Executado APÓS delegação completar
      onDelegationComplete: async (context) => {
        console.log(`✓ Completed: ${context.primitiveId}`)
        
        if (context.error) {
          console.error('Delegation failed:', context.error)
          return {
            feedback: `The ${context.primitiveId} encountered an error: ` +
              `${context.error}. Please try a different approach.`,
          }
        }
      },
      
      // Filtra mensagens enviadas para subagentes
      messageFilter: ({ messages }) => {
        // Mantém apenas as últimas 10 mensagens
        return messages.slice(-10)
      },
    },
  },
})
```

### 3. Uso no Chat

```typescript
/**
 * Processa mensagens do usuário no chat
 */
async function handleChat(userMessage: string) {
  const stream = await coordinatorAgent.stream(userMessage, {
    maxSteps: 15,
  })

  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk)
  }
}

// ==========================================
// EXEMPLOS DE USO
// ==========================================

// Exemplo 1: Tarefa simples → simple-agent
await handleChat("Olá! Como você está?")
// Output: "Olá! Estou bem, obrigado por perguntar. Como posso ajudar você hoje?"

// Exemplo 2: Tarefa complexa → complex-agent
await handleChat("Analise as causas principais da inflação atual e proponha soluções")
// Output: Análise detalhada com raciocínio passo a passo

// Exemplo 3: Pesquisa → research-agent → complex-agent
await handleChat("Pesquise sobre avanços em IA em 2024 e resuma os principais")
// Output: Pesquisa estruturada seguida de síntese
```

---

## Alternativa: Roteamento Dinâmico de Modelos

Para casos onde a especialização em subagentes é excessiva, o Mastra suporta **seleção dinâmica de modelos**:

```typescript
const dynamicAgent = new Agent({
  id: 'dynamic-agent',
  name: 'Dynamic Router',
  
  // Função que seleciona modelo baseado no contexto
  model: ({ requestContext }) => {
    const message = requestContext.message?.toLowerCase() || ''
    
    // Critérios para tarefa complexa
    const isComplex = 
      message.length > 100 ||
      message.includes('analise') ||
      message.includes('explique detalhadamente') ||
      message.includes('compare') ||
      message.includes('pros e contras')
    
    return isComplex
      ? 'openai/gpt-4o'      // Complexo: modelo avançado
      : 'openai/gpt-4o-mini' // Simples: modelo rápido
  },
  
  instructions: `You handle both simple and complex tasks efficiently...`,
})
```

**Quando usar:**
- ✅ Quando a lógica de especialização não é crítica
- ✅ Quando o foco principal é otimização de custo
- ✅ Para protótipos rápidos

**Limitações:**
- ❌ Sem especialização real de comportamento
- ❌ Um único prompt para todos os casos
- ❌ Menos controle sobre o processo

---

## Recomendações por Cenário

| Cenário | Abordagem Recomendada | Modelo(s) |
|---------|----------------------|-----------|
| **Chat com tarefas mistas** (simples + complexas) | ✅ **Supervisor + Subagentes** | Coordenador: GPT-4o<br>Simples: GPT-4o-mini<br>Complexo: GPT-4o |
| **Apenas otimização de custo** | Roteamento dinâmico de modelos | Condicional: GPT-4o-mini/GPT-4o |
| **Processos bem definidos** | Workflows em vez de agentes | - |
| **Raciocínio profundo necessário** | Reasoning effort + maxSteps alto | OpenAI o1/o3 |
| **Muitos domínios especializados** | Supervisor + Múltiplos subagentes | Por domínio |

### Checklist de Implementação

- [ ] Defina subagentes com `description` clara (o supervisor usa para decidir)
- [ ] Configure `maxSteps` suficiente no supervisor (10-15 para tarefas complexas)
- [ ] Use `memory` para manter contexto entre delegações
- [ ] Implemente `onDelegationStart` para customizar prompts por agente
- [ ] Use `messageFilter` para controlar o tamanho do contexto enviado
- [ ] Teste com exemplos de diferentes complexidades
- [ ] Monitore custos por tipo de tarefa

---

## Referências

### Documentação Oficial

- [Supervisor Agents - Mastra Docs](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/docs/agents/supervisor-agents.mdx)
- [Research Coordinator Guide](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/guides/guide/research-coordinator.mdx)
- [Network to Supervisor Migration](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/guides/migrations/network-to-supervisor.mdx)
- [Agents Overview](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/docs/agents/overview.mdx)

### Conceitos Relacionados

- **Agent Network (Deprecated):** Padrão anterior, substituído por Supervisor Agent
- **Processor API:** Para customização dinâmica por step (`processInputStep`)
- **Memory:** Gerenciamento de contexto e histórico de conversas
- **Tools:** Extensão de capacidades dos agentes

---

## Notas de Versão

### Histórico de Alterações

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 2026-03-11 | Documento inicial com base na documentação Mastra 1.11.0 |

### Compatibilidade

- ✅ `@mastra/core` ^1.11.0
- ✅ `mastra` (CLI) ^1.3.8
- ✅ `@mastra/memory` ^1.6.2
- ✅ `@mastra/libsql` ^1.7.0

---

*Documento gerado com base na documentação oficial do Mastra framework consultada via Context7.*
