import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import * as math from 'mathjs';
import { search, SafeSearchType } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';

// ============================================
// Tool 1: webSearchTool - Busca na web via DuckDuckGo
// ============================================
export const webSearchTool = createTool({
  id: 'web-search',
  description: 'Search the web using DuckDuckGo and return relevant results',
  inputSchema: z.object({
    query: z.string().describe('Search query string'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results to return (default: 5)'),
  }),
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
  execute: async ({ query, maxResults = 5 }) => {
    try {
      const searchResults = await search(query, {
        safeSearch: SafeSearchType.OFF,
        maxResults: Math.min(maxResults, 10), // Limit to max 10
      });

      const results = searchResults.results.map((result) => ({
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
      // Handle rate limiting gracefully
      if (error instanceof Error && error.message.includes('rate')) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      }
      
      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Web search failed: ${errorMessage}`);
    }
  },
});

// ============================================
// Tool 2: fetchURLTool - Extrai conteúdo de uma URL
// ============================================
export const fetchURLTool = createTool({
  id: 'fetch-url',
  description: 'Fetch and extract clean text content from a URL',
  inputSchema: z.object({
    url: z.string().url().describe('URL to fetch and extract content from'),
  }),
  outputSchema: z.object({
    title: z.string(),
    metaDescription: z.string(),
    content: z.string(),
    url: z.string(),
  }),
  execute: async ({ url }) => {
    try {
      // Fetch with 10 second timeout
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, .advertisement, .ads, .social-share, .comments').remove();

      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';

      // Extract meta description
      const metaDescription = $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

      // Extract main content - prioritize main content areas
      let content = '';
      
      // Try to find main content containers
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

      // Fallback to body if no content found
      if (!content) {
        content = $('body').text().trim();
      }

      // Clean up whitespace
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      return {
        title,
        metaDescription: metaDescription.trim(),
        content: content.slice(0, 50000), // Limit content size
        url,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: URL took longer than 10 seconds to load');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch URL: ${errorMessage}`);
    }
  },
});

// ============================================
// Tool 3: summarizeContentTool - Resume conteúdo usando LLM
// ============================================
export const summarizeContentTool = createTool({
  id: 'summarize-content',
  description: 'Summarize text content using AI with different styles',
  inputSchema: z.object({
    content: z.string().describe('Content to summarize'),
    style: z.enum(['executive', 'detailed', 'bullet']).default('detailed').describe('Summary style'),
    maxLength: z.number().optional().describe('Maximum length of summary in characters'),
  }),
  outputSchema: z.object({
    summary: z.string(),
    style: z.enum(['executive', 'detailed', 'bullet']),
    originalLength: z.number(),
    summaryLength: z.number(),
  }),
  execute: async ({ content, style = 'detailed', maxLength }) => {
    try {
      const originalLength = content.length;

      // Define prompts based on style
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
        maxTokens: maxLength ? Math.min(Math.ceil(maxLength / 4), 2000) : 1000,
      });

      let summary = result.text.trim();

      // Apply maxLength constraint if provided
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
      throw new Error(`Summarization failed: ${errorMessage}`);
    }
  },
});

// ============================================
// Tool 4: calculateTool - Calcula expressões matemáticas
// ============================================
export const calculateTool = createTool({
  id: 'calculate',
  description: 'Evaluate mathematical expressions with optional variables using mathjs',
  inputSchema: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "x * y")'),
    variables: z.record(z.number()).optional().describe('Optional variables to use in the expression (e.g., {x: 5, y: 10})'),
  }),
  outputSchema: z.object({
    result: z.union([z.number(), z.string()]),
    steps: z.array(z.string()),
    expression: z.string(),
  }),
  execute: async ({ expression, variables = {} }) => {
    const steps: string[] = [];

    try {
      steps.push(`Input expression: ${expression}`);
      
      if (Object.keys(variables).length > 0) {
        steps.push(`Variables: ${JSON.stringify(variables)}`);
      }

      // Configure mathjs with limited scope for safety
      const scope: Record<string, number> = { ...variables };

      // Parse and evaluate the expression
      const parsed = math.parse(expression);
      const compiled = parsed.compile();
      const result = compiled.evaluate(scope);

      steps.push('Expression parsed successfully');
      steps.push(`Result computed: ${result}`);

      // Handle different result types
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
      
      // Add error info to steps
      steps.push(`Error: ${errorMessage}`);

      // Provide helpful error messages for common issues
      if (errorMessage.includes('Undefined symbol')) {
        throw new Error(`Unknown variable in expression: ${errorMessage}. Please define all variables in the variables parameter.`);
      }
      
      if (errorMessage.includes('Unexpected') || errorMessage.includes('parse')) {
        throw new Error(`Invalid mathematical expression: ${errorMessage}`);
      }

      throw new Error(`Calculation failed: ${errorMessage}`);
    }
  },
});
