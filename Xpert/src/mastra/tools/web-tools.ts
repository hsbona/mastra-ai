/**
 * Web Tools - Versão Agnóstica
 * 
 * Ferramentas para busca na web, extração de conteúdo e cálculos.
 * 
 * Padrão: createAgnosticTool para compatibilidade com múltiplos LLMs
 */

import { z } from 'zod';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import * as math from 'mathjs';
import { search, SafeSearchType } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';
import { createAgnosticTool } from './agnostic';

// ============================================
// Tool 1: webSearchTool - Busca na web via DuckDuckGo
// ============================================
function normalizeSearchInput(input: unknown): { query: string; maxResults: number } {
  if (typeof input !== 'object' || input === null) {
    return { query: '', maxResults: 5 };
  }
  const obj = input as Record<string, unknown>;
  
  const query = typeof obj.query === 'string' ? obj.query :
               typeof obj.q === 'string' ? obj.q :
               typeof obj.search === 'string' ? obj.search : '';
  
  let maxResults = 5;
  if (typeof obj.maxResults === 'number') {
    maxResults = obj.maxResults;
  } else if (typeof obj.maxResults === 'string') {
    maxResults = parseInt(obj.maxResults, 10) || 5;
  } else if (typeof obj.limit === 'number') {
    maxResults = obj.limit;
  } else if (typeof obj.limit === 'string') {
    maxResults = parseInt(obj.limit, 10) || 5;
  }
  
  return { query, maxResults: Math.min(maxResults, 10) };
}

export const webSearchTool = createAgnosticTool({
  id: 'web-search',
  name: 'Web Search',
  description: 'Search the web using DuckDuckGo and return relevant results',
  inputSchema: z.record(z.any()),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })
    ),
    totalResults: z.number(),
    query: z.string(),
  }),
  execute: async (rawInput) => {
    const { query, maxResults } = normalizeSearchInput(rawInput);
    
    if (!query) {
      return {
        results: [],
        totalResults: 0,
        query: '',
      };
    }
    
    try {
      const searchResults = await search(query, {
        safeSearch: SafeSearchType.OFF,
      });
      
      const limitedResults = searchResults.results.slice(0, Math.min(maxResults, 10));

      const results = limitedResults.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
      }));

      return {
        results,
        totalResults: results.length,
        query,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate')) {
        return {
          results: [],
          totalResults: 0,
          query,
          error: 'Rate limit exceeded. Please wait a moment before trying again.',
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        results: [],
        totalResults: 0,
        query,
        error: `Web search failed: ${errorMessage}`,
      };
    }
  },
});

// ============================================
// Tool 2: fetchURLTool - Extrai conteúdo de uma URL
// ============================================
function normalizeFetchInput(input: unknown): { url: string } {
  if (typeof input !== 'object' || input === null) {
    return { url: '' };
  }
  const obj = input as Record<string, unknown>;
  
  const url = typeof obj.url === 'string' ? obj.url :
             typeof obj.link === 'string' ? obj.link :
             typeof obj.href === 'string' ? obj.href : '';
  
  return { url };
}

export const fetchURLTool = createAgnosticTool({
  id: 'fetch-url',
  name: 'Fetch URL',
  description: 'Fetch and extract clean text content from a URL',
  inputSchema: z.record(z.any()),
  outputSchema: z.object({
    title: z.string(),
    metaDescription: z.string(),
    content: z.string(),
    url: z.string(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const { url } = normalizeFetchInput(rawInput);
    
    if (!url) {
      return {
        title: '',
        metaDescription: '',
        content: '',
        url: '',
        error: 'URL não fornecida',
      };
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          title: '',
          metaDescription: '',
          content: '',
          url,
          error: `HTTP error! status: ${response.status}`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      $('script, style, nav, footer, header, aside, .advertisement, .ads, .social-share, .comments').remove();

      const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';

      const metaDescription = $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

      let content = '';
      
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        '#content',
        '#main-content',
        '.entry-content',
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length && element.text().trim().length > content.length) {
          content = element.text().trim();
        }
      }

      if (!content) {
        content = $('body').text().trim();
      }

      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      return {
        title,
        metaDescription: metaDescription.trim(),
        content: content.slice(0, 50000),
        url,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          title: '',
          metaDescription: '',
          content: '',
          url,
          error: 'Request timeout: URL took longer than 10 seconds to load',
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        title: '',
        metaDescription: '',
        content: '',
        url,
        error: `Failed to fetch URL: ${errorMessage}`,
      };
    }
  },
});

// ============================================
// Tool 3: summarizeContentTool - Resume conteúdo usando LLM
// ============================================
function normalizeSummarizeInput(input: unknown): { 
  content: string; 
  style: 'executive' | 'detailed' | 'bullet'; 
  maxLength?: number;
} {
  if (typeof input !== 'object' || input === null) {
    return { content: '', style: 'detailed' };
  }
  const obj = input as Record<string, unknown>;
  
  const content = typeof obj.content === 'string' ? obj.content :
                 typeof obj.text === 'string' ? obj.text : '';
  
  let style: 'executive' | 'detailed' | 'bullet' = 'detailed';
  if (obj.style === 'executive' || obj.style === 'detailed' || obj.style === 'bullet') {
    style = obj.style;
  }
  
  const maxLength = typeof obj.maxLength === 'number' ? obj.maxLength :
                   typeof obj.maxLength === 'string' ? parseInt(obj.maxLength, 10) || undefined :
                   undefined;
  
  return { content, style, maxLength };
}

export const summarizeContentTool = createAgnosticTool({
  id: 'summarize-content',
  name: 'Summarize Content',
  description: 'Summarize text content using AI with different styles',
  inputSchema: z.record(z.any()),
  outputSchema: z.object({
    summary: z.string(),
    style: z.enum(['executive', 'detailed', 'bullet']),
    originalLength: z.number(),
    summaryLength: z.number(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const { content, style, maxLength } = normalizeSummarizeInput(rawInput);
    
    if (!content) {
      return {
        summary: '',
        style,
        originalLength: 0,
        summaryLength: 0,
        error: 'Conteúdo não fornecido para sumarização',
      };
    }
    
    try {
      const originalLength = content.length;

      const stylePrompts = {
        executive: 'Provide a concise executive summary (2-3 sentences) highlighting key points and conclusions:',
        detailed: 'Provide a detailed summary covering main points, arguments, and conclusions:',
        bullet: 'Provide a bullet-point summary of key points (5-7 bullets):',
      };

      const prompt = `${stylePrompts[style]}

Content to summarize:
${content.slice(0, 15000)}${content.length > 15000 ? '\n\n[Content truncated due to length]' : ''}

Summary:`;

      const result = await generateText({
        model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
        prompt,
        temperature: 0.3,
      });

      let summary = result.text.trim();

      if (maxLength && summary.length > maxLength) {
        summary = summary.slice(0, maxLength).trim() + '...';
      }

      return {
        summary,
        style,
        originalLength,
        summaryLength: summary.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        summary: '',
        style,
        originalLength: content.length,
        summaryLength: 0,
        error: `Summarization failed: ${errorMessage}`,
      };
    }
  },
});

// ============================================
// Tool 4: calculateTool - Calcula expressões matemáticas
// ============================================
function normalizeCalculateInput(input: unknown): { 
  expression: string; 
  variables: Record<string, number>;
} {
  if (typeof input !== 'object' || input === null) {
    return { expression: '', variables: {} };
  }
  const obj = input as Record<string, unknown>;
  
  const expression = typeof obj.expression === 'string' ? obj.expression :
                    typeof obj.expr === 'string' ? obj.expr :
                    typeof obj.calc === 'string' ? obj.calc : '';
  
  let variables: Record<string, number> = {};
  if (typeof obj.variables === 'object' && obj.variables !== null) {
    const vars = obj.variables as Record<string, unknown>;
    for (const [key, val] of Object.entries(vars)) {
      if (typeof val === 'number') {
        variables[key] = val;
      } else if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          variables[key] = num;
        }
      }
    }
  }
  
  return { expression, variables };
}

export const calculateTool = createAgnosticTool({
  id: 'calculate',
  name: 'Calculate',
  description: 'Evaluate mathematical expressions with optional variables using mathjs',
  inputSchema: z.record(z.any()),
  outputSchema: z.object({
    result: z.union([z.number(), z.string()]),
    steps: z.array(z.string()),
    expression: z.string(),
    error: z.string().optional(),
  }),
  execute: async (rawInput) => {
    const { expression, variables } = normalizeCalculateInput(rawInput);
    
    if (!expression) {
      return {
        result: 0,
        steps: ['Error: No expression provided'],
        expression: '',
        error: 'Expressão matemática não fornecida',
      };
    }
    
    const steps: string[] = [];

    try {
      steps.push(`Input expression: ${expression}`);
      
      if (Object.keys(variables).length > 0) {
        steps.push(`Variables: ${JSON.stringify(variables)}`);
      }

      const scope: Record<string, number> = { ...variables };

      const parsed = math.parse(expression);
      const compiled = parsed.compile();
      const result = compiled.evaluate(scope);

      steps.push('Expression parsed successfully');
      steps.push(`Result computed: ${result}`);

      let finalResult: number | string;
      
      if (typeof result === 'number') {
        finalResult = result;
      } else if (math.isBigNumber(result)) {
        finalResult = result.toNumber();
      } else if (math.isFraction(result)) {
        finalResult = result.valueOf() as number;
      } else if (math.isComplex(result)) {
        finalResult = `${result.re} + ${result.im}i`;
      } else if (Array.isArray(result)) {
        finalResult = JSON.stringify(result);
      } else {
        finalResult = String(result);
      }

      return {
        result: finalResult,
        steps,
        expression,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      steps.push(`Error: ${errorMessage}`);

      if (errorMessage.includes('Undefined symbol')) {
        return {
          result: 0,
          steps,
          expression,
          error: `Unknown variable in expression: ${errorMessage}. Please define all variables in the variables parameter.`,
        };
      }
      
      if (errorMessage.includes('Unexpected') || errorMessage.includes('parse')) {
        return {
          result: 0,
          steps,
          expression,
          error: `Invalid mathematical expression: ${errorMessage}`,
        };
      }

      return {
        result: 0,
        steps,
        expression,
        error: `Calculation failed: ${errorMessage}`,
      };
    }
  },
});
