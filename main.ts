// main.ts — the entrypoint for Ember Pact v4.
// One job: copy game/ and screenshots/ into /output (or MAKEFUN_OUTPUT_DIR)
// and write /output/dossier.json with buildDossier. Node 22, stdlib only.
// Deterministic: the same repository always writes the same bytes.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync('game', `${outDir}/game`, { recursive: true });
cpSync('screenshots', `${outDir}/screenshots`, { recursive: true });
writeFileSync(
  `${outDir}/dossier.json`,
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  }),
);
