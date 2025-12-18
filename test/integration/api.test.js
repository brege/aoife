import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'chai';
import { add, apiCall, getGrid, remove, search } from './client.js';

loadEnvAliases();

function loadEnvAliases() {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
      if (key.startsWith('VITE_')) {
        const alias = key.replace(/^VITE_/, '');
        if (!process.env[alias]) process.env[alias] = value;
      } else {
        const viteKey = `VITE_${key}`;
        if (!process.env[viteKey]) process.env[viteKey] = value;
      }
    });
  }
}

const testItem = {
  id: 'api-test-item',
  title: 'API Test Item',
  year: 2001,
  type: 'movies',
  coverUrl: 'https://example.com/api-test.jpg',
};

async function clearTestItem() {
  const result = await remove(testItem.id);
  if (result.statusCode !== 404 && result.statusCode !== 200) {
    throw new Error(`Failed to clear test item: status ${result.statusCode}`);
  }
}

describe('API integration', function () {
  this.timeout(20000);

  beforeEach(async () => {
    await clearTestItem();
  });

  afterEach(async () => {
    await clearTestItem();
  });

  it('adds an item and returns it in grid state', async () => {
    const addResult = await add(testItem);
    expect(addResult.statusCode).to.equal(200);
    expect(typeof addResult.data).to.equal(
      'object',
      'add endpoint returned non-JSON',
    );
    expect(addResult.data?.status).to.equal('added');

    const grid = await getGrid();
    expect(grid.statusCode).to.equal(200);
    expect(Array.isArray(grid.data)).to.equal(true);
    const found = grid.data.some(
      (item) => String(item.id) === String(testItem.id),
    );
    expect(found).to.equal(true);
  });

  it('removes an item and returns 404 when already gone', async () => {
    const addResult = await add(testItem);
    expect(addResult.statusCode).to.equal(200);

    const gridBefore = await getGrid();
    const hasItemBefore = Array.isArray(gridBefore.data)
      ? gridBefore.data.some((item) => String(item.id) === String(testItem.id))
      : false;
    expect(hasItemBefore).to.equal(true);

    const firstRemove = await remove(testItem.id);
    expect(firstRemove.statusCode).to.equal(200);
    expect(firstRemove.data?.status).to.equal('removed');

    const secondRemove = await remove(testItem.id);
    expect(secondRemove.statusCode).to.equal(404);
  });

  it('searches movies when TMDB key is present', async function () {
    const hasTmdbKey =
      Boolean(process.env.VITE_TMDB_API_KEY) ||
      Boolean(process.env.TMDB_API_KEY);
    if (!hasTmdbKey) {
      this.skip();
    }

    const searchResult = await search('inception', 'movies');
    if (searchResult.statusCode !== 200) {
      throw new Error(
        `TMDB search failed (${searchResult.statusCode}): ${JSON.stringify(searchResult.data)}`,
      );
    }
    expect(searchResult.statusCode).to.equal(200);
    expect(Array.isArray(searchResult.data)).to.equal(true);
    expect(searchResult.data.length > 0).to.equal(true);
  });

  it('fetches games platforms through gamesdb proxy', async () => {
    const response = await apiCall(
      'GET',
      '/api/gamesdb/v1/Platforms?page_size=1',
    );

    if (response.statusCode === 404) {
      throw new Error(
        `GamesDB platforms endpoint returned 404: ${JSON.stringify(response.data)}`,
      );
    }

    expect(response.statusCode).to.equal(200);
    expect(typeof response.data).to.equal('object');
  });
});
