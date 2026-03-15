/**
 * Agnostic Tool Factory
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export type AgnosticToolConfig<TInput, TOutput> = {
  id: string;
  name?: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  execute: (input: TInput) => Promise<TOutput> | TOutput;
};

export function createAgnosticTool<TInput, TOutput>({
  id,
  name,
  description,
  inputSchema,
  outputSchema,
  execute,
}: AgnosticToolConfig<TInput, TOutput>) {
  return createTool({
    id,
    name: name || id,
    description,
    inputSchema,
    outputSchema,
    execute: async (inputData) => {
      console.log(`[${id}] Input:`, JSON.stringify(inputData, null, 2));
      try {
        const result = await execute(inputData as TInput);
        console.log(`[${id}] Success`);
        return result;
      } catch (error) {
        console.error(`[${id}] Error:`, error);
        throw error;
      }
    },
  });
}
