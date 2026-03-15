/**
 * Schema Helpers - LLM Agnósticos
 * 
 * Helpers Zod para tornar tools compatíveis com diferentes LLMs.
 */

import { z } from 'zod';

/**
 * Campo opcional que aceita null/undefined → converte para undefined.
 * O Zod trata undefined como "não fornecido" para campos opcionais.
 */
export function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (val) => {
      // Converte null ou string vazia para undefined
      if (val === null || val === '') return undefined;
      return val;
    },
    schema.optional()
  );
}

/**
 * Número que aceita string (ex: "10" → 10).
 * Retorna undefined se não fornecido.
 */
export function coerceNumber() {
  return z.union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? Number(val) : val))
    .pipe(z.number())
    .optional();
}

/**
 * Número com valor padrão.
 */
export function coerceNumberWithDefault(defaultValue: number) {
  return z.preprocess(
    (val) => {
      if (val === null || val === '' || val === undefined) return defaultValue;
      return typeof val === 'string' ? Number(val) : val;
    },
    z.number().default(defaultValue)
  );
}

/**
 * Booleano que aceita string ("true", "false").
 * Retorna undefined se não fornecido.
 */
export function coerceBoolean() {
  return z.union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val.toLowerCase() === 'true';
    })
    .pipe(z.boolean())
    .optional();
}

/**
 * Booleano com valor padrão.
 */
export function coerceBooleanWithDefault(defaultValue: boolean) {
  return z.preprocess(
    (val) => {
      if (val === null || val === '' || val === undefined) return defaultValue;
      if (typeof val === 'boolean') return val;
      return val.toLowerCase() === 'true';
    },
    z.boolean().default(defaultValue)
  );
}

/**
 * String ou array.
 */
export function stringOrArray() {
  return z.union([z.string(), z.array(z.string())])
    .transform((val) => Array.isArray(val) ? val : [val]);
}

/**
 * Pattern opcional (para listFiles) - aceita null, string ou array.
 */
export function optionalPattern() {
  return z.preprocess(
    (val) => {
      if (val === null || val === '' || val === undefined) return undefined;
      return val;
    },
    stringOrArray().optional()
  );
}
