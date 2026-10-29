// SPDX-License-Identifier: GPL-3.0-only
import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
const result = await build({
  entryPoints: ['src/index.js'], outfile: 'dist/thermal-intelligence.js',
  bundle: true, format: 'esm', target: 'es2022', minify: true,
  sourcemap: false, legalComments: 'inline', charset: 'utf8', metafile: true,
  define: { __TI_VERSION__: JSON.stringify(version) },
  banner: { js: `/*! Thermal Intelligence Cards ${version} — prerelease frontend module. GPL-3.0-only. Editable source and build instructions accompany this project; no third-party runtime dependencies. */` },
});
if (Object.keys(result.metafile.inputs).some(path => !path.startsWith('src/'))) throw new Error('The runtime must contain only reviewed project source.');
if (Object.values(result.metafile.outputs).some(output => output.imports.length)) throw new Error('The runtime must not load external modules.');
console.log(`Built Thermal Intelligence Cards ${version}`);
