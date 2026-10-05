import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStrictDateTime } from '../canonical/date-time.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function loadSchema(name) {
  return JSON.parse(await fs.readFile(path.resolve(here, '../../schemas', `${name}.schema.json`), 'utf8'));
}

export function validate(schema, data) {
  const errors = [];

  function walk(current, value, pointer, root) {
    if (current.$ref) {
      const target = current.$ref.split('/').slice(1).reduce((object, key) => object[key], root);
      walk(target, value, pointer, root);
      return;
    }

    if (current.type) {
      const allowed = Array.isArray(current.type) ? current.type : [current.type];
      const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      if (!allowed.includes(actual)) {
        errors.push(`${pointer} must be ${allowed.join('|')}`);
        return;
      }
    }

    if (current.const !== undefined && value !== current.const) errors.push(`${pointer} must equal ${current.const}`);
    if (current.enum && !current.enum.includes(value)) errors.push(`${pointer} is not allowed`);
    if (current.pattern && typeof value === 'string' && !new RegExp(current.pattern).test(value)) errors.push(`${pointer} pattern`);
    if (current.minLength !== undefined && typeof value === 'string' && value.length < current.minLength) errors.push(`${pointer} too short`);
    if (current.format === 'date-time' && !isStrictDateTime(value)) errors.push(`${pointer} invalid date-time`);
    if (current.safePath && typeof value === 'string' && (!path.isAbsolute(value) || value.includes('\0'))) errors.push(`${pointer} unsafe path`);

    if (Array.isArray(value)) {
      if (current.minItems !== undefined && value.length < current.minItems) errors.push(`${pointer} has too few items`);
      if (current.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${pointer} items must be unique`);
      if (current.items) value.forEach((item, index) => walk(current.items, item, `${pointer}[${index}]`, root));
      return;
    }

    if (value && typeof value === 'object') {
      if (Object.hasOwn(value, 'value') && ['canonical', 'derived', 'observed'].includes(value.classification)) {
        if (!value.source || typeof value.source !== 'object') errors.push(`${pointer}.source required for ${value.classification}`);
        else {
          for (const key of ['sourcePath', 'sourceSection', 'fingerprint', 'verificationStatus', 'readAt']) if (!value.source[key]) errors.push(`${pointer}.source.${key} required`);
          if (value.source.fingerprint && !/^[a-f0-9]{64}$/.test(value.source.fingerprint)) errors.push(`${pointer}.source.fingerprint pattern`);
        }
      }
      for (const key of current.required || []) if (value[key] === undefined) errors.push(`${pointer}.${key} required`);
      if (current.additionalProperties === false) {
        for (const key of Object.keys(value)) if (!(key in (current.properties || {}))) errors.push(`${pointer}.${key} unknown`);
      }
      for (const [key, child] of Object.entries(value)) {
        const childSchema = current.properties?.[key] || (typeof current.additionalProperties === 'object' ? current.additionalProperties : null);
        if (childSchema) walk(childSchema, child, `${pointer}.${key}`, root);
      }
    }
  }

  walk(schema, data, '$', schema);
  return { valid: errors.length === 0, errors };
}

export function collectionValidator(schema) {
  return data => Array.isArray(data) && data.every(record => validate(schema, record).valid);
}
