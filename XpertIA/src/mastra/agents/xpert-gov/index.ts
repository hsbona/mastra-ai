import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { researchAgent } from '../shared/research';
import { docProcessorAgent } from '../shared/doc-processor';
import { xpertGovAnalystAgent } from './analyst';
import { xpertGovWriterAgent } from './writer';

/**
 * Xpert-Gov Coordinator Agent
 * 
 * Agente coordenador com arquitetura Chain of Thought (CoT) que gerencia
 * solicitações do usuário e delega para subagentes especializados.
 * 
 * Arquitetura: Supervisor + Subagentes Especializados
 * - maxSteps: 15 (permite múltiplas iterações de raciocínio)
 * - 4 subagentes especializados registrados
 */
export const xpertGovCoordinator = new Agent({
  id: 'xpert-gov-coordinator',
  name: 'Xpert-Gov Coordinator',
  
  description: 'Coordenador principal do sistema Xpert-Gov. ' +
    'Analisa solicitações do usuário e delega para especialistas em: ' +
    'pesquisa web, processamento de documentos, análise de dados governamentais, ' +
    'e redação de documentos oficiais.',
  
  instructions: `
Você é o coordenador principal do Xpert-Gov, um sistema de assistência governamental.

═══════════════════════════════════════════════════════════════════
SUA MISSÃO: Orquestrar tarefas governamentais delegando para especialistas
═══════════════════════════════════════════════════════════════════

PROCESSO DE RACIOCÍNIO (Chain of Thought):
1. COMPREENDER → Analise a solicitação do usuário
2. PLANIFICAR → Identifique quais especialistas são necessários
3. DELEGAR → Encaminhe para o(s) subagente(s) adequado(s)
4. SUPERVISIONAR → Acompanhe o progresso das tarefas
5. REVISAR → Verifique qualidade dos resultados
6. CONSOLIDAR → Entregue resposta final integrada

═══════════════════════════════════════════════════════════════════
SUBAGENTES DISPONÍVEIS
═══════════════════════════════════════════════════════════════════

1. **research** (Research Agent)
   - Use para: Pesquisa web, busca de informações atualizadas, sumarização
   - Entrada: Tópicos de pesquisa, URLs para análise
   - Saída: Resumos estruturados com fontes citadas
   - Exemplos: "Pesquise sobre nova legislação", "Resuma este artigo"

2. **doc-processor** (Document Processor Agent)
   - Use para: Ler PDFs, DOCX, Excel; criar documentos; extrair dados
   - Entrada: Arquivos para processamento, dados para exportar
   - Saída: Conteúdo extraído ou arquivos gerados
   - Exemplos: "Extraia dados deste PDF", "Crie planilha com estes dados"

3. **xpert-gov-analyst** (Xpert-Gov Analyst)
   - Use para: Análise de dados governamentais, estatísticas, projeções
   - Entrada: Planilhas de despesas, dados orçamentários, relatórios
   - Saída: Análises descritivas, diagnósticas, preditivas
   - Exemplos: "Analise execução orçamentária", "Projeção de gastos"

4. **xpert-gov-writer** (Xpert-Gov Writer)
   - Use para: Redação de ofícios, memorandos, relatórios oficiais
   - Entrada: Conteúdo/informações para documento
   - Saída: Documentos Word formatados conforme normas gov
   - Exemplos: "Redija ofício para...", "Crie memorando sobre..."

═══════════════════════════════════════════════════════════════════
ESTRATÉGIA DE DELEGAÇÃO
═══════════════════════════════════════════════════════════════════

SEQUÊNCIAS TÍPICAS:

A. Pesquisa + Redação:
   1. Delegue para "research" (coletar informações)
   2. Delegue para "xpert-gov-writer" (produzir documento)

B. Análise de Dados + Relatório:
   1. Delegue para "doc-processor" (extrair dados)
   2. Delegue para "xpert-gov-analyst" (analisar)
   3. Delegue para "xpert-gov-writer" (redigir relatório)

C. Processamento de Documento:
   1. Delegue para "doc-processor" (ler arquivo)
   2. Com base no conteúdo, delegue para analista ou writer

CRITÉRIOS DE DECISÃO:
- Precisa de informações externas? → research
- Precisa ler/criar arquivos? → doc-processor  
- Precisa analisar dados governamentais? → xpert-gov-analyst
- Precisa de documento oficial? → xpert-gov-writer

⚠️ REGRA CRÍTICA - SEM FALLBACK AUTOMÁTICO:
QUANDO um agente retornar ERRO, NUNCA mude automaticamente para outro agente sem:
1. INFORMAR o usuário sobre o erro específico
2. PERGUNTAR se deseja tentar outra abordagem
3. Obter CONFIMAÇÃO explícita antes de usar research como fallback

EXEMPLOS DE ERRO (informe ao usuário, não faça fallback sozinho):
❌ "Não consegui ler o arquivo PDF em workspace/uploads/..." → NÃO pesquise na web
❌ "Arquivo não encontrado em workspace/uploads/..." → NÃO pesquise na web
❌ "Erro ao processar documento..." → NÃO pesquise na web

✅ Após informar o erro, pergunte: "O arquivo existe no caminho correto? Deseja que eu pesquise informações sobre o tema na internet como alternativa?"

═══════════════════════════════════════════════════════════════════
REGRAS DE OURO
═══════════════════════════════════════════════════════════════════

✓ SEMPRE delegue tarefas específicas para especialistas
✓ SEMPRE passe contexto completo ao delegar
✓ SEMPRE verifique se a resposta atende à solicitação original
✓ NUNCA tente executar tarefas especializadas diretamente
✓ NUNCA delegue tarefas triviais (cumprimentos, FAQs) - responda direto

COMUNICAÇÃO COM SUBAGENTES:
- Forneça instruções claras e específicas
- Inclua todo contexto necessário
- Especifique formato esperado do output
- Solicite esclarecimentos se necessário

═══════════════════════════════════════════════════════════════════
EXEMPLOS DE INTERAÇÃO
═══════════════════════════════════════════════════════════════════

Usuário: "Preciso de um ofício solicitando informações sobre obras"
→ Ação: Delegar para xpert-gov-writer com contexto completo

Usuário: "Analise esta planilha de despesas e identifique anomalias"
→ Ação: Delegar para doc-processor (ler) → xpert-gov-analyst (analisar)

Usuário: "Pesquise sobre a nova Lei de Licitações e resuma"
→ Ação: Delegar para research

Usuário: "Oi, tudo bem?"
→ Ação: Responder diretamente (não delegar)
`,

  model: 'groq/llama-3.3-70b-versatile',

  // Sem tools diretas - apenas delega para subagentes
  tools: {},

  // ==========================================
  // SUBAGENTES REGISTRADOS
  // ==========================================
  agents: {
    research: researchAgent,
    'doc-processor': docProcessorAgent,
    'xpert-gov-analyst': xpertGovAnalystAgent,
    'xpert-gov-writer': xpertGovWriterAgent,
  },

  // ==========================================
  // MEMÓRIA PARA CONTEXTO PERSISTENTE
  // ==========================================
  memory: new Memory({
    storage: new PostgresStore({
      id: 'coordinator-memory',
      connectionString: process.env.DATABASE_URL || 'postgresql://mastra:mastra_secret@localhost:5432/xpertia',
      schemaName: 'mastra',
    }),
  }),

  // ==========================================
  // CONFIGURAÇÃO CoT (Chain of Thought)
  // ==========================================
  defaultOptions: {
    // Permite múltiplas iterações de delegação
    maxSteps: 15,

    // Hook executado a cada iteração
    onIterationComplete: async (context) => {
      console.log(`\n[CoT] Step ${context.iteration}/${context.maxSteps} complete`);
      console.log(`      Finish reason: ${context.finishReason}`);
      
      // Alerta se estiver próximo do limite
      if (context.iteration > 12) {
        console.warn(`[CoT] Warning: Approaching maxSteps limit (${context.iteration}/${context.maxSteps})`);
      }
      
      return { continue: true };
    },

    // Configuração de delegação para subagentes
    delegation: {
      // Executado ANTES de delegar
      onDelegationStart: async (context) => {
        console.log(`[Delegation] → ${context.primitiveId}`);

        // Personaliza prompt baseado no agente destino
        const customPrompts: Record<string, string> = {
          'research': '\n\n[Coordenação] Foque em fontes oficiais (.gov.br) e cite todas as referências.',
          'doc-processor': '\n\n[Coordenação] Use workspace/ para leitura/escrita. Confirme paths dos arquivos.',
          'xpert-gov-analyst': '\n\n[Coordenação] Aplique LGPD - nunca exponha dados pessoais. Destaque insights acionáveis.',
          'xpert-gov-writer': '\n\n[Coordenação] Siga rigorosamente as normas de redação oficial do governo federal.',
        };

        const customPrompt = customPrompts[context.primitiveId] || '';

        return {
          proceed: true,
          modifiedPrompt: `${context.prompt}${customPrompt}`,
        };
      },

      // Executado APÓS delegação completar
      onDelegationComplete: async (context) => {
        console.log(`[Delegation] ✓ ${context.primitiveId} completed`);

        if (context.error) {
          console.error(`[Delegation] ✗ ${context.primitiveId} failed:`, context.error);
          
          // Verificar se é erro relacionado a arquivos (não deve fazer fallback automático)
          const errorStr = String(context.error).toLowerCase();
          const isFileError = errorStr.includes('arquivo não encontrado') || 
                              errorStr.includes('não foi possível ler') ||
                              errorStr.includes('pdf inválido') ||
                              errorStr.includes('pdf protegido') ||
                              errorStr.includes('sem permissão') ||
                              errorStr.includes('arquivo vazio') ||
                              errorStr.includes('caminho inválido');
          
          if (isFileError && context.primitiveId === 'doc-processor') {
            return {
              feedback: `❌ ERRO DE LEITURA DE ARQUIVO: ${context.error}\n\n` +
                `⚠️ IMPORTANTE: NÃO procure informações na internet como substituto. ` +
                `O usuário solicitou especificamente a leitura de um arquivo local. ` +
                `Informe o erro acima ao usuário e pergunte se deseja:\n` +
                `1. Verificar o caminho do arquivo\n` +
                `2. Tentar novamente\n` +
                `3. Usar pesquisa web como alternativa (COM CONFIRMAÇÃO)`,
            };
          }
          
          return {
            feedback: `O agente ${context.primitiveId} encontrou um erro: ${context.error}. ` +
              'Por favor, tente uma abordagem alternativa ou solicite ajuda ao usuário.',
          };
        }

        // Feedback de sucesso
        return {
          feedback: `Tarefa concluída pelo ${context.primitiveId}. ` +
            'Analise o resultado e prossiga conforme necessário.',
        };
      },

      // Filtra mensagens para controlar tamanho do contexto
      messageFilter: ({ messages }) => {
        // Mantém últimas 15 mensagens para balancear contexto vs tokens
        return messages.slice(-15);
      },
    },
  },
});
