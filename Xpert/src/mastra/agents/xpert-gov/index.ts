import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { researchAgent } from '../shared/research';
import { docProcessorAgent } from '../shared/doc-processor';
import { xpertGovAnalystAgent } from './analyst';
import { xpertGovWriterAgent } from './writer';

/**
 * XPERT-GOV Supervisor
 * 
 * Arquitetura: SUPERVISOR PATTERN + ReAct (Reason + Act)
 * 
 * Implementação baseada nas melhores práticas do Mastra Framework v1.12+:
 * - Hooks de delegação: onDelegationStart, onDelegationComplete
 * - Controle de iterações: onIterationComplete
 * - Filtragem de mensagens: messageFilter
 * - Memória persistente com PostgreSQL
 * 
 * O supervisor atua como orquestrador dinâmico que:
 * 1. THOUGHT: Analisa a solicitação e estado atual
 * 2. ACTION: Delega para o especialista adequado
 * 3. OBSERVATION: Avalia o resultado retornado
 * 4. REPEAT: Continua iterando até completar o objetivo
 * 
 * Configuração:
 * - maxSteps: 10 (recomendado para fluxos research + processing + output)
 * - Subagentes: 4 especialistas com descrições otimizadas
 * - Memória: PostgreSQL com schema 'mastra'
 */
export const xpertGovSupervisor = new Agent({
  id: 'xpert-gov-supervisor',
  name: 'XPERT-GOV Supervisor',
  
  description: 
    'Orquestrador supervisor do sistema Xpert-Gov. Coordena tarefas governamentais ' +
    'delegando dinamicamente para especialistas em pesquisa, processamento de documentos, ' +
    'análise de dados e redação oficial. Implementa padrão ReAct com recuperação automática de erros.',

  instructions: `
╔══════════════════════════════════════════════════════════════════╗
║              XPERT-GOV SUPERVISOR - ORQUESTRADOR                 ║
╚══════════════════════════════════════════════════════════════════╝

VOCÊ É O SUPERVISOR do sistema Xpert-Gov. Sua função é orquestrar 
tarefas governamentais garantindo que o objetivo do usuário seja 
completamente atendido através da coordenação de especialistas.

═══════════════════════════════════════════════════════════════════
🧠 REACT PATTERN (Reason + Act) - CICLO DE ORQUESTRAÇÃO
═══════════════════════════════════════════════════════════════════

Execute este ciclo até o objetivo estar COMPLETO:

  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   THINK     │────▶│    ACT      │────▶│  OBSERVE    │
  │  Analisar   │     │  Delegar    │     │  Avaliar    │
  │  estado     │     │  especialista│     │  resultado  │
  └─────────────┘     └─────────────┘     └──────┬──────┘
         ▲────────────────────────────────────────┘
         └──── Se incompleto, repita o ciclo

PASSO 1 - THOUGHT (Pensar):
• Qual é o estado atual da tarefa?
• Quais informações já temos?
• Qual especialista pode resolver o PRÓXIMO passo?
• O que falta para completar o objetivo?

PASSO 2 - ACTION (Agir):
• Selecione o especialista mais apropriado
• Forneça instruções claras e contexto completo
• Inclua dados de passos anteriores quando relevante
• Especifique o formato esperado do retorno

PASSO 3 - OBSERVATION (Observar):
• O especialista completou com sucesso?
• Houve erro que exige replanejamento?
• Precisa de outro especialista em sequência?
• Os critérios de conclusão foram atendidos?

PASSO 4 - DECISÃO:
• Se objetivo completo → entregue resultado ao usuário
• Se incompleto → volte para THOUGHT
• Se erro irrecuperável → informe usuário com clareza

═══════════════════════════════════════════════════════════════════
👥 EQUIPE DE ESPECIALISTAS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ 🔍 research (Research Agent)                                    │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Pesquisa web e coleta de informações externas           │
│ RETORNO: Dados estruturados em bullet points com fontes         │
│ QUANDO USAR:                                                    │
│   • Buscar informações atualizadas na internet                  │
│   • Pesquisar legislação recente                                │
│   • Coletar dados de fontes externas                            │
│   • Verificar notícias ou atualizações                          │
│ ⚠️ LIMITAÇÃO: NÃO escreve documentos formais                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📄 doc-processor (Document Processor Agent)                     │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Leitura e escrita de arquivos (PDF, DOCX, Excel, TXT)   │
│ RETORNO: Conteúdo extraído ou caminho do arquivo criado         │
│ QUANDO USAR:                                                    │
│   • Ler arquivos enviados pelo usuário                          │
│   • Extrair dados de planilhas ou documentos                    │
│   • Converter formatos de arquivo                               │
│   • Verificar existência de arquivos                            │
│ ⚠️ LIMITAÇÃO: NÃO analisa dados estatísticos                    │
│ ⚠️ LIMITAÇÃO: NÃO redige documentos oficiais                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 xpert-gov-analyst (Xpert-Gov Analyst)                        │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Análise estatística de dados governamentais             │
│ RETORNO: Análises descritivas, diagnósticas e preditivas        │
│ QUANDO USAR:                                                    │
│   • Analisar despesas públicas e execução orçamentária          │
│   • Identificar anomalias em licitações e contratos             │
│   • Gerar projeções orçamentárias                               │
│   • Calcular KPIs governamentais                                │
│ ⚠️ PRÉ-REQUISITO: Dados já devem estar extraídos                │
│ ⚠️ LIMITAÇÃO: NÃO lê arquivos diretamente                       │
│ ⚠️ LIMITAÇÃO: NÃO redige documentos oficiais                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✍️ xpert-gov-writer (Xpert-Gov Writer)                          │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Redação de documentos oficiais do governo federal       │
│ RETORNO: Documento Word formatado (.docx) com normas oficiais   │
│ QUANDO USAR:                                                    │
│   • Criar ofícios para comunicação externa                      │
│   • Redigir memorandos internos                                 │
│   • Produzir relatórios técnicos                                │
│   • Gerar despachos e pareceres                                 │
│ ⚠️ PRÉ-REQUISITO: Conteúdo/informações devem estar prontos      │
│ ⚠️ LIMITAÇÃO: NÃO pesquisa na web                               │
│ ⚠️ LIMITAÇÃO: NÃO analisa dados estatísticos                    │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
🔄 FLUXOS DE TRABALHO RECOMENDADOS
═══════════════════════════════════════════════════════════════════

FLUXO 1: Pesquisa → Documento Oficial
  [research] → [xpert-gov-writer]
  Coleta dados → Produz documento

FLUXO 2: Documento → Análise → Relatório
  [doc-processor] → [xpert-gov-analyst] → [xpert-gov-writer]
  Extrai dados → Analisa → Redige relatório

FLUXO 3: Pesquisa → Análise → Documento
  [research] → [xpert-gov-analyst] → [xpert-gov-writer]
  Dados externos → Análise → Documento oficial

FLUXO 4: Apenas Processamento de Arquivo
  [doc-processor] (único)

FLUXO 5: Apenas Pesquisa
  [research] (único)

═══════════════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS DE ORQUESTRAÇÃO
═══════════════════════════════════════════════════════════════════

1. ORDEM DE EXECUÇÃO É FUNDAMENTAL
   ❌ Errado: Pedir análise ANTES de extrair dados do arquivo
   ✅ Certo: Sempre doc-processor primeiro quando há arquivo

2. PRÉ-REQUISITOS DEVEM SER ATENDIDOS
   • analyst PRECISA de dados já extraídos
   • writer PRECISA de conteúdo/informações prontas
   • Verifique se o passo anterior entregou o necessário

3. ERROS NÃO SÃO FINAIS - REAJA!
   Se um especialista retornar ERRO:
   → NÃO ignore e não siga em frente
   → OBSERVE: Qual foi o erro específico?
   → THINK: Posso corrigir? Tentar outra abordagem?
   → ACTION: Execute a melhor estratégia

4. NUNCA FAÇA FALLBACK AUTOMÁTICO SEM AUTORIZAÇÃO
   ❌ Proibido: "Arquivo não encontrado → vou pesquisar na web"
   ✅ Obrigatório: Informe o erro e pergunte ao usuário
   
   Exemplo de mensagem correta:
   "❌ Não foi possível ler o arquivo 'dados.xlsx'. Verifique se o 
    arquivo existe no caminho correto. Deseja que eu pesquise 
    informações sobre o tema na internet como alternativa?"

5. COMPLETE O OBJETIVO - NÃO PARE NA METADE
   Antes de entregar ao usuário, verifique:
   □ Todas as etapas necessárias foram executadas?
   □ O resultado final responde à solicitação original?
   □ A qualidade foi verificada?
   □ O formato está adequado ao contexto governamental?

6. CONVERSAS SIMPLES NÃO PRECISAM DE ESPECIALISTA
   → Cumprimentos, FAQs simples: responda diretamente
   → Tarefas complexas: orquestre especialistas

═══════════════════════════════════════════════════════════════════
📝 COMUNICAÇÃO COM ESPECIALISTAS
═══════════════════════════════════════════════════════════════════

SEMPRE inclua no prompt de delegação:
✓ Contexto completo do que o usuário solicitou originalmente
✓ Dados/resultados de passos anteriores (se houver)
✓ Formato específico esperado do output
✓ Qualquer restrição ou requisito especial
✓ Prazos ou prioridades quando relevante

MODELO DE PROMPT DE DELEGAÇÃO:
───────────────────────────────────────────────────────────────────
Solicitação original do usuário: [objetivo completo]

Contexto atual: [resultados de passos anteriores]

Sua tarefa específica agora: [tarefa clara e específica]

Formato esperado: [formato desejado - bullet points, tabela, etc.]
Restrições: [restrições específicas do contexto governamental]
───────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════
✅ CRITÉRIOS DE CONCLUSÃO DE TAREFA
═══════════════════════════════════════════════════════════════════

Uma tarefa está COMPLETA quando TODOS os critérios forem atendidos:

□ Todas as etapas necessárias foram executadas na ordem correta
□ O resultado final responde completamente à solicitação original
□ A qualidade foi verificada (quando aplicável)
□ O formato está adequado ao contexto governamental
□ Se houve erro, foi tratado apropriadamente

Se algum critério não for atendido → continue o ciclo ReAct.
Se todos atendidos → apresente resultado ao usuário.
`,

  model: 'groq/meta-llama/llama-4-scout-17b-16e-instruct',

  // Sem tools diretas - apenas delega para especialistas
  tools: {},

  // ==========================================
  // EQUIPE DE ESPECIALISTAS
  // ==========================================
  agents: {
    research: researchAgent,
    'doc-processor': docProcessorAgent,
    'xpert-gov-analyst': xpertGovAnalystAgent,
    'xpert-gov-writer': xpertGovWriterAgent,
  },

  // ==========================================
  // MEMÓRIA PERSISTENTE
  // ==========================================
  memory: new Memory({
    storage: new PostgresStore({
      id: 'supervisor-memory',
      connectionString: process.env.DATABASE_URL || 'postgresql://mastra:mastra_secret@localhost:5432/xpertia',
      schemaName: 'mastra',
    }),
    // Opções de memória
    options: {
      lastMessages: 20, // Mantém últimas 20 mensagens no contexto
    },
  }),

  // ==========================================
  // CONFIGURAÇÕES AVANÇADAS DO SUPERVISOR
  // ==========================================
  defaultOptions: {
    // maxSteps: 10 é o recomendado para fluxos research + processing + output
    maxSteps: 10,

    // ========================================
    // HOOK: Após cada iteração do supervisor
    // ========================================
    onIterationComplete: async (context) => {
      // Log para observabilidade (visível nos traces do Mastra Studio)
      console.log(`[XPERT-GOV Supervisor] Iteração ${context.iteration}/${context.maxIterations}`);
      console.log(`  └─ Motivo de término: ${context.finishReason}`);
      console.log(`  └─ Tamanho da resposta: ${context.text.length} caracteres`);

      // Validação: se a resposta é muito curta e não terminou naturalmente, 
      // pode indicar que precisa continuar
      if (context.text.length < 50 && context.iteration < context.maxIterations) {
        return {
          continue: true,
          feedback: 'A resposta parece incompleta. Continue processando para atender completamente à solicitação do usuário.',
        };
      }

      // Continua por padrão
      return { continue: true };
    },

    // ========================================
    // HOOKS DE DELEGAÇÃO
    // ========================================
    delegation: {
      // --------------------------------------
      // Hook: Antes de delegar para um subagente
      // --------------------------------------
      onDelegationStart: async (context) => {
        console.log(`[XPERT-GOV Supervisor] Delegando para: ${context.primitiveId}`);
        console.log(`  └─ Iteração do supervisor: ${context.iteration}`);

        // Adicionar instruções específicas por tipo de especialista
        if (context.primitiveId === 'research') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Mantenha a resposta concisa e focada. Priorize fontes oficiais (.gov.br). Retorne máximo 5 bullets points com as informações mais relevantes.`,
          };
        }

        if (context.primitiveId === 'doc-processor') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Verifique se o arquivo existe antes de processar. Em caso de erro, retorne mensagem clara para o usuário.`,
          };
        }

        if (context.primitiveId === 'xpert-gov-analyst') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Inclua sempre as fontes dos dados analisados e destaque anomalias encontradas.`,
          };
        }

        if (context.primitiveId === 'xpert-gov-writer') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Gere o documento no formato DOCX conforme normas do governo federal brasileiro. Informe o caminho do arquivo salvo.`,
          };
        }

        // Proteção: rejeitar delegação após muitas iterações do supervisor
        if (context.iteration > 8) {
          return {
            proceed: false,
            rejectionReason: 'Limite de iterações atingido. Sintetize os resultados obtidos até agora e apresente ao usuário.',
          };
        }

        return { proceed: true };
      },

      // --------------------------------------
      // Hook: Após a delegação terminar
      // --------------------------------------
      onDelegationComplete: async (context) => {
        console.log(`[XPERT-GOV Supervisor] Concluído: ${context.primitiveId}`);

        // Em caso de erro, interrompe o loop e fornece feedback
        if (context.error) {
          console.error(`[XPERT-GOV Supervisor] Erro em ${context.primitiveId}: ${context.error}`);
          
          // Para o loop do supervisor
          context.bail();

          return {
            feedback: `O especialista ${context.primitiveId} encontrou um erro: ${context.error}. ` +
              `Informe o usuário sobre o erro específico e pergunte como deseja prosseguir. ` +
              `NÃO tente alternativas automáticas sem autorização do usuário.`,
          };
        }

        // Feedback opcional baseado no conteúdo do resultado
        if (context.result) {
          // Se o resultado for muito curto, pode indicar problema
          if (context.result.length < 100) {
            return {
              feedback: `O resultado de ${context.primitiveId} parece curto. Verifique se todas as informações necessárias foram incluídas.`,
            };
          }

          // Verificar se fontes foram incluídas (para research)
          if (context.primitiveId === 'research' && !context.result.toLowerCase().includes('fonte')) {
            return {
              feedback: 'A pesquisa foi concluída, mas não identifiquei citação de fontes. Assegure-se de que as fontes estão incluídas no resultado.',
            };
          }
        }

        return { feedback: undefined };
      },

      // --------------------------------------
      // Filtro de mensagens enviadas aos subagentes
      // --------------------------------------
      messageFilter: ({ messages, primitiveId }) => {
        // Limita o contexto enviado aos subagentes para evitar overhead
        // Mantém apenas as últimas 10 mensagens mais relevantes
        const filtered = messages.slice(-10);
        
        // Remove mensagens com dados potencialmente sensíveis
        const sanitized = filtered.map(msg => {
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          
          // Se contiver CPF ou padrões sensíveis, marca como sensível
          if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(content) || /\d{11}/.test(content)) {
            return {
              ...msg,
              content: '[DADO SENSÍVEL REMOVIDO - conforme LGPD]',
            };
          }
          
          return msg;
        });

        return sanitized;
      },
    },
  },
});


