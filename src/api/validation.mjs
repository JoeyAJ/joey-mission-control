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

    // Standard composition used by versioned contracts. Branch errors are local.
    const matches = (candidate, candidateValue = value) => {
      const start = errors.length;
      walk(candidate, candidateValue, pointer, root);
      const valid = errors.length === start;
      errors.splice(start);
      return valid;
    };
    for (const child of current.allOf || []) walk(child, value, pointer, root);
    if (current.anyOf && !current.anyOf.some(child => matches(child))) errors.push(`${pointer} matches no alternative`);
    if (current.oneOf && current.oneOf.filter(child => matches(child)).length !== 1) errors.push(`${pointer} must match exactly one alternative`);
    if (current.not && matches(current.not)) errors.push(`${pointer} forbidden value`);
    if (current.if) {
      const branch = matches(current.if) ? current.then : current.else;
      if (branch) walk(branch, value, pointer, root);
    }

    if (current.type) {
      const allowed = Array.isArray(current.type) ? current.type : [current.type];
      const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      if (!allowed.includes(actual) && !(allowed.includes('integer') && Number.isSafeInteger(value))) {
        errors.push(`${pointer} must be ${allowed.join('|')}`);
        return;
      }
    }

    if (current.const !== undefined && value !== current.const) errors.push(`${pointer} must equal ${current.const}`);
    if (current.enum && !current.enum.includes(value)) errors.push(`${pointer} is not allowed`);
    if (current.pattern && typeof value === 'string' && !new RegExp(current.pattern).test(value)) errors.push(`${pointer} pattern`);
    if (current.minLength !== undefined && typeof value === 'string' && value.length < current.minLength) errors.push(`${pointer} too short`);
    if (current.maxLength !== undefined && typeof value === 'string' && value.length > current.maxLength) errors.push(`${pointer} too long`);
    if (current.minimum !== undefined && typeof value === 'number' && value < current.minimum) errors.push(`${pointer} below minimum`);
    if (current.maximum !== undefined && typeof value === 'number' && value > current.maximum) errors.push(`${pointer} above maximum`);
    if (current.format === 'date-time' && !isStrictDateTime(value)) errors.push(`${pointer} invalid date-time`);
    if (current.safePath && typeof value === 'string' && (!path.isAbsolute(value) || value.includes('\0'))) errors.push(`${pointer} unsafe path`);

    if (Array.isArray(value)) {
      if (current.minItems !== undefined && value.length < current.minItems) errors.push(`${pointer} has too few items`);
      if (current.maxItems !== undefined && value.length > current.maxItems) errors.push(`${pointer} has too many items`);
      if (current.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) errors.push(`${pointer} items must be unique`);
      if (current.contains) {
        const count = value.filter(item => matches(current.contains, item)).length;
        if (count < (current.minContains ?? 1) || current.maxContains !== undefined && count > current.maxContains) errors.push(`${pointer} contains count`);
      }
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
        for (const key of Object.keys(value)) if (!Object.hasOwn(current.properties || {}, key)) errors.push(`${pointer}.${key} unknown`);
      }
      for (const [key, child] of Object.entries(value)) {
        const childSchema = Object.hasOwn(current.properties || {}, key) ? current.properties[key] : (typeof current.additionalProperties === 'object' ? current.additionalProperties : null);
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
