/**
 * Sistema RAG (Retrieval-Augmented Generation)
 * 
 * Pipeline completo: document loading → chunking → embedding → vector storage → semantic search
 * 
 * PROVEDOR AGNÓSTICO: O provedor de embeddings pode ser trocado via:
 * - Variável de ambiente: EMBEDDING_PROVIDER=openrouter|openai|cohere
 * - Código: createEmbeddingProvider({ type: 'openrouter' })
 */

import { MDocument } from '@mastra/rag';
import { pgVector } from '../vector-store';
import { readFileSync } from 'fs';
import { readPDFTool, readDOCXTool } from '../tools/file-tools';
import * as path from 'path';
import type { EmbeddingProvider } from './embeddings';
import { createEmbeddingProvider, getDefaultProvider } from './embeddings';

// ============================================
// CONFIGURAÇÃO
// ============================================

/** Provider de embeddings (lazy singleton) - troque via EMBEDDING_PROVIDER env var */
let embeddingProvider: EmbeddingProvider | null = null;

/** 
 * Retorna o provider de embeddings (lazy initialization)
 * Garante que as env vars estejam carregadas antes de criar o provider
 */
function getProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = getDefaultProvider();
  }
  return embeddingProvider;
}

/** 
 * Dimensão dos embeddings (obtida do provider configurado)
 * Usa getter para lazy evaluation
 */
const getEmbeddingDimension = (): number => getProvider().config.dimensions;

/** Tamanho máximo de cada chunk (em caracteres) */
const CHUNK_SIZE = 1000;

/** Overlap entre chunks (em caracteres) */
const CHUNK_OVERLAP = 200;

/** Métrica de similaridade para o vector store */
const SIMILARITY_METRIC: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    title?: string;
    page?: number;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface RAGQueryResult {
  chunk: DocumentChunk;
  score: number;
}

export interface ProcessedDocument {
  text: string;
  metadata: {
    source: string;
    title?: string;
    pages?: number;
    fileName: string;
    fileType: string;
  };
}

export interface IndexResult {
  chunksIndexed: number;
  documentId: string;
  indexName: string;
}

// ============================================
// FUNÇÕES DE PROCESSAMENTO DE DOCUMENTOS
// ============================================

/**
 * Extrai texto de arquivos (PDF, DOCX, TXT)
 * 
 * @param filePath - Caminho do arquivo (relativo à pasta workspace/ ou caminho absoluto)
 * @returns Texto extraído e metadata do documento
 */
export async function processDocument(filePath: string): Promise<ProcessedDocument> {
  // Se for caminho absoluto, usa diretamente; senão, assume que está em ./workspace
  const resolvedPath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join('./workspace', filePath);
  
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  switch (ext) {
    case '.pdf':
      return extractFromPDF(resolvedPath, fileName);
    
    case '.docx':
    case '.doc':
      return extractFromDOCX(resolvedPath, fileName);
    
    case '.txt':
    case '.md':
    case '.json':
    case '.csv':
      return extractFromTXT(resolvedPath, fileName, ext);
    
    default:
      throw new Error(`Tipo de arquivo não suportado: ${ext}. Use PDF, DOCX, TXT, MD, JSON ou CSV.`);
  }
}

/**
 * Extrai texto de arquivos PDF
 */
async function extractFromPDF(filePath: string, fileName: string): Promise<ProcessedDocument> {
  if (!readPDFTool.execute) {
    throw new Error('readPDFTool.execute não disponível');
  }
  const result = await readPDFTool.execute({ 
    filePath: path.relative('./workspace', filePath) 
  }, {} as any);
  
  if (!result.success) {
    throw new Error(`Erro ao ler PDF: ${result.error}`);
  }
  
  return {
    text: result.text,
    metadata: {
      source: filePath,
      fileName,
      fileType: 'pdf',
      pages: result.metadata.totalPages,
    },
  };
}

/**
 * Extrai texto de arquivos DOCX
 */
async function extractFromDOCX(filePath: string, fileName: string): Promise<ProcessedDocument> {
  if (!readDOCXTool.execute) {
    throw new Error('readDOCXTool.execute não disponível');
  }
  const result = await readDOCXTool.execute({ 
    filePath: path.relative('./workspace', filePath) 
  }, {} as any);
  
  if (!result.success) {
    throw new Error(`Erro ao ler DOCX: ${result.error}`);
  }
  
  // Extrair título dos headings se disponível
  const title = result.headings.find((h: { level: number; text: string }) => h.level === 1)?.text;
  
  return {
    text: result.text,
    metadata: {
      source: filePath,
      title,
      fileName,
      fileType: 'docx',
    },
  };
}

/**
 * Extrai texto de arquivos TXT/MD/JSON/CSV
 */
async function extractFromTXT(
  filePath: string, 
  fileName: string, 
  ext: string
): Promise<ProcessedDocument> {
  const text = readFileSync(filePath, 'utf-8');
  
  // Para JSON, converter para string formatada
  const processedText = ext === '.json' 
    ? JSON.stringify(JSON.parse(text), null, 2)
    : text;
  
  return {
    text: processedText,
    metadata: {
      source: filePath,
      fileName,
      fileType: ext.replace('.', ''),
    },
  };
}

// ============================================
// FUNÇÕES DE CHUNKING
// ============================================

/**
 * Divide texto em chunks com overlap usando estratégia recursiva
 * 
 * @param text - Texto a ser dividido
 * @param source - Fonte do documento
 * @param title - Título opcional do documento
 * @param maxChunkSize - Tamanho máximo do chunk (padrão: CHUNK_SIZE)
 * @param overlap - Overlap entre chunks (padrão: CHUNK_OVERLAP)
 * @returns Array de chunks documentados
 */
export async function chunkDocument(
  text: string,
  source: string,
  title?: string,
  maxChunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): Promise<DocumentChunk[]> {
  // Criar documento Mastra RAG
  const doc = MDocument.fromText(text, { source, title });
  
  // Chunking recursivo com overlap
  await doc.chunk({
    strategy: 'recursive',
    maxSize: maxChunkSize,
    overlap: overlap,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ' '],
    stripWhitespace: true,
  });
  
  // Obter chunks processados
  const chunks = doc.getDocs();
  const totalChunks = chunks.length;
  
  // Mapear para o formato DocumentChunk
  return chunks.map((chunk, index) => ({
    id: `${path.basename(source)}_chunk_${index}`,
    content: chunk.text,
    metadata: {
      source,
      title,
      chunkIndex: index,
      totalChunks,
      ...chunk.metadata,
    },
  }));
}

// ============================================
// FUNÇÕES DE EMBEDDING (Provider Agnóstico)
// ============================================

/**
 * Gera embeddings para múltiplos textos usando o provider configurado
 * 
 * O provider é determinado pela variável EMBEDDING_PROVIDER ou 
 * pode ser sobrescrito via createEmbeddingProvider()
 * 
 * @param texts - Array de textos para gerar embeddings
 * @returns Array de embeddings (vetores numéricos)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return getProvider().generateEmbeddings(texts);
}

/**
 * Gera embedding para um único texto usando o provider configurado
 * 
 * @param text - Texto para gerar embedding
 * @returns Vetor de embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return getProvider().generateEmbedding(text);
}

/**
 * Retorna o provider de embeddings atual
 * Útil para verificar configuração ou trocar dinamicamente
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  return getProvider();
}

// ============================================
// FUNÇÕES DE INDEXAÇÃO
// ============================================

/**
 * Cria um índice no PgVector se não existir
 * 
 * @param indexName - Nome do índice
 */
export async function ensureIndex(indexName: string): Promise<void> {
  const indexes = await pgVector.listIndexes();
  
  if (!indexes.includes(indexName)) {
    await pgVector.createIndex({
      indexName,
      dimension: getEmbeddingDimension(),
      metric: SIMILARITY_METRIC,
      indexConfig: { type: 'hnsw', hnsw: { m: 16, efConstruction: 64 } },
      metadataIndexes: ['source', 'title', 'chunkIndex'],
    });
  }
}

/**
 * Indexa um documento completo no vector store
 * 
 * Pipeline: process → chunk → embed → upsert
 * 
 * @param filePath - Caminho do arquivo a ser indexado
 * @param indexName - Nome do índice (padrão: 'default')
 * @returns Resultado da indexação
 */
export async function indexDocument(
  filePath: string,
  indexName: string = 'default'
): Promise<IndexResult> {
  // 1. Extrair texto do arquivo
  const document = await processDocument(filePath);
  
  // 2. Dividir em chunks
  const chunks = await chunkDocument(
    document.text,
    document.metadata.source,
    document.metadata.title
  );
  
  if (chunks.length === 0) {
    throw new Error('Nenhum chunk gerado do documento');
  }
  
  // 3. Garantir que o índice existe
  await ensureIndex(indexName);
  
  // 4. Gerar embeddings para todos os chunks
  const embeddings = await generateEmbeddings(chunks.map(c => c.content));
  
  // 5. Preparar metadata para upsert
  const metadata = chunks.map(chunk => ({
    text: chunk.content,
    source: chunk.metadata.source,
    title: chunk.metadata.title,
    chunkIndex: chunk.metadata.chunkIndex,
    totalChunks: chunk.metadata.totalChunks,
  }));
  
  // 6. Upsert no PgVector
  await pgVector.upsert({
    indexName,
    vectors: embeddings,
    metadata,
    ids: chunks.map(c => c.id),
  });
  
  // Gerar ID único do documento
  const documentId = `${path.basename(filePath)}_${Date.now()}`;
  
  return {
    chunksIndexed: chunks.length,
    documentId,
    indexName,
  };
}

// ============================================
// FUNÇÕES DE CONSULTA (QUERY)
// ============================================

/**
 * Realiza busca semântica na base RAG
 * 
 * @param query - Query de busca em linguagem natural
 * @param indexName - Nome do índice a consultar (padrão: 'default')
 * @param topK - Número de resultados a retornar (padrão: 5)
 * @param minScore - Score mínimo de relevância (padrão: 0)
 * @returns Resultados da busca com scores de relevância
 */
export async function queryRAG(
  query: string,
  indexName: string = 'default',
  topK: number = 5,
  minScore: number = 0
): Promise<RAGQueryResult[]> {
  // 1. Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Buscar similaridade no PgVector
  const results = await pgVector.query({
    indexName,
    queryVector: queryEmbedding,
    topK,
    minScore,
    includeVector: false,
  });
  
  // 3. Mapear resultados para RAGQueryResult
  return results.map(result => {
    const metadata = result.metadata || {};
    
    const chunk: DocumentChunk = {
      id: result.id,
      content: metadata.text || '',
      metadata: {
        source: metadata.source || '',
        title: metadata.title,
        chunkIndex: metadata.chunkIndex || 0,
        totalChunks: metadata.totalChunks || 0,
      },
    };
    
    return {
      chunk,
      score: result.score,
    };
  });
}

/**
 * Realiza busca semântica com filtro de metadata
 * 
 * @param query - Query de busca
 * @param filter - Filtro de metadata (ex: { source: 'arquivo.pdf' })
 * @param indexName - Nome do índice
 * @param topK - Número de resultados
 * @returns Resultados filtrados
 */
export async function queryRAGWithFilter(
  query: string,
  filter: Record<string, any>,
  indexName: string = 'default',
  topK: number = 5
): Promise<RAGQueryResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = await pgVector.query({
    indexName,
    queryVector: queryEmbedding,
    topK,
    filter,
    includeVector: false,
  });
  
  return results.map(result => {
    const metadata = result.metadata || {};
    
    return {
      chunk: {
        id: result.id,
        content: metadata.text || '',
        metadata: {
          source: metadata.source || '',
          title: metadata.title,
          chunkIndex: metadata.chunkIndex || 0,
          totalChunks: metadata.totalChunks || 0,
        },
      },
      score: result.score,
    };
  });
}

// ============================================
// FUNÇÕES DE GERENCIAMENTO DE ÍNDICES
// ============================================

/**
 * Lista todos os índices disponíveis no PgVector
 * 
 * @returns Array com nomes dos índices
 */
export async function listIndexes(): Promise<string[]> {
  return await pgVector.listIndexes();
}

/**
 * Obtém estatísticas de um índice
 * 
 * @param indexName - Nome do índice
 * @returns Estatísticas do índice
 */
export async function describeIndex(indexName: string) {
  return await pgVector.describeIndex({ indexName });
}

/**
 * Deleta um índice completo do PgVector
 * 
 * @param indexName - Nome do índice a deletar
 */
export async function deleteIndex(indexName: string): Promise<void> {
  await pgVector.deleteIndex({ indexName });
}

/**
 * Deleta vetores de um documento específico
 * 
 * @param source - Caminho/fonte do documento
 * @param indexName - Nome do índice
 */
export async function deleteDocumentVectors(
  source: string,
  indexName: string = 'default'
): Promise<void> {
  await pgVector.deleteVectors({
    indexName,
    filter: { source },
  });
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Verifica se um índice existe
 * 
 * @param indexName - Nome do índice
 * @returns true se existe, false caso contrário
 */
export async function indexExists(indexName: string): Promise<boolean> {
  const indexes = await pgVector.listIndexes();
  return indexes.includes(indexName);
}

/**
 * Conta o número de vetores em um índice
 * 
 * @param indexName - Nome do índice
 * @returns Número de vetores
 */
export async function countVectors(indexName: string): Promise<number> {
  const stats = await pgVector.describeIndex({ indexName });
  return stats.count;
}

// ============================================
// RE-EXPORTS DO SISTEMA DE EMBEDDINGS
// ============================================

export type {
  // Interfaces
  EmbeddingProvider,
  EmbeddingConfig,
  ProviderType,
  ProviderFactoryConfig,
} from './embeddings';

export {
  // Factory
  createEmbeddingProvider,
  getDefaultProvider,
  checkProviderAvailability,
  
  // Implementações específicas
  OpenRouterEmbeddingProvider,
  createOpenRouterProvider,
  MockEmbeddingProvider,
  createMockProvider,
} from './embeddings';

// ============================================
// EXPORT DO PGVECTOR (para scripts externos)
// ============================================

export { pgVector } from '../vector-store';
