import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import cypress from 'cypress';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const configPath = join(__dirname, 'e2e', 'workflows.yaml');
const envPath = join(rootDir, '.env');
const config = yaml.load(readFileSync(configPath, 'utf8'));
const measurementsPath = resolve(
  rootDir,
  config.benchmarks?.output || 'test/measurements.json',
);
const cypressConfigDir = join(rootDir, '.cypress-config');

loadEnvFile();
ensureViteAlias('TMDB_API_KEY');

function ensureViteAlias(key) {
  const viteKey = `VITE_${key}`;
  // Set VITE_ version from non-VITE_ version if needed
  if (process.env[key] && !process.env[viteKey]) {
    process.env[viteKey] = process.env[key];
  }
  // Also ensure the non-VITE_ version exists from VITE_ version for compatibility
  if (process.env[viteKey] && !process.env[key]) {
    process.env[key] = process.env[viteKey];
  }
}

function loadEnvFile() {
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
    if (!key.startsWith('VITE_')) {
      const viteKey = `VITE_${key}`;
      if (!process.env[viteKey]) {
        process.env[viteKey] = value;
      }
    }
  });
}

function resetMeasurements() {
  if (existsSync(measurementsPath)) {
    rmSync(measurementsPath);
  }
  writeFileSync(measurementsPath, JSON.stringify({ workflows: [] }, null, 2));
}

function ensureCypressDirs() {
  if (!existsSync(cypressConfigDir)) {
    mkdirSync(cypressConfigDir, { recursive: true });
  }
  process.env.XDG_CONFIG_HOME = cypressConfigDir;
  process.env.ELECTRON_DISABLE_GPU = '1';
}

describe('YAML workflows via Cypress', function () {
  this.timeout(240000);

  before(() => {
    if (config.benchmarks?.enabled !== false) {
      resetMeasurements();
    }
    ensureCypressDirs();
  });

  config.workflows.forEach((workflow) => {
    if (!workflow.enabled) {
      it.skip(`${workflow.name} (disabled)`, () => {});
      return;
    }

    (workflow.requires_env || []).forEach((key) => {
      ensureViteAlias(key);
    });

    const missingEnv =
      workflow.requires_env?.filter(
        (key) => !process.env[`VITE_${key}`] && !process.env[key],
      ) || [];
    if (missingEnv.length > 0) {
      it(`${workflow.name} [${workflow.level}] (missing env)`, () => {
        throw new Error(
          `Missing required env vars: ${missingEnv
            .map((key) => `VITE_${key}`)
            .join(', ')}`,
        );
      });
      return;
    }

    it(`${workflow.name} [${workflow.level}]`, async () => {
      const run = await cypress.run({
        configFile: 'test/e2e/cypress.config.js',
        spec: 'test/e2e/specs/workflow.cy.js',
        env: {
          workflow: JSON.stringify(workflow),
          measurementsPath,
          VITE_TMDB_API_KEY: process.env.VITE_TMDB_API_KEY,
        },
      });

      const failed = run?.totalFailed ?? run?.failures ?? 1;
      expect(failed).to.equal(
        0,
        `Cypress failures for workflow ${workflow.name}`,
      );
    });
  });
});
