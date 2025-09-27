/**
 * @module SchemaUtils
 * @description Utilities for working with JSON Schema and Zod validation
 * 
 * This module provides functions for converting JSON Schema to Zod validators
 * and validating data against JSON Schema definitions.
 */

import { jsonSchemaToZod } from 'json-schema-to-zod';
import { z, ZodTypeAny } from 'zod';

/**
 * Validates data against a JSON Schema definition
 * 
 * This function converts a JSON Schema to a Zod validator and uses it to
 * validate the provided data. It returns a SafeParseReturnType that contains
 * either the validated data or validation errors.
 * 
 * @param schema - JSON Schema definition
 * @param data - Data to validate against the schema
 * @returns A SafeParseReturnType containing either the validated data or validation errors
 * 
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number', minimum: 0 }
 *   },
 *   required: ['name']
 * };
 * 
 * const result = validateWithSchema<User>(userSchema, {
 *   name: 'John Doe',
 *   age: 30
 * });
 * 
 * if (result.success) {
 *   // Use the validated data
 *   console.log('Valid user:', result.data);
 * } else {
 *   // Handle validation errors
 *   console.error('Invalid user:', result.error);
 * }
 * ```
 */
export function validateWithSchema<T>(
  schema: Record<string, any>, 
  data: unknown
): z.SafeParseReturnType<unknown, T> {
  const zodSchema = jsonSchemaToZod(schema, { module: 'cjs' });
  const validator = z.object(zodSchema as unknown as Record<string, ZodTypeAny>);
  return validator.safeParse(data) as z.SafeParseReturnType<unknown, T>;
}

/**
 * Creates a reusable validator from a JSON Schema definition
 * 
 * This function converts a JSON Schema to a Zod validator and returns an object
 * with a validate function and the schema. The validate function can be used to
 * validate data against the schema multiple times without recreating the validator.
 * 
 * @param schema - JSON Schema definition
 * @returns An object with a validate function and the Zod schema
 * 
 * @example
 * ```typescript
 * // Create a reusable validator
 * const userValidator = createValidator<User>({
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     email: { type: 'string', format: 'email' },
 *     age: { type: 'number', minimum: 18 }
 *   },
 *   required: ['name', 'email']
 * });
 * 
 * // Validate multiple users
 * const user1Result = userValidator.validate({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   age: 25
 * });
 * 
 * const user2Result = userValidator.validate({
 *   name: 'Jane Smith',
 *   email: 'jane@example.com',
 *   age: 30
 * });
 * 
 * // You can also access the Zod schema directly
 * type UserType = z.infer<typeof userValidator.schema>;
 * ```
 */
export function createValidator<T>(schema: Record<string, any>) {
  const zodSchema = jsonSchemaToZod(schema, { module: 'cjs' });
  const validator = z.object(zodSchema as unknown as Record<string, ZodTypeAny>);
  
  return {
    validate: (data: unknown) => validator.safeParse(data) as z.SafeParseReturnType<unknown, T>,
    schema: validator
  };
}
