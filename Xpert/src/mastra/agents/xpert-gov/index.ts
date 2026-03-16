import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { storageConfig, memoryConfig } from '../../config/database';
import {
  listFilesSafe,
  readFileSafe,
  writeFileSafe,
  mkdirSafe,
  fileStatSafe,
} from '../../tools/workspace-safe';
import { webSearchTool, calculateTool } from '../../tools/web-tools';
import { translatePDFTool, createTranslatedPDFTool } from '../../tools/file-tools';
import { docReaderAgent } from '../shared/doc-reader';
import { researchAgent } from '../shared/research';
import { analystAgent } from './analyst';
import { writerAgent } from './writer';

// ============================================
// TOOLS DE DELEGAÇÃO MANUAL (Workaround para schema do Mastra)
// ============================================

const docReaderTool = createTool({
  id: 'delegate_doc_reader',
  name: 'Delegate to Document Reader',
  description: 'Delega para o Document Reader Agent extrair conteúdo de PDFs, DOCX, Excel. Use quando precisar ler documentos.',
  inputSchema: z.object({
    task: z.string().describe('Descrição completa da tarefa para o doc-reader'),
  }),
  outputSchema: z.object({
    result: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ task }) => {
    try {
      const response = await docReaderAgent.generate(task);
      return { result: response.text };
    } catch (error) {
      return { 
        result: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

const researchTool = createTool({
  id: 'delegate_research',
  name: 'Delegate to Research Agent',
  description: 'Delega para o Research Agent fazer pesquisa web e consulta RAG. Use quando precisar de informações atualizadas.',
  inputSchema: z.object({
    task: z.string().describe('Descrição completa da tarefa para o research'),
  }),
  outputSchema: z.object({
    result: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ task }) => {
    try {
      const response = await researchAgent.generate(task);
      return { result: response.text };
    } catch (error) {
      return { 
        result: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

const analystTool = createTool({
  id: 'delegate_analyst',
  name: 'Delegate to Analyst Agent',
  description: 'Delega para o Analyst Agent analisar dados estatisticamente. Use quando precisar de análise de dados.',
  inputSchema: z.object({
    task: z.string().describe('Descrição completa da tarefa para o analyst'),
  }),
  outputSchema: z.object({
    result: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ task }) => {
    try {
      const response = await analystAgent.generate(task);
      return { result: response.text };
    } catch (error) {
      return { 
        result: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

const writerTool = createTool({
  id: 'delegate_writer',
  name: 'Delegate to Writer Agent',
  description: 'Delega para o Writer Agent criar documentos oficiais. Use quando precisar gerar ofícios, memorandos, relatórios.',
  inputSchema: z.object({
    task: z.string().describe('Descrição completa da tarefa para o writer'),
  }),
  outputSchema: z.object({
    result: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ task }) => {
    try {
      const response = await writerAgent.generate(task);
      return { result: response.text };
    } catch (error) {
      return { 
        result: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

/**
 * XPERT-GOV Supervisor
 * 
 * Arquitetura: SMART DELEGATION PATTERN + ReAct (Reason + Act)
 * 
 * O supervisor atua como orquestrador inteligente que:
 * 1. THINK: Analisa a solicitação e estado atual
 * 2. ACT: Decide entre responder direto, usar tool, ou delegar para subagente
 * 3. OBSERVE: Avalia o resultado retornado
 * 4. REPEAT: Continua iterando até completar o objetivo ou esgotar tentativas
 * 
 * Características:
 * - maxSteps: 15 (permite múltiplos ciclos ReAct com retry)
 * - Recuperação automática de erros com múltiplas estratégias
 * - Delegação hierárquica para especialistas
 * - Memória persistente para contexto entre iterações
 */
export const xpertGovSupervisor = new Agent({
  id: 'xpert-gov-supervisor',
  name: 'XPERT-GOV Supervisor',
  
  description: 
    'Orquestrador inteligente do sistema Xpert-Gov. Coordena tarefas governamentais ' +
    'usando raciocínio passo a passo (ReAct). Decide dinamicamente entre: responder diretamente, ' +
    'usar ferramentas rápidas, ou delegar para especialistas. Implementa retry automático ' +
    'e recuperação de erros.',

  instructions: `
╔══════════════════════════════════════════════════════════════════╗
║         XPERT-GOV SUPERVISOR - ORQUESTRADOR REACT                ║
╚══════════════════════════════════════════════════════════════════╝

Você é o orquestrador inteligente do sistema Xpert-Gov.
Sua missão é resolver solicitações usando RACIOCÍNIO PASSO A PASSO.

═══════════════════════════════════════════════════════════════════
🧠 REACT PATTERN (Reason + Act + Observe)
═══════════════════════════════════════════════════════════════════

Para CADA solicitação, execute o ciclo:

  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   THINK     │────▶│    ACT      │────▶│  OBSERVE    │
  │  (Raciocinar)│     │   (Agir)    │     │ (Observar)  │
  └─────────────┘     └─────────────┘     └──────┬──────┘
         ▲────────────────────────────────────────┘
         └──── Se incompleto, repita

PASSO 1 - THINK (Pensar):
• Qual é a natureza da solicitação?
• O que já sei? O que preciso descobrir?
• Qual é a melhor estratégia: direto, tool, ou especialista?
• Se falhou antes, qual abordagem alternativa?

PASSO 2 - ACT (Agir):
Escolha UMA das opções:

  A) RESPONDER DIRETAMENTE
     → Quando for conhecimento geral ou explicação simples
     → Quando não precisar de dados externos
     
  B) USAR TOOL DIRETA (use EXATAMENTE estes nomes)
     → web_search: Busca rápida na web
     → read_file: Ler arquivos de texto simples
     → write_file: Escrever conteúdo em arquivos
     → list_files: Listar diretórios
     → create_directory: Criar pastas
     → file_stat: Informações de arquivos
     → calculate: Cálculos matemáticos
     
     ⚠️ CRÍTICO: Use SEMPRE os nomes com UNDERSCORE (_).
     NUNCA use tools com prefixo "mastra_workspace_".
     
  C) DELEGAR PARA ESPECIALISTA
     → doc-reader: Para extrair conteúdo de PDF/DOCX/Excel
     → research: Para pesquisa aprofundada + RAG
     → analyst: Para análise estatística de dados
     → writer: Para criar documentos oficiais

PASSO 3 - OBSERVE (Observar):
• O resultado atende à necessidade?
• Houve erro? Preciso tentar abordagem diferente?
• Preciso de mais informações ou etapas?

PASSO 4 - DECIDIR:
• Se COMPLETO → Entregue resposta ao usuário
• Se INCOMPLETO → Volte para THINK
• Se ERRO IRRECUPERÁVEL → Informe usuário claramente

═══════════════════════════════════════════════════════════════════
🎯 HIERARQUIA DE DECISÃO
═══════════════════════════════════════════════════════════════════

1. TAREFAS DIRETAS (Responda você mesmo):
   ✅ Perguntas sobre legislação geral (Lei 8112, LAI, LGPD)
   ✅ Explicações de processos administrativos
   ✅ Cumprimentos e orientações simples
   ✅ FAQ governamental

2. TOOLS DIRETAS (Rápidas, sem delegar):
   🔍 web_search: Busca simples na internet
   📄 read_file: Arquivos de texto (.txt, .md, .json)
   📁 list_files: Listar diretório
   📂 create_directory: Criar pastas
   📊 file_stat: Informações de arquivos
   🧮 calculate: Cálculos matemáticos
   
   ⚠️ Use SEMPRE os nomes com UNDERSCORE. Não use "mastra_workspace_*".

3. SUBAGENTES ESPECIALIZADOS (Delegue para):
   📖 doc-reader: PDFs, DOCX, Excel (com chunking)
   🔬 research: Pesquisa profunda + RAG interno
   📊 analyst: Análise estatística, projeções
   ✍️ writer: Ofícios, memorandos, relatórios

═══════════════════════════════════════════════════════════════════
👥 SUBAGENTES DISPONÍVEIS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ 📖 delegate_doc_reader (Document Reader Agent)                  │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Extração de conteúdo de arquivos                        │
│ FORMATOS: PDF, DOCX, Excel, TXT                                 │
│ CHUNKING: Automático para arquivos grandes                      │
│ USE PARA: Ler documentos, extrair texto, obter dados de planilhas│
│ ⚠️ NÃO cria documentos, apenas lê                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔬 delegate_research (Research Agent)                           │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Pesquisa web + base de conhecimento RAG                 │
│ CAPACIDADES: Busca DuckDuckGo + consulta vetorial interna       │
│ USE PARA: Pesquisar legislação, buscar informações atualizadas  │
│ RETORNO: Bullet points com fontes citadas                       │
│ ⚠️ NÃO escreve documentos formais                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 delegate_analyst (Analyst Agent)                             │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Análise estatística de dados governamentais             │
│ CAPACIDADES: Análise descritiva, diagnóstica, preditiva         │
│ USE PARA: Analisar despesas, licitações, KPIs, projeções        │
│ PRÉ-REQUISITO: Dados já extraídos (não lê arquivos direto)      │
│ ⚠️ NÃO lê PDFs diretamente, NÃO cria documentos                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✍️ delegate_writer (Writer Agent)                               │
├─────────────────────────────────────────────────────────────────┤
│ FUNÇÃO: Redação de documentos oficiais do governo federal       │
│ FORMATOS: Ofícios, memorandos, despachos, relatórios técnicos   │
│ USE PARA: Criar documentos formais quando já tiver o conteúdo   │
│ PRÉ-REQUISITO: Informações/documentação pronta                  │
│ ⚠️ NÃO pesquisa, NÃO analisa dados                             │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
🔄 FLUXOS TÍPICOS
═══════════════════════════════════════════════════════════════════

FLUXO 1: Pesquisa → Documento
  THINK: "Usuário quer pesquisa sobre tema X e gerar ofício"
  ACT: usar tool delegate_research
  OBSERVE: Pesquisa concluída
  THINK: "Tenho dados, agora preciso do documento"
  ACT: usar tool delegate_writer
  OBSERVE: Documento gerado
  → COMPLETO

FLUXO 2: Arquivo → Análise → Relatório
  THINK: "Usuário quer análise de planilha"
  ACT: usar tool delegate_doc_reader (extrair dados)
  OBSERVE: Dados extraídos
  THINK: "Tenho os dados, preciso analisar"
  ACT: usar tool delegate_analyst
  OBSERVE: Análise concluída
  THINK: "Preciso gerar relatório final"
  ACT: usar tool delegate_writer
  → COMPLETO

FLUXO 3: Raciocínio Direto
  THINK: "Usuário perguntou sobre Lei 8112/90"
  ACT: responder diretamente (conhecimento interno)
  → COMPLETO

═══════════════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS
═══════════════════════════════════════════════════════════════════

1. ORDEM CORRETA
   ❌ NUNCA peça análise ANTES de extrair dados do arquivo
   ✅ SEMPRE: delegate_doc_reader → delegate_analyst (quando necessário)

2. RECUPERAÇÃO DE ERRO
   Se um especialista falhar:
   → Tente novamente com instruções diferentes
   → Ou tente abordagem alternativa (ex: web search)
   → Ou pergunte ao usuário como prosseguir
   → Após 3 tentativas, pare e informe o erro

3. NUNCA FAÇA FALLBACK AUTOMÁTICO
   ❌ Proibido: "Arquivo não encontrado → vou pesquisar na web"
   ✅ Obrigatório: Informe o erro e pergunte ao usuário

4. MAX STEPS = 15
   Use até 15 iterações para completar tarefas complexas
   Cada delegação conta como 1 step
   Tente abordagens diferentes em caso de erro

5. MEMÓRIA
   Mantenha contexto entre iterações
   Lembre-se do que já foi feito
   Acumule resultados de subagentes

═══════════════════════════════════════════════════════════════════
✅ CRITÉRIOS DE CONCLUSÃO
═══════════════════════════════════════════════════════════════════

Uma tarefa está COMPLETA quando:
□ Todas as etapas necessárias foram executadas
□ O resultado responde completamente à solicitação
□ Qualidade foi verificada
□ Se houve erro, foi tratado apropriadamente

Se incompleto → CONTINUE (volte para THINK)
Se completo → ENTREGUE ao usuário
`,

  model: 'groq/meta-llama/llama-4-scout-17b-16e-instruct',

  // Tools rápidas + delegação para especialistas
  tools: {
    // Tools de filesystem
    list_files: listFilesSafe,
    read_file: readFileSafe,
    write_file: writeFileSafe,
    create_directory: mkdirSafe,
    file_stat: fileStatSafe,
    // Tools utilitárias
    web_search: webSearchTool,
    calculate: calculateTool,
    // Tools de delegação para especialistas
    delegate_doc_reader: docReaderTool,
    delegate_research: researchTool,
    delegate_analyst: analystTool,
    delegate_writer: writerTool,
    // Tools de tradução de PDF
    translate_pdf: translatePDFTool,
    create_translated_pdf: createTranslatedPDFTool,
  },

  // Memória persistente
  memory: new Memory({
    storage: new PostgresStore({
      id: 'supervisor-memory',
      ...storageConfig,
    }),
    options: memoryConfig,
  }),

  // ==========================================
  // CONFIGURAÇÃO REACT
  // ==========================================
  defaultOptions: {
    // maxSteps alto para permitir múltiplas tentativas e recuperação de erro
    maxSteps: 15,

    // Callback após cada step
    onStepFinish: async ({ stepNumber, toolCalls, finishReason, text }) => {
      console.log(`[XPERT-GOV Supervisor] Step ${stepNumber}/15: ${finishReason}`);
      if (toolCalls?.length) {
        console.log(`  Tools: ${toolCalls.map(t => t.toolName).join(', ')}`);
      }
    },
  },
});
