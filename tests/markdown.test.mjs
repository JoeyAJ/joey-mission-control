import test from 'node:test'; import assert from 'node:assert/strict';
import { parseMarkdown, parseTable } from '../src/canonical/markdown.mjs';

test('parses fenced metadata, sections and tables',()=>{const md='# T\n```yaml\nversion: 1.2\nflag: true\nnone: null\n```\n## Current Stage\nHello\n\n| Name | Path |\n|---|---|\n| A | [x](./A.md) |'; const p=parseMarkdown(md); assert.deepEqual(p.metadata,{version:1.2,flag:true,none:null}); assert.equal(p.sections['Current Stage'],'Hello\n\n| Name | Path |\n|---|---|\n| A | [x](./A.md) |'); assert.equal(parseTable(p.sections['Current Stage'])[0].Path,'[x](./A.md)');});
