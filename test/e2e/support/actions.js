const WINDOW_TIMEOUT = 15000;

export function getApplicationTestApi() {
  return cy
    .window({ timeout: WINDOW_TIMEOUT })
    .should((win) => {
      if (!win.appTestApi) {
        throw new Error('appTestApi is not available on window');
      }
    })
    .then((win) => {
      if (!win.appTestApi) {
        throw new Error('appTestApi is not available on window');
      }
      return win.appTestApi;
    });
}

export function resetApplicationState() {
  return cy.window({ timeout: WINDOW_TIMEOUT }).then((win) => {
    win.localStorage.clear();
  });
}

export function setMediaType(mediaType) {
  if (!mediaType) {
    return cy.wrap(null);
  }
  return getApplicationTestApi().then((testApi) => {
    testApi.setMediaType(mediaType);
    return testApi.getSearchValues();
  });
}

export function searchThroughApplication(payload) {
  const mediaType = payload.mediaType || payload.type || 'movies';
  const values =
    payload.values || payload.query || payload.title || payload.album
      ? {
          query:
            payload.query ||
            payload.title ||
            payload.album ||
            payload.artist ||
            '',
        }
      : {};

  return getApplicationTestApi().then((testApi) =>
    testApi.search(values, mediaType).then((results) => ({
      results,
      mediaType,
    })),
  );
}

export function applySearchFixtureResults(mediaType, results, summary) {
  return getApplicationTestApi().then((testApi) => {
    testApi.applySearchResults(results, mediaType, summary);
    return { results, mediaType };
  });
}

export function addMediaDirectly(media, availableCovers) {
  return getApplicationTestApi().then((testApi) => {
    testApi.addMedia(media, availableCovers);
    return cy
      .wrap(null, { timeout: WINDOW_TIMEOUT })
      .should(() => {
        const stored = testApi.getStoredGridItems();
        const exists = stored.some(
          (item) => String(item.id) === String(media.id),
        );
        expect(exists).to.equal(true);
      })
      .then(() => testApi.getStoredGridItems());
  });
}

export function removeMediaDirectly(mediaId) {
  return getApplicationTestApi().then((testApi) => {
    testApi.removeMedia(mediaId);
    return cy
      .wrap(null, { timeout: WINDOW_TIMEOUT })
      .should(() => {
        const stored = testApi.getStoredGridItems();
        const exists = stored.some(
          (item) => String(item.id) === String(mediaId),
        );
        expect(exists).to.equal(false);
      })
      .then(() => testApi.getStoredGridItems());
  });
}

export function getGridSnapshot() {
  return getApplicationTestApi().then((testApi) =>
    cy.wrap(null).then(() => {
      const items = testApi.getGridItems();
      const stored = testApi.getStoredGridItems();
      return {
        items,
        stored,
        builderMode: testApi.getBuilderMode(),
      };
    }),
  );
}

export function setBuilderModeState(enabled) {
  return getApplicationTestApi().then((testApi) => {
    testApi.setBuilderMode(enabled);
    return testApi.getBuilderMode();
  });
}

export function clearGridThroughApplication() {
  return getApplicationTestApi().then((testApi) => {
    testApi.clearGrid();
    return cy
      .wrap(null, { timeout: WINDOW_TIMEOUT })
      .should(() => {
        const stored = testApi.getStoredGridItems();
        expect(stored.length).to.equal(0);
      })
      .then(() => testApi.getStoredGridItems());
  });
}

export function setLayoutDimension(dimension) {
  return getApplicationTestApi().then((testApi) => {
    testApi.setLayoutDimension(dimension);
    return testApi.getLayoutDimension();
  });
}

export function getLayoutDimension() {
  return getApplicationTestApi().then((testApi) => {
    return testApi.getLayoutDimension();
  });
}
