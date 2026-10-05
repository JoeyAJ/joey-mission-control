import fs from 'node:fs/promises';
import path from 'node:path';
import { config, assertSafeDataRoot } from './config.mjs';
import { buildProjection } from './projection/projection-service.mjs';
import { loadSchema, validate } from './api/validation.mjs';
import { composeContinue } from './continue/continue-composer.mjs';

function assertValid(schema, value, label) {
  const result = validate(schema, value);
  if (!result.valid) throw new Error(`Invalid ${label}: ${result.errors.join(', ')}`);
}

async function validateProjection() {
  const schemas = Object.fromEntries(await Promise.all(
    ['project-projection', 'inbox-item', 'ai-workspace-session', 'continue-payload', 'handoff-projection']
      .map(async name => [name, await loadSchema(name)]),
  ));
  const projection = await buildProjection(config.canonicalRoot);
  if (!projection.projects.length) throw new Error('Projection is empty');

  for (const project of projection.projects) assertValid(schemas['project-projection'], project, `project ${project.id}`);
  for (const projectCase of projection.cases) assertValid(schemas['project-projection'], projectCase, `case ${projectCase.id}`);

  const handoffs = [projection.handoffs.globalLatest, ...(projection.handoffs.history || [])].filter(Boolean);
  for (const handoff of handoffs) assertValid(schemas['handoff-projection'], handoff, `handoff ${handoff.sourcePath}`);

  for (const project of projection.projects) {
    const storedContext = {
      head: project.where.storedCommit.value === 'Unknown' ? '' : project.where.storedCommit.value,
      path: project.where.localPath.value === 'Unknown' ? '' : project.where.localPath.value,
      branch: project.where.branch.value === 'Unknown' ? '' : project.where.branch.value,
      sessionPath: project.session?.path || '',
      viewedGit: project.workspaceObservation,
      fingerprints: project.sourceFingerprints,
    };
    const payload = composeContinue({
      project,
      handoff: projection.handoffs.byEntity[project.id],
      git: project.workspaceObservation,
      storedContext,
      currentFingerprints: project.sourceFingerprints,
    });
    assertValid(schemas['continue-payload'], payload, `Continue payload ${project.id}`);
  }

  console.log(`Validated 5 schemas across ${projection.projects.length} projects, ${projection.cases.length} cases, ${handoffs.length} handoffs, and ${projection.projects.length} Continue payloads`);
}

async function main() {
  const command = process.argv[2];
  if (command === 'sync') {
    await assertSafeDataRoot(config.canonicalRoot, config.dataRoot);
    const projection = await buildProjection(config.canonicalRoot);
    const directory = path.join(config.dataRoot, 'cache');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'projection.v1.json'), JSON.stringify(projection, null, 2), { mode: 0o600 });
    console.log(`Synced ${projection.projects.length} entities to disposable cache`);
    return;
  }
  if (command === 'validate') {
    await validateProjection();
    return;
  }
  if (command === 'check') {
    const forbidden = ['git commit', 'git push', 'shell: true', 'JOEY_CANONICAL_MEMORY/'];
    const files = ['src/workspace/git-observer.mjs', 'src/server.mjs'];
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      for (const pattern of forbidden) if (text.includes(pattern)) throw new Error(`Forbidden pattern ${pattern} in ${file}`);
    }
    console.log('Static safety checks passed');
    return;
  }
  throw new Error('Usage: node src/cli.mjs sync|validate|check');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
