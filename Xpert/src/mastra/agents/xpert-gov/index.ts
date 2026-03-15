import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { researchAgent } from '../shared/research';
import { docReaderAgent } from '../shared/doc-reader';
import { docWriterAgent } from '../shared/doc-writer';
import { docTransformerAgent } from '../shared/doc-transformer';
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

VOCÊ É O SUPERVISOR do sistema Xpert-Gov. Sua função é atender 
as solicitações dos usuários de forma completa e natural.

═══════════════════════════════════════════════════════════════════
🎯 REGRA FUNDAMENTAL: RESPONDA DIRETAMENTE PERGUNTAS SIMPLES
═══════════════════════════════════════════════════════════════════

Você é um assistente de IA completo. NÃO delegue tudo - use seu 
próprio conhecimento para responder perguntas simples diretamente.

✅ RESPONDA DIRETAMENTE (sem delegar) quando:
   • Cumprimentos: "Olá", "Bom dia", "Oi"
   • Testes de conexão: "teste", "ping", "está aí?"
   • Perguntas simples: "qual seu nome?", "o que você faz?"
   • FAQs gerais: "como funciona?", "quem são seus especialistas?"
   • Despedidas: "tchau", "obrigado", "até logo"
   • Perguntas de contexto sobre você mesmo ou o sistema

❌ DELEGUAR para especialistas APENAS quando:
   • Pesquisa na web for necessária → research
   • Leitura de arquivos → doc-reader
   • Criação de documentos → doc-writer
   • Transformação de conteúdo → doc-transformer
   • Análise estatística de dados → xpert-gov-analyst
   • Redação de documentos oficiais → xpert-gov-writer
   • Tarefa complexa que requer múltiplas etapas especializadas

💡 DICA: Se você pode responder com seu próprio conhecimento, 
   FAÇA ISSO. Não force a delegação desnecessária.

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
│ 📖 doc-reader (Document Reader Agent)                           │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: EXTRAÇÃO DE CONTEÚDO de arquivos (PDF, DOCX, Excel, TXT)│
│ RETORNO: Conteúdo extraído em formato texto estruturado         │
│ QUANDO USAR:                                                    │
│   • Ler arquivos enviados pelo usuário                          │
│   • Extrair dados de planilhas ou documentos                    │
│   • Verificar existência de arquivos                            │
│ ⚠️ LIMITAÇÃO: NÃO cria novos arquivos                           │
│ ⚠️ LIMITAÇÃO: NÃO analisa dados estatísticos                    │
│ ⚠️ LIMITAÇÃO: NÃO redige documentos oficiais                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✍️ doc-writer (Document Writer Agent)                           │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: CRIAÇÃO DE DOCUMENTOS (DOCX, Excel, TXT)                │
│ RETORNO: Caminho do arquivo criado com confirmação              │
│ QUANDO USAR:                                                    │
│   • Criar documentos Word (.docx)                               │
│   • Gerar planilhas Excel (.xlsx)                               │
│   • Salvar arquivos de texto (.txt)                             │
│   • Exportar dados para formatos específicos                    │
│ ⚠️ LIMITAÇÃO: NÃO lê arquivos existentes                        │
│ ⚠️ LIMITAÇÃO: NÃO analisa dados estatísticos                    │
│ ⚠️ LIMITAÇÃO: NÃO redige documentos oficiais do governo         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔄 doc-transformer (Document Transformer Agent)                 │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: TRANSFORMAÇÃO de conteúdo (resumir, traduzir, chunking) │
│ RETORNO: Conteúdo transformado conforme solicitado              │
│ QUANDO USAR:                                                    │
│   • Resumir documentos extensos                                 │
│   • Traduzir conteúdo entre idiomas                             │
│   • Dividir texto em chunks menores                             │
│   • Reformatar ou reestruturar conteúdo                         │
│ ⚠️ LIMITAÇÃO: NÃO lê arquivos diretamente (precisa do conteúdo) │
│ ⚠️ LIMITAÇÃO: NÃO cria arquivos físicos                         │
│ ⚠️ LIMITAÇÃO: NÃO analisa dados estatísticos                    │
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
  [doc-reader] → [xpert-gov-analyst] → [xpert-gov-writer]
  Extrai dados → Analisa → Redige relatório

FLUXO 2a: Documento → Transformação → Análise
  [doc-reader] → [doc-transformer] → [xpert-gov-analyst]
  Lê arquivo → Resume/transf. → Analisa dados

FLUXO 3: Pesquisa → Análise → Documento
  [research] → [xpert-gov-analyst] → [xpert-gov-writer]
  Dados externos → Análise → Documento oficial

FLUXO 4: Apenas Leitura de Arquivo
  [doc-reader] (único)

FLUXO 4a: Criação de Documento
  [doc-writer] (único)

FLUXO 4b: Transformação de Conteúdo
  [doc-reader] → [doc-transformer] (sequência)

FLUXO 5: Apenas Pesquisa
  [research] (único)

═══════════════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS DE ORQUESTRAÇÃO
═══════════════════════════════════════════════════════════════════

1. ORDEM DE EXECUÇÃO É FUNDAMENTAL
   ❌ Errado: Pedir análise ANTES de extrair dados do arquivo
   ✅ Certo: Sempre doc-reader primeiro quando há arquivo para ler
   ✅ Certo: doc-writer quando precisa CRIAR um arquivo novo
   ✅ Certo: doc-transformer quando precisa TRANSFORMAR conteúdo já extraído

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
   → Cumprimentos, FAQs simples, testes de conexão: responda diretamente
   → Tarefas complexas: orquestre especialistas
   → NUNCA diga "não existe tarefa específica" - responda normalmente

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
    'doc-reader': docReaderAgent,
    'doc-writer': docWriterAgent,
    'doc-transformer': docTransformerAgent,
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
    // maxSteps definido na chamada para evitar problemas de tipo

    // ========================================
    // HOOK: Após cada iteração do supervisor
    // ========================================
    onIterationComplete: async (context) => {
      const maxIterations = context.maxIterations ?? 10;
      
      // Log para observabilidade (visível nos traces do Mastra Studio)
      console.log(`[XPERT-GOV Supervisor] Iteração ${context.iteration}/${maxIterations}`);
      console.log(`  └─ Motivo de término: ${context.finishReason}`);
      console.log(`  └─ Tamanho da resposta: ${context.text.length} caracteres`);

      // Se houve erro, pare o loop
      if (context.finishReason === 'error') {
        console.error('[XPERT-GOV Supervisor] ❌ Erro detectado. Interrompendo loop.');
        return {
          continue: false,
          feedback: 'Ocorreu um erro durante o processamento. Por favor, verifique a configuração dos agentes e tente novamente.',
        };
      }

      // Se atingiu o limite de iterações, pare
      if (context.iteration >= maxIterations) {
        console.log('[XPERT-GOV Supervisor] ⚠️ Limite de iterações atingido.');
        return { continue: false };
      }

      // Se tem resposta válida (com texto), pare
      if (context.text.length > 0) {
        return { continue: false };
      }

      // Se a resposta é muito curta e não terminou naturalmente, continue
      if (context.text.length < 50) {
        return {
          continue: true,
          feedback: 'A resposta parece incompleta. Continue processando para atender completamente à solicitação do usuário.',
        };
      }

      // Por padrão, pare para evitar loop infinito
      return { continue: false };
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

        if (context.primitiveId === 'doc-reader') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Verifique se o arquivo existe antes de processar. Extraia TODO o conteúdo relevante. Em caso de erro, retorne mensagem clara para o usuário.`,
          };
        }

        if (context.primitiveId === 'doc-writer') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Crie o arquivo no formato especificado (DOCX, XLSX ou TXT). Confirme o caminho completo do arquivo salvo. Verifique se o conteúdo está completo antes de salvar.`,
          };
        }

        if (context.primitiveId === 'doc-transformer') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\n⚠️ IMPORTANTE: Aplique a transformação solicitada (resumo, tradução, chunking, etc.) mantendo a fidelidade do conteúdo original. Especifique claramente o que foi transformado.`,
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
          // Garantir que result seja tratado como string
          const resultStr = typeof context.result === 'string' ? context.result : JSON.stringify(context.result);
          
          // Se o resultado for muito curto, pode indicar problema
          if (resultStr.length < 100) {
            return {
              feedback: `O resultado de ${context.primitiveId} parece curto. Verifique se todas as informações necessárias foram incluídas.`,
            };
          }

          // Verificar se fontes foram incluídas (para research)
          if (context.primitiveId === 'research' && !resultStr.toLowerCase().includes('fonte')) {
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
      messageFilter: ({ messages }) => {
        // Limita o contexto enviado aos subagentes para evitar overhead
        // Mantém apenas as últimas 10 mensagens mais relevantes
        return messages.slice(-10);
      },
    },
  },
});


