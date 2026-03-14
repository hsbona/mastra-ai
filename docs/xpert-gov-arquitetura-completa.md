# Xpert-Gov: Arquitetura de Agentes para Governo Federal

> **Versão do Documento:** 1.0  
> **Data:** 2026-03-11  
> **Projeto:** Xpert - Assistente IA para Servidores Públicos  
> **Clientes:** Grandes órgãos do Governo Federal Brasileiro

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Contexto: Governo Federal Brasileiro](#contexto-governo-federal-brasileiro)
3. [Arquitetura do Xpert-Gov](#arquitetura-do-xpert-gov)
4. [Subagentes Especializados](#subagentes-especializados)
5. [Tools do Ecossistema Gov](#tools-do-ecossistema-gov)
6. [Workflows Administrativos](#workflows-administrativos)
7. [Elementos Estruturantes do Mastra](#elementos-estruturantes-do-mastra)
8. [Roadmap de Implementação](#roadmap-de-implementação)
9. [Considerações de Segurança e Compliance](#considerações-de-segurança-e-compliance)

---

## Visão Geral

O **Xpert-Gov** é um sistema multi-agente baseado no framework Mastra, projetado especificamente para auxiliar servidores públicos federais em suas rotinas administrativas, legislativas e de atendimento ao cidadão.

### Objetivos Principais

| Objetivo | Descrição |
|----------|-----------|
| **Desburocratização** | Automatizar tarefas repetitivas e processos manuais |
| **Eficiência** | Reduzir tempo de resposta em processos administrativos |
| **Padronização** | Garantir conformidade com normas e regulamentações |
| **Transparência** | Documentar decisões e mantê-las auditáveis |
| **Acessibilidade** | Disponibilizar informações de forma clara e objetiva |

### Princípios de Design

1. **Modularidade**: Cada subagente tem responsabilidade única e bem definida
2. **Especialização**: Agentes treinados para domínios específicos do governo
3. **Coordenação**: Supervisor inteligente que orquestra múltiplos agentes
4. **Extensibilidade**: Facilidade para adicionar novos órgãos e processos
5. **Compliance**: Conformidade com LGPD, INDACT e normas do SISP

---

## Contexto: Governo Federal Brasileiro

### Domínios de Atuação

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GOVERNO FEDERAL BRASILEIRO                           │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   ADMINISTRAÇÃO │   LEGISLATIVO   │    JUDICIÁRIO   │    FISCAL         │
├─────────────────┼─────────────────┼─────────────────┼───────────────────┤
│ • SIAPE/CPF     │ • Normativos    │ • Processos     │ • Orçamento       │
│ • Compras       │ • Leis/Decretos │ • Consultas     │ • Prestação Contas│
│ • Licitações    │ • Pareceres     │ • Jurisprudência│ • Auditoria       │
│ • Diárias       │ • Elaboração    │                 │ • Contratos       │
│ • Frequência    │   de Minutas    │                 │                   │
├─────────────────┼─────────────────┼─────────────────┼───────────────────┤
│   ATENDIMENTO   │   DOCUMENTOS    │    COMUNICAÇÃO  │    CONHECIMENTO   │
├─────────────────┼─────────────────┼─────────────────┼───────────────────┤
│ • Fale Conosco  │ • Ofícios       │ • Intimações    │ • RAG (futuro)    │
│ • Ouvidoria     │ • Memos         │ • Publicações   │ • Legislação      │
│ • SAC           │ • Portarias     │ • Sistemas      │ • Manuais         │
│ • Protocolo     │ • Resoluções    │ • SEI/SIGM        │ • Procedimentos   │
└─────────────────┴─────────────────┴─────────────────┴───────────────────┘
```

### Sistemas Governamentais Relevantes

| Sistema | Órgão | Função | Integração |
|---------|-------|--------|------------|
| **SEI** | Presidência | Gestão documental | API REST |
| **SIGM** | CGU | Gestão ministerial | API REST |
| **SIAPE** | Dataprev | RH Servidores | Web Service |
| **Compras.gov.br** | Ministério da Economia | Licitações | API |
| **SIGTAP** | MS | Procedimentos saúde | API |
| **SISGRH** | Vários | Gestão de pessoas | Variada |
| **SOL** | TCU | Solicitações | Portal |
| **e-SIC** | Todos | LAI | Protocolo |

---

## Arquitetura do Xpert-Gov

### Visão Arquitetural

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUÁRIO (Servidor Público)                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    XPERT-GOV COORDINATOR                                │
│  Responsabilidades:                                                      │
│  • Análise de intenção do usuário                                        │
│  • Roteamento para subagentes especializados                             │
│  • Gestão de contexto entre interações                                   │
│  • Logging e auditoria de todas as interações                            │
│  • Controle de acesso baseado em perfil (DAM, COORD, TEC, etc)           │
└──────────┬────────────────────┬────────────────────┬─────────────────────┘
           │                    │                    │
    ┌──────▼──────┐     ┌──────▼──────┐     ┌───────▼───────┐
    │   NÚCLEO    │     │   NÚCLEO    │     │    NÚCLEO     │
    │  JURÍDICO   │     │   ADMIN     │     │   FISCAL      │
    │             │     │             │     │               │
    │ • Normativo │     │ • RH/Diárias│     │ • Orçamento   │
    │ • SEI       │     │ • Licitações│     │ • Contratos   │
    │ • Legislação│     │ • Compras   │     │ • Prestação   │
    └──────┬──────┘     └──────┬──────┘     │   de Contas   │
           │                   │            └───────────────┘
           │                   │
    ┌──────▼──────┐     ┌──────▼──────┐
    │   NÚCLEO    │     │   NÚCLEO    │
    │ ATENDIMENTO │     │  DOCUMENTOS │
    │             │     │             │
    │ • e-SIC     │     │ • Ofícios   │
    │ • Ouvidoria │     │ • Memos     │
    │ • FAQ       │     │ • Portarias │
    └─────────────┘     └─────────────┘
```

### Fluxo de Interação

```
Usuário → Coordinator → Análise de Intenção → Delegação → Subagente → Resposta
                          ↓
                    [Complexo?] → Sim → Multi-step reasoning
                          ↓ Não
                    [Precisa dados?] → Sim → Tool invocation
                          ↓ Não
                    Resposta direta
```

---

## Subagentes Especializados

### 1. Agente Jurídico-Normativo (`juridico-agent`)

**Responsabilidades:**
- Consulta a legislação federal (Leis, Decretos, Portarias)
- Análise de conformidade legal de atos administrativos
- Elaboração de minutas de normas
- Pareceres jurídicos preliminares
- Integração com SEI para consulta processual

**Capacidades:**
```typescript
const juridicoAgent = new Agent({
  id: 'juridico-agent',
  name: 'Assistente Jurídico-Normativo',
  description: 'Especialista em legislação federal, elaboração de normas e pareceres jurídicos.',
  instructions: `
    Você é um assistente jurídico especializado no governo federal brasileiro.
    
    SUAS COMPETÊNCIAS:
    - Consultar e interpretar legislação federal (Leis, MPs, Decretos, Portarias)
    - Analisar conformidade de atos administrativos
    - Elaborar minutas de normas com a estrutura correta (epígrafe, ementa, texto)
    - Emitir pareceres jurídicos preliminares estruturados
    - Consultar processos no SEI (quando integrado)
    
    DIRETRIZES:
    - Sempre cite a fonte legal (artigo, parágrafo, lei)
    - Use linguagem técnica apropriada ao direito administrativo
    - Mantenha neutralidade e imparcialidade
    - Indique quando uma questão requer análise de procurador
    - Não forneça consultoria jurídica definitiva (use "parecer preliminar")
    
    ESTRUTURA DE MINUTAS:
    - Epígrafe (identificação do ato)
    - Ementa (resumo do conteúdo)
    - Preâmbulo (remissões necessárias)
    - Texto normativo (artigos numerados)
    - Fecho (local, data, assinatura)
  `,
  model: 'groq/llama-3.3-70b-versatile',
  tools: {
    consultarLegislacaoTool,    // Busca em banco legal (RAG futuro)
    consultarSEITool,           // API SEI
    validarEstruturaNormaTool,  // Valida formato de normas
  }
});
```

### 2. Agente Administrativo-SEI (`admin-sei-agent`)

**Responsabilidades:**
- Criação e tramitação de documentos no SEI
- Análise de processos administrativos
- Consulta a andamentos e despachos
- Geração de relatórios de processos
- Autuação de processos

```typescript
const adminSEIAgent = new Agent({
  id: 'admin-sei-agent',
  name: 'Assistente Administrativo SEI',
  description: 'Especialista em gestão documental e processos administrativos no SEI.',
  instructions: `
    Você é um assistente especializado no Sistema Eletrônico de Informações (SEI).
    
    SUAS COMPETÊNCIAS:
    - Criar e tramitar documentos no SEI
    - Consultar andamento de processos
    - Gerar relatórios de tramitação
    - Auxiliar na autuação de processos
    - Orientar sobre tipos de documentos e seus usos
    
    TIPOS DE DOCUMENTOS SEI:
    - Ofício (comunicação externa)
    - Memorando (comunicação interna)
    - Portaria (ato normativo individual)
    - Despacho (decisão em processo)
    - Parecer (manifestação técnica)
    - Termo de Abertura/Encerramento
    
    DIRETRIZES:
    - Sempre verifique a classificação de informação (pública/restrita)
    - Respeite as competências hierárquicas
    - Sugira sempre o tipo de documento mais adequado
    - Indique o nível de sigilo necessário
  `,
  tools: {
    criarDocumentoSEITool,
    consultarProcessoSEITool,
    tramitarProcessoSEITool,
    listarDocumentosSEITool,
  }
});
```

### 3. Agente de RH e Folha (`rh-agent`)

**Responsabilidades:**
- Consulta a dados do SIAPE
- Orientação sobre diárias e passagens
- Esclarecimentos sobre licenças e afastamentos
- Cálculos previdenciários simplificados
- Auxílio em processos de progressão/promoção

```typescript
const rhAgent = new Agent({
  id: 'rh-agent',
  name: 'Assistente de RH e Servidores',
  description: 'Especialista em legislação de pessoal, SIAPE, diárias e benefícios.',
  instructions: `
    Você é um assistente de Recursos Humanos do governo federal.
    
    SUAS COMPETÊNCIAS:
    - Consultar dados do SIAPE (quando integrado)
    - Orientar sobre diárias e passagens (normas do Viagem à Serviço)
    - Esclarecer sobre licenças (saúde, afastamento, prêmio)
    - Auxiliar em processos de progressão/promoção
    - Informar sobre benefícios (auxílios, indenizações)
    
    LEGISLAÇÃO BASE:
    - Lei 8.112/1990 (Regime Jurídico)
    - Lei 8.270/1991 (Diárias)
    - Decreto 4.307/2002 (Viagem à Serviço)
    - Lei 13.135/2015 (Abono Pecuniário)
    
    DIRETRIZES:
    - Nunca exponha dados pessoais de servidores sem autorização
    - Sempre referencie a legislação aplicável
    - Indique o canal oficial para solicitações formais
    - Destaque prazos e documentos necessários
  `,
  tools: {
    consultarSIAPETool,
    calcularDiariasTool,
    consultarProgressaoTool,
    verificarPrazosTool,
  }
});
```

### 4. Agente de Licitações e Contratos (`licitacao-agent`)

**Responsabilidades:**
- Auxílio na preparação de editais
- Análise de documentação de licitação
- Consulta ao Compras.gov.br
- Orientação sobre modalidades licitatórias
- Acompanhamento de contratos

```typescript
const licitacaoAgent = new Agent({
  id: 'licitacao-agent',
  name: 'Assistente de Licitações e Contratos',
  description: 'Especialista na Lei 14.133/2021 (Nova Lei de Licitações) e gestão contratual.',
  instructions: `
    Você é um assistente especializado em licitações e contratos federais.
    
    SUAS COMPETÊNCIAS:
    - Auxiliar na elaboração de editais e termos de referência
    - Orientar sobre modalidades (Pregão, Concorrência, Convite, etc)
    - Analisar documentação de processos licitatórios
    - Consultar compras.gov.br e PNCP
    - Orientar sobre gestão contratual (aditivos, reequilíbrio)
    
    LEGISLAÇÃO BASE:
    - Lei 14.133/2021 (Nova Lei de Licitações)
    - Lei 13.979/2019 (Emergencial - ainda vigente para alguns casos)
    - Decreto 10.024/2019 (Regulamentação)
    - IN 63/2022 (CGU)
    
    MODALIDADES:
    - Pregão (eletrônico/presencial) - bens e serviços comuns
    - Concorrência - obras e serviços técnicos
    - Dispensa/Inexigibilidade (casos específicos)
    - Concurso (credenciamento)
    - Diálogo competitivo (soluções inovadoras)
    
    DIRETRIZES:
    - Sempre indique a modalidade mais adequada
    - Alerte sobre vícios comuns em editais
    - Respeite os limites de valor para cada modalidade
    - Considere as exigências do TCU
  `,
  tools: {
    consultarComprasGovTool,
    validarModalidadeTool,
    consultarPNCPTool,
    gerarMinutaEditalTool,
  }
});
```

### 5. Agente Orçamentário e Financeiro (`orcamento-agent`)

**Responsabilidades:**
- Consulta a empenhos e notas de empenho
- Análise de créditos orçamentários
- Auxílio em programações financeiras
- Prestação de contas simplificada
- Acompanhamento de restos a pagar

```typescript
const orcamentoAgent = new Agent({
  id: 'orcamento-agent',
  name: 'Assistente Orçamentário e Financeiro',
  description: 'Especialista em orçamento público, empenhos e prestação de contas.',
  instructions: `
    Você é um assistente especializado em orçamento e finanças públicas federais.
    
    SUAS COMPETÊNCIAS:
    - Consultar empenhos e notas de empenho
    - Analisar créditos orçamentários (suplementação, anulação)
    - Auxiliar em programações financeiras
    - Orientar sobre prestação de contas (SIAFI, PCASP)
    - Analisar restos a pagar (RP)
    
    CONCEITOS CHAVE:
    - LOA (Lei Orçamentária Anual)
    - PLOA (Projeto de LOA)
    - Crédito Orçamentário: suplementar, especial, extraordinário
    - Natureza de Despesa: 6 dígitos (ex: 33.90.30)
    - Modalidade de Aplicação: 2 dígitos
    - Elemento de Despesa: 2 dígitos
    
    DIRETRIZES:
    - Sempre verifique a disponibilidade orçamentária
    - Respeite o princípio da anterioridade
    - Considere os limites do cronograma de desembolso
    - Observe as regras de movimentação de créditos
  `,
  tools: {
    consultarEmpenhoTool,
    consultarCreditosTool,
    analisarNaturezaDespesaTool,
    consultarSIAFITool,
  }
});
```

### 6. Agente de Atendimento e e-SIC (`atendimento-agent`)

**Responsabilidades:**
- Respostas a demandas do e-SIC
- Atendimento à Ouvidoria
- Respostas a Reclamações, Denúncias, Elogios
- Esclarecimentos sobre LAI (Lei de Acesso à Informação)
- Classificação de pedidos LAI

```typescript
const atendimentoAgent = new Agent({
  id: 'atendimento-agent',
  name: 'Assistente de Atendimento e LAI',
  description: 'Especialista em atendimento ao cidadão, e-SIC e LAI.',
  instructions: `
    Você é um assistente de atendimento ao cidadão do governo federal.
    
    SUAS COMPETÊNCIAS:
    - Responder demandas do e-SIC (Lei 12.527/2011)
    - Classificar pedidos LAI (acesso negado, acesso parcial, classificação)
    - Atender demandas da Ouvidoria
    - Orientar sobre canais de atendimento
    - Propor respostas padronizadas
    
    TIPOS DE DEMANDA:
    - Pedido LAI (acesso a informação)
    - Reclamação (insatisfação com serviço)
    - Denúncia (irregularidade)
    - Sugestão (melhoria)
    - Elogio
    - Solicitação (serviço/benefício)
    
    CLASSIFICAÇÃO LAI:
    - Classificação: sigilo legal (pessoal, comercial, etc)
    - Acesso Negado: informação classificada
    - Acesso Parcial: informação parcialmente acessível
    - Inexistência: informação não existe
    - Não Atendimento: pedido genérico, desproporcional
    
    DIRETRIZES:
    - Sempre respeite os prazos legais (20 dias + 10 dias prorrogação)
    - Use linguagem acessível e clara
    - Informe sempre os recursos disponíveis
    - Mantenha registro de todas as interações
  `,
  tools: {
    consultarPedidoSICTool,
    classificarPedidoLAITool,
    gerarRespostaPadraoTool,
    consultarPrazosLAITool,
  }
});
```

### 7. Agente de Documentação (`documentos-agent`)

**Responsabilidades:**
- Geração de ofícios e memorandos
- Revisão de documentos oficiais
- Padronização de textos administrativos
- Formatação conforme normas gráficas
- Sugestões de melhoria textual

```typescript
const documentosAgent = new Agent({
  id: 'documentos-agent',
  name: 'Assistente de Documentação Oficial',
  description: 'Especialista em elaboração e revisão de documentos oficiais do governo.',
  instructions: `
    Você é um assistente de documentação oficial do governo federal.
    
    SUAS COMPETÊNCIAS:
    - Elaborar ofícios, memorandos, despachos
    - Revisar documentos para conformidade
    - Padronizar textos administrativos
    - Sugerir melhorias de clareza e objetividade
    - Verificar conformidade com normas gráficas
    
    ESTRUTURAS DE DOCUMENTOS:
    
    OFÍCIO (comunicação externa):
    - Local e data
    - Número de controle
    - Destinatário (cargo + órgão)
    - Assunto
    - Texto (você + 1 parágrafo = assunto)
    - Fecho (Atenciosamente)
    - Assinatura + nome + cargo
    
    MEMORANDO (comunicação interna):
    - Similar ao ofício
    - Destinatário interno
    - Fecho mais informal
    
    DESPACHO:
    - Referência ao processo/documento
    - Conclusão/decisão
    - Assinatura
    
    NORMAS GRÁFICAS:
    - Fonte: Arial ou Times New Roman, 12pt
    - Margens: 3cm esquerda, 2cm demais
    - Espaçamento: 1,5 ou simples
    - Numeração de páginas
    - Voco: 3ª pessoa do plural (Vossa Senhoria)
  `,
  tools: {
    gerarDocumentoTool,
    revisarDocumentoTool,
    formatarNormasGraficasTool,
    sugerirMelhoriasTool,
  }
});
```

### 8. Agente de Auditoria e Compliance (`auditoria-agent`)

**Responsabilidades:**
- Análise de conformidade normativa
- Identificação de riscos de auditoria
- Consulta a deliberações do TCU
- Auxílio em respostas a auditorias
- Análise de indicadores de conformidade

```typescript
const auditoriaAgent = new Agent({
  id: 'auditoria-agent',
  name: 'Assistente de Auditoria e Compliance',
  description: 'Especialista em auditoria pública, TCU, CGU e controle interno.',
  instructions: `
    Você é um assistente especializado em auditoria e compliance governamental.
    
    SUAS COMPETÊNCIAS:
    - Analisar conformidade de atos e processos
    - Identificar riscos de auditoria
    - Consultar jurisprudência do TCU e CGU
    - Auxiliar em respostas a auditorias
    - Analisar indicadores de conformidade
    
    ÓRGÃOS DE CONTROLE:
    - TCU (Tribunal de Contas da União)
    - CGU (Controladoria-Geral da União)
    - CGU/CE (Corregedoria)
    - Órgãos de controle interno
    
    TIPOS DE FISCALIZAÇÃO:
    - Auditoria operacional
    - Auditoria de conformidade
    - Auditoria financeira
    - Inspeção
    - Tomada de contas especial
    
    DIRETRIZES:
    - Sempre cite a base legal das recomendações
    - Diferencie observações, recomendações e determinações
    - Indique os prazos para resposta/compliance
    - Sugira medidas corretivas preventivas
  `,
  tools: {
    consultarJurisprudenciaTCUTool,
    consultarDeliberacoesCGUTool,
    analisarRiscosTool,
    gerarRespostaAuditoriaTool,
  }
});
```

---

## Tools do Ecossistema Gov

### Tools de Integração com Sistemas

#### 1. SEI Integration Tools

```typescript
// tools/sei-tools.ts
export const consultarProcessoSEITool = createTool({
  id: 'consultar-processo-sei',
  name: 'Consultar Processo SEI',
  description: 'Consulta andamento e documentos de um processo no SEI',
  inputSchema: z.object({
    numeroProcesso: z.string().regex(/^\d{5}\.\d{6}\/\d{4}-\d{2}$/),
    incluirDocumentos: z.boolean().default(false),
  }),
  execute: async ({ context }) => {
    // Integração com API SEI
    const response = await fetch(`${SEI_API_URL}/processos/${context.numeroProcesso}`, {
      headers: { 'Authorization': `Bearer ${SEI_API_TOKEN}` }
    });
    return response.json();
  }
});

export const criarDocumentoSEITool = createTool({
  id: 'criar-documento-sei',
  name: 'Criar Documento SEI',
  description: 'Cria um novo documento em um processo SEI',
  inputSchema: z.object({
    numeroProcesso: z.string(),
    tipoDocumento: z.enum(['OFICIO', 'MEMORANDO', 'DESPACHO', 'PARECER']),
    texto: z.string(),
    nivelAcesso: z.enum(['PUBLICO', 'RESTRITO', 'SIGILOSO']).default('PUBLICO'),
  }),
  execute: async ({ context }) => {
    // Criação via API SEI
  }
});
```

#### 2. SIAPE Integration Tools

```typescript
// tools/siape-tools.ts
export const consultarServidorTool = createTool({
  id: 'consultar-servidor',
  name: 'Consultar Servidor SIAPE',
  description: 'Consulta dados cadastrais de servidor pelo CPF ou matrícula',
  inputSchema: z.object({
    cpf: z.string().regex(/^\d{11}$/).optional(),
    matricula: z.string().optional(),
  }).refine(data => data.cpf || data.matricula, {
    message: 'Informe CPF ou matrícula'
  }),
  execute: async ({ context }) => {
    // Integração com API SIAPE/Dataprev
  }
});

export const calcularDiariasTool = createTool({
  id: 'calcular-diarias',
  name: 'Calcular Diárias',
  description: 'Calcula valor de diárias conforme destino e nível',
  inputSchema: z.object({
    destino: z.enum(['BRASILIA', 'CAPITAL', 'INTERIOR', 'EXTERIOR']),
    nivel: z.enum(['PRESIDENTE', 'MINISTRO', 'DIRETOR', 'GERENTE', 'TECNICO']),
    dias: z.number().int().min(1),
    meiaDiaria: z.boolean().default(false),
  }),
  execute: async ({ context }) => {
    const valores = {
      PRESIDENTE: { BRASILIA: 558.86, CAPITAL: 838.29, INTERIOR: 559.31, EXTERIOR: 1200.00 },
      MINISTRO: { BRASILIA: 446.76, CAPITAL: 670.14, INTERIOR: 447.09, EXTERIOR: 960.00 },
      // ... demais valores da tabela do Decreto 4.307/2002
    };
    const valorDiaria = valores[context.nivel][context.destino];
    const total = context.meiaDiaria 
      ? (context.dias - 1) * valorDiaria + (valorDiaria / 2)
      : context.dias * valorDiaria;
    return { valorDiaria, total, moeda: context.destino === 'EXTERIOR' ? 'USD' : 'BRL' };
  }
});
```

#### 3. Compras.gov.br Tools

```typescript
// tools/compras-gov-tools.ts
export const consultarLicitacaoTool = createTool({
  id: 'consultar-licitacao',
  name: 'Consultar Licitação',
  description: 'Consulta processos licitatórios no Compras.gov.br',
  inputSchema: z.object({
    numeroProcesso: z.string().optional(),
    uasg: z.string().optional(),
    modalidade: z.enum(['PREGAO', 'CONCORRENCIA', 'DISPENSA', 'INEXIGIBILIDADE']).optional(),
    status: z.enum(['PUBLICADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']).optional(),
  }),
  execute: async ({ context }) => {
    // Integração com API Compras.gov.br
  }
});

export const consultarFornecedorTool = createTool({
  id: 'consultar-fornecedor',
  name: 'Consultar Fornecedor',
  description: 'Consulta dados de fornecedor no SICAF/CNPJ',
  inputSchema: z.object({
    cnpj: z.string().regex(/^\d{14}$/),
  }),
  execute: async ({ context }) => {
    // Consulta SICAF + Receita Federal
  }
});
```

### Tools de Dados e Análise

#### 4. Legislação e Jurisprudência Tools

```typescript
// tools/juridico-tools.ts
export const consultarLegislacaoTool = createTool({
  id: 'consultar-legislacao',
  name: 'Consultar Legislação',
  description: 'Consulta Leis, Decretos, Portarias no Planalto/LexML',
  inputSchema: z.object({
    termo: z.string(),
    tipo: z.enum(['LEI', 'MP', 'DECRETO', 'PORTARIA', 'INSTRUCAO_NORMATIVA']).optional(),
    dataInicio: z.string().date().optional(),
    dataFim: z.string().date().optional(),
  }),
  execute: async ({ context }) => {
    // Integração com LexML ou base local (RAG futuro)
  }
});

export const consultarJurisprudenciaTCUTool = createTool({
  id: 'consultar-jurisprudencia-tcu',
  name: 'Consultar Jurisprudência TCU',
  description: 'Consulta acórdãos e decisões do TCU',
  inputSchema: z.object({
    termo: z.string(),
    tipo: z.enum(['ACORDAO', 'DECISAO', 'DELIBERACAO']).optional(),
    ano: z.number().int().optional(),
  }),
  execute: async ({ context }) => {
    // Integração com PesquisaJurisprudencia TCU
  }
});
```

#### 5. Orçamento e Finanças Tools

```typescript
// tools/orcamento-tools.ts
export const consultarEmpenhoTool = createTool({
  id: 'consultar-empenho',
  name: 'Consultar Empenho',
  description: 'Consulta nota de empenho no SIAFI',
  inputSchema: z.object({
    numeroEmpenho: z.string(),
    ug: z.string(),
    ano: z.number().default(new Date().getFullYear()),
  }),
  execute: async ({ context }) => {
    // Integração com SIAFI
  }
});

export const analisarNaturezaDespesaTool = createTool({
  id: 'analisar-natureza-despesa',
  name: 'Analisar Natureza de Despesa',
  description: 'Analisa classificação orçamentária da despesa',
  inputSchema: z.object({
    natureza: z.string().regex(/^\d{6}$/),
  }),
  execute: async ({ context }) => {
    const classificacao = {
      '33': 'Outras Despesas Correntes',
      '33.90': 'Outras Despesas Correntes - Outras',
      '33.90.30': 'Material de Consumo',
      '33.90.39': 'Outros Serviços de Terceiros - Pessoa Jurídica',
      // ... tabela completa
    };
    const categoria = context.natureza.substring(0, 2);
    const grupo = context.natureza.substring(0, 5);
    return {
      codigo: context.natureza,
      descricao: classificacao[context.natureza] || 'Natureza não encontrada',
      categoria: classificacao[categoria],
      grupo: classificacao[grupo],
    };
  }
});
```

### Tools de Produtividade

#### 6. Geração de Documentos Tools

```typescript
// tools/documentos-tools.ts
export const gerarMinutaNormaTool = createTool({
  id: 'gerar-minuta-norma',
  name: 'Gerar Minuta de Norma',
  description: 'Gera estrutura de minuta de Portaria ou Decreto',
  inputSchema: z.object({
    tipo: z.enum(['PORTARIA', 'DECRETO', 'RESOLUCAO']),
    epigrafe: z.string(),
    ementa: z.string(),
    artigos: z.array(z.object({
      numero: z.number(),
      texto: z.string(),
      paragrafos: z.array(z.string()).optional(),
    })),
  }),
  execute: async ({ context }) => {
    const estrutura = gerarEstruturaNorma(context);
    return { documento: estrutura };
  }
});

export const formatarNormasGraficasTool = createTool({
  id: 'formatar-normas-graficas',
  name: 'Formatar Conforme Normas Gráficas',
  description: 'Verifica e sugere correções de formatação oficial',
  inputSchema: z.object({
    texto: z.string(),
    tipoDocumento: z.enum(['OFICIO', 'MEMORANDO', 'DESPACHO']),
  }),
  execute: async ({ context }) => {
    // Análise e sugestões de formatação
  }
});
```

---

## Workflows Administrativos

### Workflow 1: Tramitação de Documento SEI

```typescript
// workflows/tramitacao-sei-workflow.ts
import { createWorkflow, createStep } from '@mastra/core';

const analisarDocumentoStep = createStep({
  id: 'analisar-documento',
  execute: async ({ context }) => {
    const { tipo, conteudo } = context.input;
    // Valida conteúdo e estrutura
    return { valido: true, sugestoes: [] };
  }
});

const validarAssinaturaStep = createStep({
  id: 'validar-assinatura',
  execute: async ({ context }) => {
    const { assinante, competencia } = context.input;
    // Verifica se assinante tem competência
    return { podeAssinar: true };
  }
});

const tramitarSEIStep = createStep({
  id: 'tramitar-sei',
  execute: async ({ context }) => {
    const { processo, documento, destinatario } = context.input;
    // Executa tramitação via API SEI
    return { sucesso: true, dataTramitacao: new Date() };
  }
});

const notificarInteressadosStep = createStep({
  id: 'notificar-interessados',
  execute: async ({ context }) => {
    // Envia notificação aos interessados
    return { notificado: true };
  }
});

export const tramitacaoSEIWorkflow = createWorkflow({
  id: 'tramitacao-sei',
  name: 'Tramitação de Documento SEI',
  steps: [
    analisarDocumentoStep,
    validarAssinaturaStep,
    tramitarSEIStep,
    notificarInteressadosStep,
  ],
  transitionLogic: {
    'analisar-documento': {
      next: 'validar-assinatura',
      condition: ({ output }) => output.valido
    },
    'validar-assinatura': {
      next: 'tramitar-sei',
      condition: ({ output }) => output.podeAssinar
    },
    'tramitar-sei': {
      next: 'notificar-interessados',
      condition: ({ output }) => output.sucesso
    }
  }
});
```

### Workflow 2: Processo de Diárias

```typescript
// workflows/diarias-workflow.ts

const verificarVinculoStep = createStep({
  id: 'verificar-vinculo',
  execute: async ({ context }) => {
    const { matricula } = context.input;
    // Consulta SIAPE
    return { ativo: true, cargo: 'Analista', nivel: 'GERENTE' };
  }
});

const calcularDiariasStep = createStep({
  id: 'calcular-diarias',
  execute: async ({ context }) => {
    const { destino, dias, nivel } = context.input;
    const resultado = await calcularDiariasTool.execute({
      context: { destino, dias, nivel, meiaDiaria: false }
    });
    return resultado;
  }
});

const verificarOrcamentoStep = createStep({
  id: 'verificar-orcamento',
  execute: async ({ context }) => {
    const { valorTotal } = context.input;
    // Consulta disponibilidade orçamentária
    return { disponivel: true, saldo: 50000 };
  }
});

const gerarOrdemServicoStep = createStep({
  id: 'gerar-ordem-servico',
  execute: async ({ context }) => {
    // Gera OS e vincula às diárias
    return { numeroOS: '2025/000123' };
  }
});

export const diariasWorkflow = createWorkflow({
  id: 'diarias',
  name: 'Processo de Concessão de Diárias',
  steps: [
    verificarVinculoStep,
    calcularDiariasStep,
    verificarOrcamentoStep,
    gerarOrdemServicoStep,
  ]
});
```

### Workflow 3: Análise de Conformidade de Licitação

```typescript
// workflows/licitacao-conformidade-workflow.ts

const validarDocumentacaoStep = createStep({
  id: 'validar-documentacao',
  execute: async ({ context }) => {
    const { processo } = context.input;
    // Valida documentação básica
    return { documentacaoOk: true, pendencias: [] };
  }
});

const verificarModalidadeStep = createStep({
  id: 'verificar-modalidade',
  execute: async ({ context }) => {
    const { valor, tipo } = context.input;
    // Sugere modalidade adequada
    return { modalidade: 'PREGAO_ELETRONICO', justificativa: 'Bens comuns' };
  }
});

const analisarRiscosStep = createStep({
  id: 'analisar-riscos',
  execute: async ({ context }) => {
    const { edital } = context.input;
    // Identifica riscos de auditoria
    return { riscos: [], score: 95 };
  }
});

const emitirParecerStep = createStep({
  id: 'emitir-parecer',
  execute: async ({ context }) => {
    // Consolida parecer de conformidade
    return { parecer: 'FAVORAVEL', observacoes: [] };
  }
});

export const licitacaoConformidadeWorkflow = createWorkflow({
  id: 'licitacao-conformidade',
  name: 'Análise de Conformidade de Licitação',
  steps: [
    validarDocumentacaoStep,
    verificarModalidadeStep,
    analisarRiscosStep,
    emitirParecerStep,
  ]
});
```

### Workflow 4: Resposta a Auditoria TCU

```typescript
// workflows/resposta-auditoria-workflow.ts

const analisarDeterminacaoStep = createStep({
  id: 'analisar-determinacao',
  execute: async ({ context }) => {
    const { numeroTCU, determinacao } = context.input;
    // Classifica tipo de determinação
    return { tipo: 'REGULARIZACAO', prazo: 60, prioridade: 'ALTA' };
  }
});

const identificarResponsavelStep = createStep({
  id: 'identificar-responsavel',
  execute: async ({ context }) => {
    const { tipo } = context.input;
    // Identifica unidade responsável
    return { unidade: 'DICON', responsavel: 'João Silva' };
  }
});

const elaborarRespostaStep = createStep({
  id: 'elaborar-resposta',
  execute: async ({ context }) => {
    const { determinacao, evidencias } = context.input;
    // Gera rascunho de resposta
    return { rascunho: '...', status: 'ELABORACAO' };
  }
});

const aprovarRespostaStep = createStep({
  id: 'aprovar-resposta',
  execute: async ({ context }) => {
    const { rascunho } = context.input;
    // Fluxo de aprovação hierárquica
    return { aprovado: true, assinante: 'Diretor' };
  }
});

export const respostaAuditoriaWorkflow = createWorkflow({
  id: 'resposta-auditoria',
  name: 'Resposta a Determinação de Auditoria',
  steps: [
    analisarDeterminacaoStep,
    identificarResponsavelStep,
    elaborarRespostaStep,
    aprovarRespostaStep,
  ]
});
```

---

## Elementos Estruturantes do Mastra

### 1. Workspace / Organização por Órgão

O Mastra não tem um conceito nativo de "Workspace", mas podemos implementar uma arquitetura multi-tenant por órgão:

```typescript
// mastra/index.ts - Configuração Multi-Órgão
import { Mastra } from '@mastra/core/mastra';

interface OrgaoConfig {
  id: string;
  nome: string;
  sigla: string;
  storageId: string;
  agentes: string[];
  toolsPermitidas: string[];
}

const orgaos: OrgaoConfig[] = [
  {
    id: 'me',
    nome: 'Ministério da Economia',
    sigla: 'ME',
    storageId: 'me-storage',
    agentes: ['juridico', 'admin-sei', 'orcamento', 'licitacao'],
    toolsPermitidas: ['*'],
  },
  {
    id: 'ms',
    nome: 'Ministério da Saúde',
    sigla: 'MS',
    storageId: 'ms-storage',
    agentes: ['juridico', 'admin-sei', 'rh', 'atendimento'],
    toolsPermitidas: ['*'],
  },
  // ... demais órgãos
];

// Storage isolado por órgão
const createStorage = (orgaoId: string) => new PostgresStore({
  id: `${orgaoId}-storage`,
  connectionString: process.env.DATABASE_URL!,
  schema: `orgao_${orgaoId}`,  // Schema isolado no PostgreSQL
});

// Memory isolada por órgão
const createMemory = (orgaoId: string) => new Memory({
  storage: createStorage(orgaoId),
  options: {
    lastMessages: 20,
    semanticRecall: {
      topK: 5,
      messageRange: 3,
    },
  },
});
```

### 2. Sistema de Permissões e Perfis

```typescript
// auth/permissoes.ts

type PerfilServidor = 
  | 'ASSESSOR'      // Assessor técnico
  | 'TECNICO'       // Técnico administrativo
  | 'GERENTE'       // Gerente/Diretor
  | 'COORDENADOR'   // Coordenador
  | 'DAM'           // Dirigente Máximo
  | 'AUDITOR'       // Auditor/Controlador
  | 'PROCURADOR';   // Procurador/Consultor Jurídico

interface Permissao {
  agente: string;
  acao: 'ler' | 'escrever' | 'executar';
  restricoes?: string[];
}

const permissoesPorPerfil: Record<PerfilServidor, Permissao[]> = {
  ASSESSOR: [
    { agente: 'documentos', acao: 'escrever' },
    { agente: 'admin-sei', acao: 'ler' },
    { agente: 'atendimento', acao: 'escrever' },
  ],
  TECNICO: [
    { agente: '*', acao: 'ler' },
    { agente: 'documentos', acao: 'escrever' },
    { agente: 'rh', acao: 'ler' },
  ],
  GERENTE: [
    { agente: '*', acao: 'ler' },
    { agente: 'juridico', acao: 'ler' },
    { agente: 'admin-sei', acao: 'escrever' },
    { agente: 'rh', acao: 'escrever' },
  ],
  COORDENADOR: [
    { agente: '*', acao: 'ler' },
    { agente: 'juridico', acao: 'escrever' },
    { agente: 'licitacao', acao: 'escrever' },
    { agente: 'auditoria', acao: 'ler' },
  ],
  DAM: [
    { agente: '*', acao: 'executar' },
  ],
  AUDITOR: [
    { agente: '*', acao: 'ler' },
    { agente: 'auditoria', acao: 'escrever' },
  ],
  PROCURADOR: [
    { agente: 'juridico', acao: 'executar' },
    { agente: '*', acao: 'ler' },
  ],
};

// Middleware de autorização
export const autorizarAcesso = (
  perfil: PerfilServidor, 
  agenteId: string, 
  acao: string
): boolean => {
  const permissoes = permissoesPorPerfil[perfil];
  return permissoes.some(p => 
    (p.agente === '*' || p.agente === agenteId) && p.acao === acao
  );
};
```

### 3. Sistema de Audit Trail

```typescript
// observability/audit.ts
import { Observability, createExporter } from '@mastra/observability';

interface AuditEvent {
  timestamp: Date;
  usuario: string;
  matricula: string;
  orgao: string;
  acao: string;
  agente: string;
  workflow?: string;
  tool?: string;
  input: unknown;
  output: unknown;
  sucesso: boolean;
  duracaoMs: number;
}

const auditExporter = createExporter({
  name: 'audit-exporter',
  export: async (trace) => {
    const auditEvent: AuditEvent = {
      timestamp: new Date(trace.startTime),
      usuario: trace.attributes['user.name'] as string,
      matricula: trace.attributes['user.matricula'] as string,
      orgao: trace.attributes['user.orgao'] as string,
      acao: trace.name,
      agente: trace.attributes['agent.id'] as string,
      workflow: trace.attributes['workflow.id'] as string,
      tool: trace.attributes['tool.id'] as string,
      input: trace.attributes['input'],
      output: trace.attributes['output'],
      sucesso: trace.status === 'success',
      duracaoMs: trace.duration,
    };
    
    // Persistir em tabela de auditoria
    await persistirAuditLog(auditEvent);
  }
});

// Configuração no Mastra
export const observability = new Observability({
  configs: {
    default: {
      serviceName: 'xpert-gov',
      exporters: [
        new DefaultExporter(),
        auditExporter,  // Audit trail customizado
      ],
      spanOutputProcessors: [
        new SensitiveDataFilter({
          redactFields: ['cpf', 'senha', 'token', 'apiKey'],
        }),
      ],
    },
  },
});
```

### 4. Memory e Contexto Persistente

```typescript
// memory/config.ts
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';
import { PgVector } from '@mastra/pg';

// Configuração de Memory por órgão
export const createOrgaoMemory = (orgaoId: string) => new Memory({
  storage: new PostgresStore({
    id: `${orgaoId}-memory-storage`,
    connectionString: process.env.DATABASE_URL!,
  }),
  vector: new PgVector({
    id: `${orgaoId}-vector-store`,
    connectionString: process.env.DATABASE_URL!,
    tableName: 'embeddings',
  }),
  options: {
    // Mensagens recentes mantidas no contexto
    lastMessages: 10,
    // Recall semântico para buscar contexto relevante
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
    // Working memory para dados persistentes do usuário
    workingMemory: {
      enabled: true,
      template: `
        Usuário: {{userName}}, Matrícula: {{matricula}}, Perfil: {{perfil}}
        Órgão: {{orgao}}, Unidade: {{unidade}}
        Preferências: {{preferencias}}
        Processos em andamento: {{processosAtivos}}
      `,
    },
  },
});
```

### 5. Storage e Persistência

```typescript
// storage/config.ts
import { PostgresStore } from '@mastra/pg';

// Schema do PostgreSQL para Xpert-Gov
/*
CREATE SCHEMA xpert_gov;

-- Tabela de audit trail
CREATE TABLE xpert_gov.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  usuario VARCHAR(255) NOT NULL,
  matricula VARCHAR(20) NOT NULL,
  orgao VARCHAR(10) NOT NULL,
  agente VARCHAR(100) NOT NULL,
  acao VARCHAR(255) NOT NULL,
  workflow VARCHAR(100),
  tool VARCHAR(100),
  input JSONB,
  output JSONB,
  sucesso BOOLEAN,
  duracao_ms INTEGER,
  ip_address INET
);

-- Tabela de workspaces por órgão
CREATE TABLE xpert_gov.orgaos (
  id VARCHAR(10) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(10) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de usuários (sincronizado com SIAPE)
CREATE TABLE xpert_gov.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula VARCHAR(20) UNIQUE NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  orgao_id VARCHAR(10) REFERENCES xpert_gov.orgaos(id),
  unidade VARCHAR(100),
  perfil VARCHAR(50),
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  preferencias JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX idx_audit_orgao_timestamp ON xpert_gov.audit_logs(orgao, timestamp DESC);
CREATE INDEX idx_audit_usuario ON xpert_gov.audit_logs(matricula);
CREATE INDEX idx_audit_agente ON xpert_gov.audit_logs(agente);
*/

export const createStorage = () => new PostgresStore({
  id: 'xpert-gov-storage',
  connectionString: process.env.DATABASE_URL!,
});
```

### 6. Evals e Monitoramento de Qualidade

```typescript
// evals/qualidade.ts
import { createScorer } from '@mastra/evals';

// Scorer para avaliar conformidade legal
export const conformidadeLegalScorer = createScorer({
  id: 'conformidade-legal',
  name: 'Conformidade Legal',
  description: 'Avalia se a resposta está em conformidade com legislação citada',
  score: async ({ input, output, context }) => {
    // Verifica se citações legais estão corretas
    const citacoes = extrairCitacoesLegais(output);
    let score = 1.0;
    
    for (const citacao of citacoes) {
      const valida = await validarCitacaoLegal(citacao);
      if (!valida) score -= 0.2;
    }
    
    return Math.max(0, score);
  }
});

// Scorer para clareza administrativa
export const clarezaAdministrativaScorer = createScorer({
  id: 'clareza-administrativa',
  name: 'Clareza Administrativa',
  description: 'Avalia se a linguagem é adequada ao contexto governamental',
  score: async ({ output }) => {
    // Verifica termos técnicos, estrutura, objetividade
    const checks = {
      temTermosTecnicos: verificarTermosTecnicos(output),
      estruturaClara: verificarEstrutura(output),
      objetiva: verificarObjetividade(output),
    };
    
    return (checks.temTermosTecnicos + checks.estruturaClara + checks.objetiva) / 3;
  }
});

// Scorer para segurança (não expõe dados sensíveis)
export const segurancaDadosScorer = createScorer({
  id: 'seguranca-dados',
  name: 'Segurança de Dados',
  description: 'Verifica se não há vazamento de dados sensíveis',
  score: async ({ output }) => {
    const sensivel = detectarDadosSensiveis(output);
    return sensivel.length > 0 ? 0 : 1;
  }
});
```

---

## Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-4)

```
□ Configurar estrutura base do Mastra
□ Implementar sistema de autenticação (integração com gov.br)
□ Configurar storage PostgreSQL com schemas isolados
□ Implementar audit trail básico
□ Criar Xpert-Gov Coordinator
□ Implementar 3 subagentes iniciais:
  - admin-sei-agent
  - documentos-agent
  - atendimento-agent
□ Criar 5 tools essenciais
□ Deploy em ambiente de desenvolvimento
```

### Fase 2: Expansão Core (Semanas 5-8)

```
□ Implementar juridico-agent com RAG básico
□ Implementar rh-agent com integração SIAPE
□ Implementar licitacao-agent
□ Criar 3 workflows orquestrados:
  - tramitacao-sei
  - geracao-documento
  - atendimento-sic
□ Integrar com SEI (API disponível)
□ Configurar sistema de permissões
□ Testes de segurança e compliance
□ Deploy em ambiente de homologação
```

### Fase 3: Especialização (Semanas 9-12)

```
□ Implementar orcamento-agent
□ Implementar auditoria-agent
□ Criar workflows avançados:
  - diarias-completo
  - licitacao-conformidade
  - resposta-auditoria
□ Implementar evals de qualidade
□ Criar dashboards de monitoramento
□ Treinamento de usuários piloto
□ Ajustes baseados em feedback
```

### Fase 4: RAG e Conhecimento (Semanas 13-16)

```
□ Implementar sistema RAG completo:
  - Legislação federal indexada
  - Jurisprudência TCU/CGU
  - Manuais e procedimentos
  - Documentação interna
□ Fine-tuning de prompts por órgão
□ Implementar feedback loop
□ Expandir para mais órgãos
□ Documentação completa
□ Deploy em produção (pilotos)
```

---

## Considerações de Segurança e Compliance

### LGPD (Lei 13.709/2018)

| Requisito | Implementação |
|-----------|---------------|
| **Consentimento** | Coleta explícita no primeiro acesso |
| **Finalidade** | Processamento apenas para auxílio administrativo |
| **Necessidade** | Mínimo de dados necessário para operação |
| **Acesso** | Logs de auditoria de todas as consultas |
| **Retenção** | Política de retenção de 5 anos (administrativo) |
| **Eliminação** | Procedimento de anonimização |

### INDACT e SISP

- Conformidade com normas de segurança da informação
- Criptografia em trânsito (TLS 1.3) e repouso (AES-256)
- Isolamento de dados por órgão (schema PostgreSQL)
- Controle de acesso baseado em perfil SIAPE

### Auditoria e Transparência

```typescript
// Todos os eventos são registrados:
interface AuditRecord {
  timestamp: DateTime;      // Quando ocorreu
  usuario: string;          // Quem executou
  matricula: string;        // Identificação no SIAPE
  orgao: string;            // Órgão de lotação
  acao: string;             // O que foi feito
  agente: string;           // Qual agente foi usado
  input: JSON;              // Entrada (sanitizada)
  output: JSON;             // Saída
  ipAddress: string;        // Origem da requisição
  sessionId: string;        // Sessão para rastreabilidade
}
```

---

## Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         XPERT-GOV SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│  COORDINATOR                                                            │
│  ├─ Roteamento inteligente por intenção                                 │
│  ├─ Controle de acesso baseado em perfil SIAPE                          │
│  ├─ Contexto persistente (Memory)                                       │
│  └─ Audit trail completo                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  SUBAGENTES (8 especialistas)                                           │
│  ├─ juridico-agent       → Legislação, normas, pareceres                │
│  ├─ admin-sei-agent      → Gestão documental SEI                        │
│  ├─ rh-agent             → SIAPE, diárias, benefícios                   │
│  ├─ licitacao-agent      → Compras, contratos, licitações               │
│  ├─ orcamento-agent      → Empenhos, créditos, SIAFI                    │
│  ├─ atendimento-agent    → e-SIC, Ouvidoria, LAI                        │
│  ├─ documentos-agent     → Ofícios, memos, normas gráficas              │
│  └─ auditoria-agent      → TCU, CGU, compliance                         │
├─────────────────────────────────────────────────────────────────────────┤
│  WORKFLOWS                                                              │
│  ├─ tramitacao-sei                                                      │
│  ├─ diarias                                                             │
│  ├─ licitacao-conformidade                                              │
│  └─ resposta-auditoria                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  TOOLS (25+ integrações)                                                │
│  ├─ Sistemas: SEI, SIAPE, Compras.gov.br, SIAFI                         │
│  ├─ Dados: Legislação, Jurisprudência, Fornecedores                     │
│  └─ Produtividade: Gerar documentos, Validar normas                     │
├─────────────────────────────────────────────────────────────────────────┤
│  INFRAESTRUTURA MASTRA                                                  │
│  ├─ Storage: PostgreStore (schemas por órgão)                           │
│  ├─ Memory: Memória conversacional + working memory                     │
│  ├─ Vector: PgVector (preparação para RAG)                              │
│  ├─ Observability: Traces + Audit Exporter                              │
│  └─ Evals: Conformidade, Clareza, Segurança                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Próximos Passos Imediatos

1. **Validar arquitetura proposta** com stakeholders
2. **Definir prioridade de órgãos** para pilotos
3. **Verificar disponibilidade de APIs** (SEI, SIAPE, Compras)
4. **Configurar ambiente de desenvolvimento** com PostgreSQL
5. **Implementar os 3 primeiros agentes** (admin-sei, documentos, atendimento)
6. **Criar testes de integração** com sistemas governamentais

---

## Atualização: MVP SERPRO

**NOVO DOCUMENTO DE PLANEJAMENTO:** `docs/xpert-gov-mvp-serpro.md`

Este documento contém a arquitetura completa e de longo prazo. Para o **MVP imediato com o SERPRO**, consulte o documento específico que define:

- Foco em **Chain of Thought (CoT)** primeiro, **RAG depois**
- **Integrações gov (SEI, SIAPE, etc) adiadas** para fase 2
- **4 subagentes genéricos** (analyst, writer, research, doc-processor)
- **Tools de arquivo, web e análise** desde o início
- **Plano de 16 semanas** detalhado

### Decisões do MVP

| Aspecto | Decisão |
|---------|---------|
| **Cliente** | SERPRO |
| **Usuários** | Gestores e servidores de áreas administrativa, financeira e RH |
| **Integrações Gov** | ❌ Não no MVP (SEI, SIAPE, etc) |
| **RAG** | ✅ Sim, mas após CoT funcionando |
| **Prioridade** | Chat inteligente com CoT → auto-correção → entrega em arquivos |

---

*Documento elaborado para evolução da arquitetura Xpert-Gov no framework Mastra.*
