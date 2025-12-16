import { mediaFixturesByType, movieSearchResults } from '../fixtures/media';
import {
  addMediaDirectly,
  applySearchFixtureResults,
  clearGridThroughApplication,
  getApplicationTestApi,
  getGridSnapshot,
  removeMediaDirectly,
  resetApplicationState,
  searchThroughApplication,
  setBuilderModeState,
  setMediaType,
} from '../support/actions';

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

function initializeState() {
  state.lastSearchResults = [];
  state.lastAddedTitle = '';
  state.gridItems = [];
}

function bootstrapApplication() {
  cy.visit('/');
  resetApplicationState();
  cy.get('[data-testid="media-search-form-band"]', {
    timeout: 15000,
  }).should('exist');
  cy.then(() => getApplicationTestApi());
  clearGridThroughApplication().then((items) => {
    state.gridItems = items;
  });
  setBuilderModeState(true);
  setMediaType('movies');
}

function chooseFixtures(mediaType) {
  return mediaFixturesByType[mediaType] || movieSearchResults;
}

function applyMediaTypeFromPayload(payload) {
  const mediaType = payload.mediaType || payload.type;
  if (!mediaType) {
    return cy.wrap(null);
  }
  return setMediaType(mediaType);
}

function performSearch(payload) {
  const mediaType = payload.mediaType || payload.type || 'movies';
  const summary =
    payload.query || payload.title || payload.album || payload.artist || '';
  const useFixtures = payload.useFixtures ?? false;
  const action = useFixtures
    ? applySearchFixtureResults(mediaType, chooseFixtures(mediaType), summary)
    : searchThroughApplication({ ...payload, mediaType });

  return action.then(({ results }) => {
    state.lastSearchResults = results;
    state.lastAddedTitle = results[0]?.title || '';
    return { statusCode: 200, resultsCount: results.length };
  });
}

function addMediaOperation(payload) {
  const mediaType = payload.mediaType || payload.type || 'movies';
  const useFirstResult = payload.use_first_result || payload.useFirstResult;
  const availableCovers =
    state.lastSearchResults.length > 0 ? state.lastSearchResults : undefined;
  const targetMedia =
    useFirstResult && state.lastSearchResults[0]
      ? state.lastSearchResults[0]
      : { ...payload, type: mediaType };

  if (!targetMedia || !targetMedia.title) {
    return cy.wrap({
      statusCode: 404,
      status: 'missing',
      gridCount: state.gridItems.length,
    });
  }

  const previousCount = state.gridItems.length;
  return addMediaDirectly(targetMedia, availableCovers).then((items) => {
    state.gridItems = items;
    const added = items.some(
      (item) => String(item.id) === String(targetMedia.id),
    );
    return {
      statusCode: 200,
      status: added ? 'added' : 'unchanged',
      gridCount: items.length,
    };
  });
}

function removeMediaOperation(payload) {
  const targetId =
    payload.id ??
    state.gridItems.find((item) => item.title === payload.title)?.id ??
    null;
  const previousCount = state.gridItems.length;

  if (targetId === null || targetId === undefined) {
    return cy.wrap({
      statusCode: 404,
      status: 'missing',
      gridCount: previousCount,
    });
  }

  return removeMediaDirectly(targetId).then((items) => {
    state.gridItems = items;
    const status = items.length < previousCount ? 'removed' : 'missing';
    return {
      statusCode: status === 'removed' ? 200 : 404,
      status,
      gridCount: items.length,
    };
  });
}

function getGridStateOperation() {
  return getGridSnapshot().then((snapshot) => {
    state.gridItems = snapshot.items;
    expect(snapshot.stored.length).to.equal(
      snapshot.items.length,
      'localStorage grid should match in-memory grid',
    );
    return {
      statusCode: 200,
      arrayLength: snapshot.items.length,
      gridCount: snapshot.items.length,
    };
  });
}

function runOperation(step, scenarioResult) {
  const operation = step.operation;
  const payload = step.payload || {};

  if (operation === 'search') {
    return applyMediaTypeFromPayload(payload)
      .then(() => performSearch(payload))
      .then((result) => {
        if (scenarioResult) {
          scenarioResult.resultsCount = result.resultsCount;
          scenarioResult.statusCode = result.statusCode;
        }
        return result;
      });
  }

  if (operation === 'add') {
    return addMediaOperation(payload).then((result) => {
      if (scenarioResult) {
        scenarioResult.statusCode = result.statusCode;
        scenarioResult.gridCount = result.gridCount ?? scenarioResult.gridCount;
      }
      return result;
    });
  }

  if (operation === 'remove') {
    return removeMediaOperation(payload).then((result) => {
      if (scenarioResult) {
        scenarioResult.statusCode = result.statusCode;
        scenarioResult.gridCount = result.gridCount ?? scenarioResult.gridCount;
      }
      return result;
    });
  }

  if (operation === 'getGrid') {
    return getGridStateOperation().then((result) => {
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
    execution = performSearch(scenario.payload || {}).then(() => ({
      statusCode: 200,
      resultsCount: state.lastSearchResults.length,
    }));
  } else if (op === 'add') {
    execution = addMediaOperation(scenario.payload || {});
  } else if (op === 'remove') {
    execution = removeMediaOperation(scenario.payload || {});
  } else if (op === 'getGrid') {
    execution = getGridStateOperation();
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

function runAccessibilityChecks() {
  cy.get('[data-testid="media-type-toggle"]').should('exist');
  cy.get('[data-testid="media-type-toggle"]').first().click();
  cy.get('[data-testid="media-type-option-movies"]').should('exist');
  cy.get('[data-testid="media-type-toggle"]').first().type('{esc}');

  cy.get('[data-testid="search-submit"]').should('exist');
  cy.get('[data-testid="media-search-form-band"]').should('exist');
  cy.get('[data-testid="media-search-form-stack"]').should('exist');

  cy.viewport(360, 720);
  cy.get('[data-testid="media-search-form-stack"]').should('be.visible');
  cy.viewport(1280, 800);
}

describe(`Workflow: ${workflow?.name || 'unnamed'}`, () => {
  it('runs YAML scenarios in-browser', () => {
    if (!workflow || !Array.isArray(workflow.scenarios)) {
      throw new Error('Missing workflow scenarios');
    }

    initializeState();
    bootstrapApplication();

    const scenarios = workflow.scenarios.filter((s) => !s.skip);
    scenarios.reduce(
      (chain, scenario) => chain.then(() => runScenario(scenario)),
      cy.wrap(null),
    );

    cy.then(() => runAccessibilityChecks());
    cy.then(() => persistMeasurements());
  });
});
