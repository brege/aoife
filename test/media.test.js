import { expect } from 'chai';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { add, getGrid, remove, search } from './integration/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, 'config.yaml');
const config = yaml.load(readFileSync(configPath, 'utf8'));

const operations = {
  add,
  remove,
  getGrid,
};

describe('E2E Test Workflows', function () {
  this.timeout(30000);

  config.workflows.forEach((workflow) => {
    if (!workflow.enabled) return;

    // Check if required env vars are available (convert to VITE_ prefix)
    const missingEnv =
      workflow.requires_env?.filter((v) => !process.env[`VITE_${v}`]) || [];
    if (missingEnv.length > 0) {
      console.log(
        `⚠️  Skipping "${workflow.name}" - missing env: ${missingEnv.map((v) => `VITE_${v}`).join(', ')}`,
      );
      return;
    }

    describe(workflow.name, () => {
      workflow.scenarios.forEach((scenario) => {
        if (scenario.skip) return;

        it(`${scenario.test_id}: ${scenario.description}`, async () => {
          const startTime = performance.now();
          let response;

          try {
            if (scenario.operation === 'getGrid') {
              response = await operations.getGrid();
            } else if (scenario.operation === 'add') {
              response = await operations.add(scenario.payload);
            } else if (scenario.operation === 'remove') {
              response = await operations.remove(scenario.payload.id);
            } else if (scenario.operation === 'search') {
              response = await search(
                scenario.payload.query,
                scenario.payload.mediaType,
              );
            }

            const duration = performance.now() - startTime;

            // Verify expectations
            if (scenario.expectations) {
              expect(response.statusCode).to.equal(
                scenario.expectations.statusCode,
              );

              if (scenario.expectations.status) {
                expect(response.data.status).to.equal(
                  scenario.expectations.status,
                );
              }

              if (scenario.expectations.arrayLength !== undefined) {
                expect(response.data).to.be.an('array');
                expect(response.data.length).to.equal(
                  scenario.expectations.arrayLength,
                );
              }
            }

            // Record measurements
            if (scenario.measurements && config.benchmarks?.enabled) {
              scenario.measurements.forEach((metric) => {
                if (metric.type === 'duration') {
                  console.log(`    [${metric.name}] ${duration.toFixed(2)}ms`);
                } else if (
                  metric.type === 'count' &&
                  Array.isArray(response.data)
                ) {
                  console.log(`    [${metric.name}] ${response.data.length}`);
                }
              });
            }
          } catch (err) {
            console.error(`    Error in ${scenario.test_id}:`, err.message);
            throw err;
          }
        });
      });
    });
  });
});
