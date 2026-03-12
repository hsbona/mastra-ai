# Xpert-Gov MVP: Plano de Implementação SERPRO

> **Versão:** 1.0  
> **Data:** 2026-03-11  
> **Cliente:** SERPRO  
> **Foco:** Assistente inteligente para gestores e servidores das áreas administrativa, financeira e RH

---

## Visão Geral do MVP

O MVP do Xpert-Gov será um **assistente conversacional inteligente** com arquitetura **Chain of Thought (CoT)**, capaz de:

1. **Compreender** instruções complexas do usuário
2. **Quebrar** em múltiplas tasks
3. **Orquestrar** subagentes especializados e tools
4. **Auto-criticar** e corrigir seu trabalho
5. **Entregar** resultados no chat e/ou em arquivos

### O QUE ESTÁ NO MVP vs FUTURO

| Funcionalidade | MVP (Agora) | Fase 2 (Futuro) |
|----------------|-------------|-----------------|
| **Chat CoT** | ✅ Sim | - |
| **Subagentes** | ✅ 3-4 agentes genéricos | Agentes específicos gov |
| **RAG** | ✅ Após CoT funcionando | Expansão com mais bases |
| **Arquivos** | ✅ PDF, DOCX, XLSX, TXT | + formatos |
| **Resumo** | ✅ Chat, arquivos, URL | - |
| **Pesquisa Web** | ✅ Gratuita (DuckDuckGo/SearX) | APIs pagas se necessário |
| **Integrações Gov** | ❌ Não (SEI, SIAPE, etc) | ✅ Com credenciais |
| **Workflows** | ✅ Simples (1-2 fluxos) | Complexos |

---

## Arquitetura do MVP

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Gestor/Servidor SERPRO)                 │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    XPERT-GOV COORDINATOR (CoT)                          │
│                                                                         │
│  Capacidades:                                                           │
│  • Recebe instrução complexa do usuário                                 │
│  • Analisa e quebra em múltiplas tasks                                  │
│  • Decide: responder direto ou delegar a subagentes                     │
│  • Orquestra execução sequencial ou paralela                            │
│  • Revisa resultados e solicita correções                               │
│  • Consolida entrega final (texto + arquivos)                           │
│                                                                         │
│  Config: maxSteps=15, reasoning explícito                               │
└──────────┬────────────────────┬────────────────────┬─────────────────────┘
           │                    │                    │
    ┌──────▼──────┐     ┌──────▼──────┐     ┌───────▼───────┐
    │  ANALYST    │     │  WRITER     │     │   RESEARCH    │
    │   AGENT     │     │   AGENT     │     │    AGENT      │
│             │     │             │     │               │
│ • Analisar  │     │ • Redigir   │     │ • Pesquisar   │
│   dados     │     │   docs      │     │   na web      │
│ • Calcular  │     │ • Revisar   │     │ • Resumir     │
│ • Comparar  │     │   textos    │     │   conteúdo    │
│ • Validar   │     │ • Formatar  │     │ • Extrair     │
└──────┬──────┘     └──────┬──────┘     │   dados       │
       │                   │            └───────────────┘
       │                   │
       └─────────┬─────────┘
                 │
    ┌─────────────▼─────────────┐
    │      TOOLS LIBRARY        │
    ├───────────────────────────┤
    │  📄 Arquivos              │
    │  🌐 Web Search            │
    │  📊 Análise Dados         │
    │  📝 Processamento Texto   │
    │  💻 Terminal/Sistema      │
    └───────────────────────────┘
```

---

## Subagentes do MVP

### 1. Analyst Agent (`analyst-agent`)

**Responsabilidades:**
- Analisar dados e planilhas (XLSX, CSV)
- Realizar cálculos e estatísticas
- Comparar informações
- Validar consistência de dados
- Gerar insights a partir de dados

```typescript
const analystAgent = new Agent({
  id: 'analyst-agent',
  name: 'Analista de Dados',
  description: 'Especialista em análise de dados, cálculos, estatísticas e validação de informações.',
  instructions: `
    Você é um analista de dados experiente, especializado em processar planilhas, 
    realizar cálculos e extrair insights significativos.
    
    SUAS COMPETÊNCIAS:
    - Ler e interpretar planilhas Excel (XLSX) e CSV
    - Realizar cálculos matemáticos e estatísticos
    - Comparar conjuntos de dados e identificar divergências
    - Validar consistência e integridade de dados
    - Gerar resumos analíticos com gráficos descritivos
    - Identificar padrões, tendências e anomalias
    
    DIRETRIZES:
    - Sempre verifique a qualidade dos dados antes de analisar
    - Apresente resultados de forma clara e estruturada
    - Use tabelas quando apropriado para comparar dados
    - Destaque valores atípicos ou inconsistentes
    - Forneça contexto para números (percentuais, totais, médias)
    
    FORMATO DE RESPOSTA:
    1. Resumo executivo (2-3 linhas)
    2. Metodologia/análise realizada
    3. Resultados principais (com números)
    4. Insights/Recomendações
    5. Dados brutos relevantes (se solicitado)
  `,
  model: 'groq/llama-3.3-70b-versatile',
  tools: {
    readExcelTool,
    readCSVTool,
    calculateTool,
    generateChartTool,  // Gera descrições de gráficos
  }
});
```

### 2. Writer Agent (`writer-agent`)

**Responsabilidades:**
- Redigir documentos oficiais e informais
- Revisar e corrigir textos
- Adaptar tom e estilo
- Formatar conforme normas
- Criar resumos e sínteses

```typescript
const writerAgent = new Agent({
  id: 'writer-agent',
  name: 'Redator e Revisor',
  description: 'Especialista em redação de documentos, revisão textual e formatação.',
  instructions: `
    Você é um redator profissional especializado em documentos corporativos 
    e governamentais, com excelência em revisão e formatação.
    
    SUAS COMPETÊNCIAS:
    - Redigir documentos oficiais (ofícios, memorandos, relatórios)
    - Revisar textos (ortografia, gramática, clareza, coesão)
    - Adaptar tom e estilo ao público-alvo
    - Criar resumos executivos e sínteses
    - Formatar conforme normas específicas
    - Reescrever para melhorar clareza e objetividade
    
    TIPOS DE DOCUMENTOS:
    - Ofício: formal, externo, estrutura padrão
    - Memorando: interno, direto
    - Relatório: estruturado, dados + análise
    - E-mail: adequado ao contexto
    - Minuta: rascunho de norma
    
    DIRETRIZES:
    - Use linguagem clara e objetiva
    - Evite redundâncias e jargões desnecessários
    - Mantenha coesão e coerência entre parágrafos
    - Respeite a hierarquia da informação
    - Sugira melhorias quando identificar problemas
    
    PROCESSO DE REVISÃO:
    1. Identificar erros ortográficos/gramaticais
    2. Verificar clareza e objetividade
    3. Avaliar estrutura e fluxo lógico
    4. Checar conformidade com normas solicitadas
    5. Propor versão melhorada
  `,
  tools: {
    readDocumentTool,
    writeDocumentTool,
    formatDocumentTool,
  }
});
```

### 3. Research Agent (`research-agent`)

**Responsabilidades:**
- Pesquisar na internet
- Resumir conteúdo de URLs
- Extrair informações de documentos
- Compilar dados de múltiplas fontes
- Verificar fatos e dados

```typescript
const researchAgent = new Agent({
  id: 'research-agent',
  name: 'Pesquisador',
  description: 'Especialista em pesquisa na web, sumarização de conteúdo e extração de informações.',
  instructions: `
    Você é um pesquisador especializado em buscar, analisar e sintetizar 
    informações de múltiplas fontes (web, documentos, bases de dados).
    
    SUAS COMPETÊNCIAS:
    - Realizar pesquisas na internet (buscas eficientes)
    - Resumir conteúdo de páginas web e documentos
    - Extrair informações específicas de textos longos
    - Compilar dados de múltiplas fontes em síntese única
    - Verificar fatos e dados (fact-checking básico)
    - Criar resumos executivos de qualidade
    
    FONTES DE PESQUISA:
    - Internet: notícias, artigos, sites oficiais
    - Documentos: PDF, DOCX, XLSX, TXT
    - Conteúdo do próprio chat/histórico
    - URLs fornecidas pelo usuário
    
    DIRETRIZES:
    - Sempre cite suas fontes quando possível
    - Distinga fatos verificados de inferências
    - Indique quando a informação é inconclusiva
    - Priorize fontes oficiais e confiáveis
    - Resuma mantendo os pontos essenciais
    - Destaque contradições entre fontes
    
    FORMATO DE RESPOSTA:
    - Resumo sintético (bullet points)
    - Principais achados numerados
    - Fontes consultadas
    - Recomendações de próximos passos (se aplicável)
  `,
  tools: {
    webSearchTool,
    fetchURLTool,
    readPDFTool,
    readDOCXTool,
    summarizeContentTool,
  }
});
```

### 4. Document Processor Agent (`doc-processor-agent`)

**Responsabilidades:**
- Processar múltiplos formatos de arquivo
- Converter entre formatos
- Extrair texto e metadados
- Organizar arquivos
- Gerar documentos de saída

```typescript
const docProcessorAgent = new Agent({
  id: 'doc-processor-agent',
  name: 'Processador de Documentos',
  description: 'Especialista em manipulação de arquivos PDF, DOCX, XLSX e conversão entre formatos.',
  instructions: `
    Você é um especialista em processamento e manipulação de documentos 
    digitais em diversos formatos.
    
    SUAS COMPETÊNCIAS:
    - Ler e extrair conteúdo de PDFs (texto e tabelas)
    - Processar documentos Word (DOCX)
    - Manipular planilhas Excel (XLSX)
    - Converter entre formatos quando necessário
    - Extrair metadados de arquivos
    - Criar documentos a partir de templates
    
    FORMATOS SUPORTADOS:
    - Entrada: PDF, DOCX, XLSX, CSV, TXT, MD
    - Saída: PDF, DOCX, XLSX, CSV, TXT, MD, JSON
    
    DIRETRIZES:
    - Sempre verifique se o arquivo foi lido corretamente
    - Preserve formatação quando possível
    - Informe limitações de conversão
    - Organize arquivos de saída de forma clara
    - Compacte múltiplos arquivos quando apropriado
  `,
  tools: {
    readPDFTool,
    readDOCXTool,
    readExcelTool,
    writePDFTool,
    writeDOCXTool,
    writeExcelTool,
    compressFilesTool,
  }
});
```

---

## Tools do MVP

### 1. Ferramentas de Arquivo

```typescript
// tools/file-tools.ts

export const readPDFTool = createTool({
  id: 'read-pdf',
  name: 'Ler PDF',
  description: 'Extrai texto e tabelas de arquivos PDF',
  inputSchema: z.object({
    filePath: z.string(),
    pages: z.string().optional(), // "1-5" ou "1,3,5"
    extractTables: z.boolean().default(true),
  }),
  execute: async ({ context }) => {
    // Usa pdf-parse ou similar
    const content = await extractPDFContent(context.filePath, {
      pages: context.pages,
      extractTables: context.extractTables
    });
    return { text: content.text, tables: content.tables, metadata: content.metadata };
  }
});

export const readDOCXTool = createTool({
  id: 'read-docx',
  name: 'Ler Word',
  description: 'Extrai texto e estrutura de documentos DOCX',
  inputSchema: z.object({
    filePath: z.string(),
    includeHeaders: z.boolean().default(true),
    includeFooters: z.boolean().default(false),
  }),
  execute: async ({ context }) => {
    // Usa mammoth ou similar
    const result = await extractDOCXContent(context.filePath);
    return { text: result.text, headings: result.headings, styles: result.styles };
  }
});

export const readExcelTool = createTool({
  id: 'read-excel',
  name: 'Ler Excel',
  description: 'Lê planilhas XLSX/CSV e retorna dados estruturados',
  inputSchema: z.object({
    filePath: z.string(),
    sheet: z.string().optional(),
    range: z.string().optional(), // "A1:F100"
    headerRow: z.number().default(1),
  }),
  execute: async ({ context }) => {
    // Usa xlsx (SheetJS) ou similar
    const data = await readSpreadsheet(context.filePath, {
      sheet: context.sheet,
      range: context.range,
      headerRow: context.headerRow
    });
    return { 
      data: data.rows, 
      headers: data.headers,
      sheetNames: data.sheetNames,
      summary: generateDataSummary(data.rows)
    };
  }
});

export const writeDOCXTool = createTool({
  id: 'write-docx',
  name: 'Criar Word',
  description: 'Gera documento DOCX a partir de conteúdo',
  inputSchema: z.object({
    content: z.string(),
    outputPath: z.string(),
    title: z.string().optional(),
    styles: z.object({}).optional(),
  }),
  execute: async ({ context }) => {
    // Usa docx (npm package)
    const doc = await createDOCX({
      content: context.content,
      title: context.title,
      styles: context.styles
    });
    await saveFile(doc, context.outputPath);
    return { filePath: context.outputPath, size: doc.length };
  }
});

export const writeExcelTool = createTool({
  id: 'write-excel',
  name: 'Criar Excel',
  description: 'Gera planilha XLSX a partir de dados',
  inputSchema: z.object({
    data: z.array(z.record(z.any())),
    outputPath: z.string(),
    sheetName: z.string().default('Dados'),
    includeHeaders: z.boolean().default(true),
  }),
  execute: async ({ context }) => {
    // Usa xlsx para criar
    const workbook = await createExcel({
      data: context.data,
      sheetName: context.sheetName
    });
    await saveFile(workbook, context.outputPath);
    return { filePath: context.outputPath, rows: context.data.length };
  }
});
```

### 2. Ferramentas de Web

```typescript
// tools/web-tools.ts

export const webSearchTool = createTool({
  id: 'web-search',
  name: 'Pesquisar na Web',
  description: 'Realiza buscas na internet usando DuckDuckGo (gratuito)',
  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().default(5),
    source: z.enum(['duckduckgo', 'searx', 'brave']).default('duckduckgo'),
  }),
  execute: async ({ context }) => {
    // DuckDuckGo é gratuito via duckduckgo-search (Python) ou ddg-search (Node)
    // Alternativa: SearX instância própria
    const results = await searchWeb({
      query: context.query,
      maxResults: context.maxResults,
      source: context.source
    });
    return { 
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      }))
    };
  }
});

export const fetchURLTool = createTool({
  id: 'fetch-url',
  name: 'Buscar Conteúdo URL',
  description: 'Extrai conteúdo textual de uma página web',
  inputSchema: z.object({
    url: z.string().url(),
    extractLinks: z.boolean().default(false),
    timeout: z.number().default(30000),
  }),
  execute: async ({ context }) => {
    // Usa fetch + cheerio/jsdom para extrair texto limpo
    // Ou usar @mastra/rag fetcher
    const content = await fetchAndExtract({
      url: context.url,
      extractLinks: context.extractLinks
    });
    return {
      title: content.title,
      text: content.text,
      links: content.links,
      meta: content.meta
    };
  }
});
```

### 3. Ferramentas de Análise

```typescript
// tools/analysis-tools.ts

export const summarizeContentTool = createTool({
  id: 'summarize-content',
  name: 'Resumir Conteúdo',
  description: 'Gera resumo de qualquer conteúdo (texto, arquivo, URL)',
  inputSchema: z.object({
    content: z.string(),
    maxLength: z.number().default(500),
    style: z.enum(['executive', 'detailed', 'bullet']).default('executive'),
    focus: z.string().optional(), // tema específico para focar
  }),
  execute: async ({ context }) => {
    // Usa o próprio LLM para sumarização
    const summary = await generateSummary({
      content: context.content,
      maxLength: context.maxLength,
      style: context.style,
      focus: context.focus
    });
    return { summary, originalLength: context.content.length };
  }
});

export const calculateTool = createTool({
  id: 'calculate',
  name: 'Calcular',
  description: 'Realiza cálculos matemáticos e estatísticos',
  inputSchema: z.object({
    expression: z.string(), // Pode ser expressão ou descrição
    variables: z.record(z.number()).optional(),
  }),
  execute: async ({ context }) => {
    // Usa mathjs ou eval seguro
    const result = await evaluateExpression({
      expression: context.expression,
      variables: context.variables
    });
    return { result, steps: result.steps };
  }
});

export const compareDataTool = createTool({
  id: 'compare-data',
  name: 'Comparar Dados',
  description: 'Compara dois conjuntos de dados e identifica diferenças',
  inputSchema: z.object({
    dataA: z.array(z.record(z.any())),
    dataB: z.array(z.record(z.any())),
    keyField: z.string(),
    fieldsToCompare: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const comparison = await compareDatasets({
      dataA: context.dataA,
      dataB: context.dataB,
      keyField: context.keyField,
      fieldsToCompare: context.fieldsToCompare
    });
    return {
      onlyInA: comparison.onlyInA,
      onlyInB: comparison.onlyInB,
      modified: comparison.modified,
      identical: comparison.identical,
    };
  }
});
```

### 4. Ferramentas de Sistema

```typescript
// tools/system-tools.ts

export const listFilesTool = createTool({
  id: 'list-files',
  name: 'Listar Arquivos',
  description: 'Lista arquivos em um diretório',
  inputSchema: z.object({
    directory: z.string(),
    pattern: z.string().optional(), // glob pattern
    recursive: z.boolean().default(false),
  }),
  execute: async ({ context }) => {
    const files = await listFiles({
      directory: context.directory,
      pattern: context.pattern,
      recursive: context.recursive
    });
    return { files };
  }
});

export const readFileTool = createTool({
  id: 'read-file',
  name: 'Ler Arquivo',
  description: 'Lê conteúdo de arquivos texto',
  inputSchema: z.object({
    filePath: z.string(),
    encoding: z.string().default('utf-8'),
  }),
  execute: async ({ context }) => {
    const content = await readTextFile(context.filePath, context.encoding);
    return { content };
  }
});

export const writeFileTool = createTool({
  id: 'write-file',
  name: 'Salvar Arquivo',
  description: 'Salva conteúdo em arquivo',
  inputSchema: z.object({
    filePath: z.string(),
    content: z.string(),
    encoding: z.string().default('utf-8'),
  }),
  execute: async ({ context }) => {
    await writeTextFile(context.filePath, context.content, context.encoding);
    return { filePath: context.filePath, size: context.content.length };
  }
});

export const compressFilesTool = createTool({
  id: 'compress-files',
  name: 'Compactar Arquivos',
  description: 'Cria arquivo ZIP com múltiplos arquivos',
  inputSchema: z.object({
    files: z.array(z.string()),
    outputPath: z.string(),
  }),
  execute: async ({ context }) => {
    const zipPath = await createZip(context.files, context.outputPath);
    return { zipPath };
  }
});
```

---

## Workflow de Processamento Inteligente

### Workflow Principal: `processamento-inteligente`

```typescript
// workflows/inteligente-workflow.ts

const interpretarSolicitacaoStep = createStep({
  id: 'interpretar-solicitacao',
  execute: async ({ context }) => {
    const input = context.input;
    
    // Analisa a solicitação e define estratégia
    const analise = await coordinatorAgent.generate(`
      Analise a seguinte solicitação e determine:
      1. Tipo de tarefa principal
      2. Sub-tasks necessárias
      3. Agentes especializados necessários
      4. Sequência de execução
      
      Solicitação: ${input.solicitacao}
      Arquivos anexos: ${input.arquivos?.join(', ') || 'nenhum'}
      
      Responda em formato JSON estruturado.
    `);
    
    return JSON.parse(analise.text);
  }
});

const executarTasksStep = createStep({
  id: 'executar-tasks',
  execute: async ({ context }) => {
    const estrategia = context.getStepResult('interpretar-solicitacao');
    const resultados = [];
    
    // Executa cada task na sequência definida
    for (const task of estrategia.tasks) {
      const agente = getAgent(task.agente);
      const resultado = await agente.generate(task.instrucao, {
        context: resultados // Passa resultados anteriores como contexto
      });
      resultados.push({
        task: task.id,
        agente: task.agente,
        resultado: resultado.text
      });
    }
    
    return { resultados };
  }
});

const revisarResultadosStep = createStep({
  id: 'revisar-resultados',
  execute: async ({ context }) => {
    const execucao = context.getStepResult('executar-tasks');
    
    // Revisão crítica do trabalho
    const revisao = await coordinatorAgent.generate(`
      Revise os seguintes resultados e avalie:
      1. Qualidade e completude
      2. Consistência entre partes
      3. Erros ou omissões
      4. Sugestões de melhoria
      
      Resultados: ${JSON.stringify(execucao.resultados)}
      
      Se houver problemas críticos, indique quais tasks precisam ser refeitas.
    `);
    
    return {
      aprovado: !revisao.text.includes('REFAZER'),
      observacoes: revisao.text,
      resultados: execucao.resultados
    };
  }
});

const consolidarEntregaStep = createStep({
  id: 'consolidar-entrega',
  execute: async ({ context }) => {
    const revisao = context.getStepResult('revisar-resultados');
    
    // Consolida resultado final
    const consolidado = await coordinatorAgent.generate(`
      Consolide os seguintes resultados em uma entrega final coesa:
      
      ${JSON.stringify(revisao.resultados)}
      
      Formato solicitado: ${context.input.formatoSaida || 'texto'}
      
      Produza:
      1. Resumo executivo
      2. Resposta completa
      3. Anexos/referências (se aplicável)
    `);
    
    return {
      resumo: extractResumo(consolidado.text),
      conteudoCompleto: consolidado.text,
      arquivosGerados: [] // Preenchido se houver arquivos de saída
    };
  }
});

export const processamentoInteligenteWorkflow = createWorkflow({
  id: 'processamento-inteligente',
  name: 'Processamento Inteligente de Solicitações',
  steps: [
    interpretarSolicitacaoStep,
    executarTasksStep,
    revisarResultadosStep,
    consolidarEntregaStep,
  ],
  transitionLogic: {
    'interpretar-solicitacao': { next: 'executar-tasks' },
    'executar-tasks': { next: 'revisar-resultados' },
    'revisar-resultados': {
      next: 'consolidar-entrega',
      condition: ({ output }) => output.aprovado
      // Se não aprovado, poderia voltar para executar-tasks
    }
  }
});
```

---

## Plano de Implementação - MVP SERPRO

### Sprint 1: Fundação (Semanas 1-2)

```
□ Setup do projeto Mastra no repositório
□ Configurar PostgreSQL localmente
□ Implementar tools básicas de arquivo (read/write PDF, DOCX, XLSX)
□ Implementar tools de sistema (listar, ler, salvar arquivos)
□ Criar estrutura de pastas para workspace
□ Testar integração das tools
```

**Entregável:** Tools de arquivo funcionando via testes unitários

### Sprint 2: Web e Pesquisa (Semanas 3-4)

```
□ Implementar webSearchTool (DuckDuckGo)
□ Implementar fetchURLTool
□ Implementar summarizeContentTool
□ Criar mecanismo de cache para buscas
□ Testar limites de rate limiting
□ Documentar uso
```

**Entregável:** Pesquisa web funcionando, sumarização operacional

### Sprint 3: Subagentes (Semanas 5-6)

```
□ Criar analyst-agent
□ Criar writer-agent
□ Criar research-agent
□ Criar doc-processor-agent
□ Definir instruções detalhadas para cada agente
□ Testar capacidades individuais
```

**Entregável:** 4 agentes especializados configurados e testáveis

### Sprint 4: Coordinator CoT (Semanas 7-8)

```
□ Implementar xpert-gov-coordinator
□ Configurar maxSteps e reasoning
□ Implementar lógica de delegação
□ Criar sistema de contexto entre agentes
□ Implementar revisão crítica
□ Testar fluxos complexos multi-agente
```

**Entregável:** Coordinator orquestrando múltiplos agentes

### Sprint 5: Workflow e Integração (Semanas 9-10)

```
□ Implementar processamento-inteligente workflow
□ Criar lógica de interpretação de solicitações
□ Implementar sistema de retry e correção
□ Criar handlers para entrega em arquivo
□ Integrar tudo no Mastra index.ts
□ Testes end-to-end
```

**Entregável:** Workflow completo funcionando

### Sprint 6: RAG (Semanas 11-12)

```
□ Configurar PgVector
□ Implementar indexação de documentos
□ Criar tool de consulta RAG
□ Integrar RAG ao research-agent
□ Criar base de conhecimento inicial (legislação básica)
□ Testar recuperação semântica
```

**Entregável:** Sistema RAG operacional com consulta a documentos

### Sprint 7: Refinamento (Semanas 13-14)

```
□ Otimizar prompts dos agentes
□ Melhorar tratamento de erros
□ Implementar feedback do usuário
□ Criar exemplos de uso documentados
□ Testes de carga básicos
□ Preparação para deploy
```

**Entregável:** Sistema refinado e documentado

### Sprint 8: Deploy e Pilotos (Semanas 15-16)

```
□ Deploy em ambiente de homologação SERPRO
□ Configurar logging e monitoramento
□ Selecionar usuários pilotos
□ Treinamento inicial
□ Coleta de feedback
□ Ajustes finais
```

**Entregável:** MVP em homologação com usuários pilotos

---

## Estrutura de Diretórios

```
XpertIA/
├── src/
│   └── mastra/
│       ├── index.ts                    # Entry point do Mastra
│       ├── agents/
│       │   ├── coordinator.ts          # Xpert-Gov Coordinator
│       │   ├── analyst-agent.ts        # Analista de dados
│       │   ├── writer-agent.ts         # Redator
│       │   ├── research-agent.ts       # Pesquisador
│       │   └── doc-processor-agent.ts  # Processador de docs
│       ├── tools/
│       │   ├── file-tools.ts           # PDF, DOCX, XLSX
│       │   ├── web-tools.ts            # Search, fetch URL
│       │   ├── analysis-tools.ts       # Summarize, calculate
│       │   └── system-tools.ts         # File system, terminal
│       ├── workflows/
│       │   └── inteligente-workflow.ts # Workflow principal
│       ├── rag/
│       │   ├── index.ts                # Configuração RAG
│       │   └── document-loader.ts      # Loader de documentos
│       └── utils/
│           ├── file-helpers.ts
│           └── validation.ts
├── workspace/                          # Área de trabalho dos usuários
│   ├── uploads/                        # Arquivos enviados
│   ├── outputs/                        # Arquivos gerados
│   └── temp/                           # Arquivos temporários
├── knowledge-base/                     # Base de conhecimento RAG
│   └── legislacao/                     # Documentos de legislação
└── tests/
    └── e2e/
```

---

## Configuração do Coordinator

```typescript
// agents/coordinator.ts
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

export const xpertGovCoordinator = new Agent({
  id: 'xpert-gov-coordinator',
  name: 'Xpert-Gov Assistant',
  description: 'Assistente inteligente para gestores e servidores públicos',
  
  instructions: `
    Você é o Xpert-Gov, um assistente inteligente para servidores e gestores 
    do SERPRO. Sua missão é ajudar em tarefas diárias de natureza 
    administrativa, financeira e de RH.
    
    ARQUITETURA CHAIN OF THOUGHT:
    Você opera com raciocínio em múltiplos passos:
    1. COMPREENDER a solicitação do usuário
    2. PLANIFICAR as tarefas necessárias
    3. DELEGAR para agentes especializados quando apropriado
    4. SUPERVISIONAR a execução
    5. REVISAR criticamente os resultados
    6. CONSOLIDAR a entrega final
    
    SUBAGENTES DISPONÍVEIS:
    - analyst-agent: Análise de dados, cálculos, estatísticas
    - writer-agent: Redação, revisão, formatação de documentos
    - research-agent: Pesquisa web, sumarização, extração de info
    - doc-processor-agent: Manipulação de PDF, DOCX, XLSX
    
    QUANDO DELEGAR:
    - Análise de dados → analyst-agent
    - Redação/Revisão → writer-agent
    - Pesquisa/Resumo → research-agent
    - Processamento de arquivos → doc-processor-agent
    - Tarefas múltiplas → delegar sequencialmente
    
    DIRETRIZES DE EXECUÇÃO:
    1. Sempre confirme entendimento antes de executar tarefas complexas
    2. Quebre tarefas grandes em subtarefas menores
    3. Execute tool calls quando necessário para obter dados
    4. Revise seu próprio trabalho antes de entregar
    5. Peça feedback se a solicitação for ambígua
    6. Ofereça salvar resultados em arquivo quando apropriado
    
    FORMATO DE RESPOSTA:
    - Comece com um resumo do que foi feito
    - Apresente o resultado principal de forma clara
    - Inclua detalhes relevantes
    - Ofereça próximos passos ou ações adicionais
    - Pergunte se deseja salvar em arquivo
    
    AUTO-CORREÇÃO:
    Se detectar erros ou inconsistências:
    1. Reconheça o problema
    2. Explique o que deu errado
    3. Execute a correção
    4. Confirme que está resolvido
  `,
  
  model: 'groq/llama-3.3-70b-versatile',
  
  // Subagentes disponíveis para delegação
  agents: {
    analystAgent,
    writerAgent,
    researchAgent,
    docProcessorAgent,
  },
  
  // Tools disponíveis para uso direto
  tools: {
    // Arquivos
    readPDFTool,
    readDOCXTool,
    readExcelTool,
    writeDOCXTool,
    writeExcelTool,
    // Web
    webSearchTool,
    fetchURLTool,
    // Análise
    summarizeContentTool,
    calculateTool,
    compareDataTool,
    // Sistema
    listFilesTool,
    readFileTool,
    writeFileTool,
    compressFilesTool,
  },
  
  // Memória para contexto persistente
  memory: new Memory({
    storage: new PostgresStore({
      id: 'coordinator-memory',
      connectionString: process.env.DATABASE_URL!,
    }),
    options: {
      lastMessages: 20,
      semanticRecall: {
        topK: 5,
        messageRange: 3,
      },
      workingMemory: {
        enabled: true,
        template: `
          Usuário: {{userName}}
          Perfil: {{perfil}}
          Preferências: {{preferencias}}
          Arquivos em uso: {{arquivosAtivos}}
          Tarefas pendentes: {{tarefasPendentes}}
        `,
      },
    },
  }),
  
  // Configuração CoT avançada
  defaultOptions: {
    maxSteps: 15,
    
    onIterationComplete: async (context) => {
      console.log(`[CoT] Step ${context.iteration}/${context.maxSteps}`);
      
      // Se muitos steps, alerta
      if (context.iteration > 10) {
        console.warn('[CoT] Approaching step limit');
      }
      
      return { continue: true };
    },
    
    onStepFinish: async (context) => {
      // Log de cada step para audit
      console.log(`[Step] ${context.stepType}: ${context.finishReason}`);
    },
  },
});
```

---

## Exemplos de Uso

### Exemplo 1: Análise de Planilha

**Usuário:**
> "Analise esta planilha de despesas e me diga se há valores atípicos. Depois gere um relatório em Word com os principais achados."

**Fluxo do Coordinator:**
1. Interpreta: análise de dados + geração de documento
2. Delega leitura Excel → doc-processor-agent
3. Delega análise → analyst-agent (recebe dados)
4. Recebe resultado: lista de anomalias
5. Delega redação → writer-agent (recebe análise)
6. Recebe relatório em texto
7. Pergunta: "Deseja que eu salve o relatório em um arquivo DOCX?"

### Exemplo 2: Pesquisa e Síntese

**Usuário:**
> "Pesquise as últimas mudanças na Lei de Licitações e crie um resumo executivo dos principais pontos."

**Fluxo:**
1. Delega pesquisa → research-agent (web search)
2. Recebe resultados da pesquisa
3. Delega síntese → writer-agent
4. Recebe resumo executivo
5. Entrega ao usuário

### Exemplo 3: Processamento Complexo

**Usuário:**
> "Tenho 3 arquivos PDF com relatórios trimestrais. Extraia os dados financeiros de cada um, compare os resultados entre trimestres, identifique tendências e gere uma planilha Excel consolidada."

**Fluxo:**
1. Planifica: extrair (3x) → consolidar → analisar → gerar Excel
2. Delega extração paralela (3 chamadas ao doc-processor-agent)
3. Consolida dados recebidos
4. Delega análise → analyst-agent
5. Recebe análise com tendências
6. Delega geração Excel → doc-processor-agent
7. Entrega arquivo ao usuário

---

## Próximos Passos Imediatos

1. **Validar este plano** com stakeholders do SERPRO
2. **Confirmar infraestrutura:** Acesso a PostgreSQL? Limitações de rede?
3. **Definir prioridade:** Qual categoria de tarefa é mais frequente?
4. **Preparar ambiente:** Setup inicial do projeto
5. **Iniciar Sprint 1:** Implementação das tools de arquivo

---

*Documento de planejamento do MVP Xpert-Gov para SERPRO*
