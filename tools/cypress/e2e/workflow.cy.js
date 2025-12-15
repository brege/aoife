const workflowEnv = Cypress.env('workflow');
const workflow =
  typeof workflowEnv === 'string' ? JSON.parse(workflowEnv) : workflowEnv;
const measurementsPath =
  Cypress.env('measurementsPath') || 'test/measurements.json';

const scenarioResults = [];
const state = {
  lastSearchResults: [],
  lastAddedTitle: '',
  gridItems: [],
};

function setMediaType(mediaType) {
  if (!mediaType) return cy.wrap(null);

  return cy.get('.dropdown-button').then(($button) => {
    const current = $button.find('.dropdown-label').text().trim();
    const expected =
      mediaType === 'tv'
        ? 'TV Shows'
        : mediaType[0].toUpperCase() + mediaType.slice(1);
    if (current === expected) return;

    cy.wrap($button).click();
    cy.contains('.dropdown-option-label', expected, { timeout: 5000 }).click();
  });
}

function searchMedia(payload) {
  const query =
    payload.query || payload.title || payload.album || payload.artist || '';

  return setMediaType(payload.mediaType || payload.type)
    .then(() =>
      cy
        .get('form.search-form')
        .find('input.search-input')
        .first()
        .clear({ force: true })
        .type(query, { force: true }),
    )
    .then(() => cy.get('.search-button').click())
    .then(() => cy.get('.search-results .movie-item', { timeout: 20000 }))
    .then((items) => {
      const results = items.toArray().map((el) => {
        const title = el.querySelector('.movie-title')?.textContent?.trim();
        const href = el.querySelector('.tmdb-link')?.getAttribute('href') || '';
        const idMatch = href.match(/\/(\d+)/);
        return { title: title || '', id: idMatch ? idMatch[1] : undefined };
      });
      state.lastSearchResults = results;
      return results;
    });
}

function addFromResults(payload) {
  const hasResults = state.lastSearchResults.length > 0;
  const runSearch = payload.query && !hasResults;
  const ensureResults = runSearch ? searchMedia(payload) : cy.wrap(null);

  return ensureResults
    .then(() =>
      cy.get('.add-button', { timeout: 15000 }).first().click({ force: true }),
    )
    .then(() => cy.get('.grid-item.filled', { timeout: 30000 }))
    .then((gridItems) => {
      const addedTitle =
        state.lastSearchResults[0]?.title ||
        payload.title ||
        payload.query ||
        '';
      const addedId =
        payload.id || state.lastSearchResults[0]?.id || addedTitle;
      state.lastAddedTitle = addedTitle;
      state.gridItems.push({ id: addedId, title: addedTitle });
      return {
        statusCode: 200,
        gridCount: gridItems.length,
        status: 'added',
      };
    });
}

function addCustom(payload) {
  const title = payload.title || String(payload.id || 'custom');
  const coverUrl = payload.coverUrl || '';

  return setMediaType('custom')
    .then(() =>
      cy.get('form.search-form').within(() => {
        cy.get('input.search-input')
          .first()
          .clear({ force: true })
          .type(title, {
            force: true,
          });
        if (coverUrl) {
          cy.get('input[placeholder="Image URL or upload..."]', {
            timeout: 2000,
          })
            .clear({ force: true })
            .type(coverUrl, { force: true });
        }
      }),
    )
    .then(() => cy.get('.search-button').click({ force: true }))
    .then(() => cy.get('.grid-item.filled', { timeout: 15000 }))
    .then((gridItems) => {
      state.lastAddedTitle = title;
      state.gridItems.push({
        id: payload.id ?? title,
        title,
      });
      return {
        statusCode: 200,
        gridCount: gridItems.length,
        status: 'added',
      };
    });
}

function removeFromGrid(payload) {
  const targetId = payload.id;
  const target =
    state.gridItems.find((item) => item.id === targetId) ||
    state.gridItems.find((item) => String(item.id) === String(targetId));
  const hasId = targetId !== undefined && targetId !== null;
  if (hasId && !target) {
    return cy.wrap({ statusCode: 404, status: 'missing' });
  }
  const title =
    target?.title ||
    payload.title ||
    state.lastAddedTitle ||
    state.lastSearchResults[0]?.title;
  if (!title) {
    return cy.wrap({ statusCode: 404, status: 'missing' });
  }

  return cy.get('body').then(($body) => {
    const button = $body.find(`button[aria-label="Remove ${title}"]`).first();
    if (!button || button.length === 0) {
      return { statusCode: 404, status: 'missing' };
    }

    return cy
      .wrap(button)
      .click({ force: true })
      .then(() => cy.get('.grid-item.filled'))
      .then((items) => ({
        statusCode: 200,
        status: 'removed',
        gridCount: items.length,
      }))
      .then((result) => {
        if (target) {
          state.gridItems = state.gridItems.filter((item) => item !== target);
        }
        return result;
      });
  });
}

function getGridState() {
  return cy.get('.grid-item.filled').then((items) => ({
    statusCode: 200,
    arrayLength: items.length,
    gridCount: items.length,
  }));
}

function runOperation(step, scenarioResult) {
  const operation = step.operation;
  const payload = step.payload || {};

  if (operation === 'search') {
    return searchMedia(payload).then(() => {
      const resultsCount = state.lastSearchResults.length;
      if (scenarioResult) {
        scenarioResult.resultsCount = resultsCount;
        scenarioResult.statusCode = 200;
      }
      return { statusCode: 200, resultsCount };
    });
  }

  if (operation === 'add') {
    const canSearch = Boolean(payload.query);
    return (canSearch ? addFromResults(payload) : addCustom(payload)).then(
      (result) => {
        if (scenarioResult) {
          scenarioResult.statusCode = result.statusCode;
          scenarioResult.gridCount =
            result.gridCount ?? scenarioResult.gridCount;
        }
        return result;
      },
    );
  }

  if (operation === 'remove') {
    return removeFromGrid(payload).then((result) => {
      if (scenarioResult) {
        scenarioResult.statusCode = result.statusCode;
        scenarioResult.gridCount = result.gridCount ?? scenarioResult.gridCount;
      }
      return result;
    });
  }

  if (operation === 'getGrid') {
    return getGridState().then((result) => {
      if (scenarioResult) {
        scenarioResult.statusCode = result.statusCode;
        scenarioResult.gridCount = result.gridCount;
      }
      return result;
    });
  }

  return cy.wrap({
    statusCode: 400,
    error: `Unsupported operation ${operation}`,
  });
}

function runScenario(scenario) {
  const start = Date.now();
  const op = scenario.operation || scenario.steps?.[0]?.operation;
  let execution;

  if (scenario.type === 'workflow' && Array.isArray(scenario.steps)) {
    const scenarioResult = {
      id: scenario.test_id,
      description: scenario.description,
      measurements: {},
      statusCode: null,
      resultsCount: 0,
      gridCount: 0,
    };

    execution = scenario.steps.reduce((chain, step) => {
      return chain.then(() =>
        runOperation(step, scenarioResult).then((result) => {
          scenarioResult.statusCode =
            result.statusCode ?? scenarioResult.statusCode;
          scenarioResult.resultsCount =
            result.resultsCount ?? scenarioResult.resultsCount;
          scenarioResult.gridCount =
            result.gridCount ?? scenarioResult.gridCount;
        }),
      );
    }, cy.wrap(null));

    return execution.then(() => {
      const duration = Date.now() - start;
      if (Array.isArray(scenario.measurements)) {
        scenario.measurements.forEach((metric) => {
          if (metric.type === 'duration') {
            scenarioResult.measurements[metric.name] = duration;
          }
          if (metric.type === 'count') {
            scenarioResult.measurements[metric.name] =
              scenarioResult.resultsCount || scenarioResult.gridCount || 0;
          }
        });
      }

      if (scenario.expectations?.statusCode !== undefined) {
        expect(scenarioResult.statusCode).to.equal(
          scenario.expectations.statusCode,
        );
      }

      scenarioResults.push(scenarioResult);
    });
  }

  if (op === 'search') {
    execution = searchMedia(scenario.payload || {}).then(() => ({
      statusCode: 200,
      resultsCount: state.lastSearchResults.length,
    }));
  } else if (op === 'add') {
    const payload = scenario.payload || {};
    const canSearch = Boolean(payload.query);
    execution = canSearch ? addFromResults(payload) : addCustom(payload);
  } else if (op === 'remove') {
    execution = removeFromGrid(scenario.payload || {});
  } else if (op === 'getGrid') {
    execution = getGridState();
  } else {
    execution = cy.wrap({
      statusCode: 400,
      error: `Unsupported operation ${op}`,
    });
  }

  return execution.then((result) => {
    const duration = Date.now() - start;
    const scenarioResult = {
      id: scenario.test_id,
      description: scenario.description,
      ...result,
      measurements: {},
    };

    if (Array.isArray(scenario.measurements)) {
      scenario.measurements.forEach((metric) => {
        if (metric.type === 'duration') {
          scenarioResult.measurements[metric.name] = duration;
        }
        if (metric.type === 'count') {
          scenarioResult.measurements[metric.name] =
            result.resultsCount ?? result.gridCount ?? 0;
        }
        if (metric.type === 'bytes') {
          scenarioResult.measurements[metric.name] = new Blob([
            String(result.gridCount ?? 0),
          ]).size;
        }
      });
    }

    if (scenario.expectations?.statusCode !== undefined) {
      expect(result.statusCode).to.equal(scenario.expectations.statusCode);
    }
    if (scenario.expectations?.arrayLength !== undefined) {
      expect(result.arrayLength).to.equal(scenario.expectations.arrayLength);
    }
    if (scenario.expectations?.status) {
      expect(result.status).to.equal(scenario.expectations.status);
    }

    scenarioResults.push(scenarioResult);
  });
}

function persistMeasurements() {
  return cy
    .readFile(measurementsPath, { log: false, failOnNonExist: false })
    .then((existing) => {
      const baseline =
        existing && typeof existing === 'object' ? existing : { workflows: [] };
      const updated = {
        ...baseline,
        workflows: [
          ...(baseline.workflows || []),
          { name: workflow?.name, scenarios: scenarioResults },
        ],
      };
      return cy.writeFile(measurementsPath, updated, { log: false });
    });
}

describe(`Workflow: ${workflow?.name || 'unnamed'}`, () => {
  it('runs YAML scenarios in-browser', () => {
    if (!workflow || !Array.isArray(workflow.scenarios)) {
      throw new Error('Missing workflow scenarios');
    }

    cy.visit('/');
    cy.window().then((win) => win.localStorage.clear());
    cy.reload();
    cy.get('.dropdown-button', { timeout: 15000 }).should('exist');

    const scenarios = workflow.scenarios.filter((s) => !s.skip);
    scenarios.reduce(
      (chain, scenario) => chain.then(() => runScenario(scenario)),
      cy.wrap(null),
    );

    cy.then(() => persistMeasurements());
  });
});
