describe('Mobile Grid Debug - End to End', () => {
  it('should test complete mobile grid workflow', () => {
    // Set exact mobile viewport from your device
    cy.viewport(980, 1835);
    cy.visit('/');

    // Add movies to build a complete grid
    cy.log('STEP 1: Adding movies to grid');

    // Search and add first movie
    cy.get('.search-input').type('Matrix');
    cy.get('.search-button').click();
    cy.wait(2000); // Wait for search results
    cy.get('.add-button').first().click();
    cy.wait(1000);

    // Search and add second movie
    cy.get('.search-input').clear().type('Avatar');
    cy.get('.search-button').click();
    cy.wait(2000);
    cy.get('.add-button').first().click();
    cy.wait(1000);

    // Search and add third movie
    cy.get('.search-input').clear().type('Inception');
    cy.get('.search-button').click();
    cy.wait(2000);
    cy.get('.add-button').first().click();
    cy.wait(1000);

    // Search and add fourth movie
    cy.get('.search-input').clear().type('Interstellar');
    cy.get('.search-button').click();
    cy.wait(2000);
    cy.get('.add-button').first().click();
    cy.wait(2000); // Wait for grid to fully load

    cy.log('STEP 2: Testing different layout modes');

    // Test force-2x2 layout (most important for mobile)
    cy.get('[data-testid="hamburger-menu"]').click();
    cy.contains('Force 2x2').click();
    cy.get('[data-testid="hamburger-menu"]').click(); // Close menu
    cy.wait(1000);

    // Capture measurements for force-2x2
    cy.window().then((win) => {
      const measurements = getMeasurements(win);
      cy.log('=== FORCE-2x2 LAYOUT ===');
      logMeasurements(measurements);
    });

    // Test prefer-horizontal layout
    cy.get('[data-testid="hamburger-menu"]').click();
    cy.contains('Prefer Horizontal').click();
    cy.get('[data-testid="hamburger-menu"]').click();
    cy.wait(1000);

    cy.window().then((win) => {
      const measurements = getMeasurements(win);
      cy.log('=== PREFER-HORIZONTAL LAYOUT ===');
      logMeasurements(measurements);
    });

    // Back to force-2x2 for final analysis
    cy.get('[data-testid="hamburger-menu"]').click();
    cy.contains('Force 2x2').click();
    cy.get('[data-testid="hamburger-menu"]').click();
    cy.wait(1000);

    cy.log('STEP 3: Final comprehensive analysis');

    cy.window().then((win) => {
      const measurements = getMeasurements(win);
      const analysis = analyzeMeasurements(measurements);

      cy.log('=== FINAL MOBILE ANALYSIS ===');
      logMeasurements(measurements);
      logAnalysis(analysis);

      // Assert the problems we need to fix
      if (analysis.posterWidthProblem) {
        cy.log(
          `❌ PROBLEM: Posters too small - ${analysis.posterWidthProblem}`,
        );
      }
      if (analysis.cssVariableProblem) {
        cy.log(
          `❌ PROBLEM: CSS variable incorrect - ${analysis.cssVariableProblem}`,
        );
      }
      if (analysis.spaceWasteProblem) {
        cy.log(`❌ PROBLEM: Space waste - ${analysis.spaceWasteProblem}`);
      }

      // Keep browser open for manual inspection
      cy.wait(60000);
    });
  });
});

function getMeasurements(win) {
  const container = win.document.querySelector('.grid-container');
  const posters = win.document.querySelectorAll('.grid-poster');
  const gridItems = win.document.querySelectorAll('.grid-item');

  return {
    viewport: {
      width: win.innerWidth,
      height: win.innerHeight,
    },
    container: container
      ? {
          width: container.getBoundingClientRect().width,
          height: container.getBoundingClientRect().height,
          computedStyle: win.getComputedStyle(container).gridTemplateColumns,
          className: container.className,
          posterWidth: win
            .getComputedStyle(container)
            .getPropertyValue('--poster-width')
            .trim(),
          gap: win.getComputedStyle(container).gap,
        }
      : null,
    posters: Array.from(posters).map((poster) => ({
      width: poster.getBoundingClientRect().width,
      height: poster.getBoundingClientRect().height,
      naturalWidth: poster.naturalWidth,
      naturalHeight: poster.naturalHeight,
    })),
    gridItems: Array.from(gridItems).map((item) => ({
      width: item.getBoundingClientRect().width,
      height: item.getBoundingClientRect().height,
      computedWidth: win.getComputedStyle(item).width,
      computedMaxWidth: win.getComputedStyle(item).maxWidth,
    })),
  };
}

function logMeasurements(measurements) {
  console.log('Viewport:', measurements.viewport);
  console.log('Container:', measurements.container);
  console.log('Posters:', measurements.posters);
  console.log('Grid Items:', measurements.gridItems);
}

function analyzeMeasurements(measurements) {
  const viewportWidth = measurements.viewport.width;
  const expectedPosterWidth = viewportWidth * 0.3; // 30vw
  const optimalTwoColumnWidth = (viewportWidth - 32 - 16) / 2; // Account for padding and gap
  const actualPosterWidth = measurements.posters[0]?.width || 0;
  const cssVariableWidth = measurements.container?.posterWidth || '0px';

  return {
    viewportWidth,
    expectedPosterWidth,
    optimalTwoColumnWidth,
    actualPosterWidth,
    cssVariableWidth,
    posterWidthProblem:
      actualPosterWidth < expectedPosterWidth * 0.8
        ? `${actualPosterWidth}px vs expected ${expectedPosterWidth.toFixed(0)}px`
        : null,
    cssVariableProblem:
      !cssVariableWidth.includes('vw') &&
      parseFloat(cssVariableWidth) < expectedPosterWidth * 0.8
        ? `CSS var is ${cssVariableWidth} but should be ~${expectedPosterWidth.toFixed(0)}px`
        : null,
    spaceWasteProblem:
      optimalTwoColumnWidth - actualPosterWidth > 100
        ? `Wasting ${(optimalTwoColumnWidth - actualPosterWidth).toFixed(0)}px per poster`
        : null,
  };
}

function logAnalysis(analysis) {
  console.log('=== ANALYSIS ===');
  console.log(`Viewport: ${analysis.viewportWidth}px`);
  console.log(
    `Expected poster (30vw): ${analysis.expectedPosterWidth.toFixed(0)}px`,
  );
  console.log(
    `Optimal 2-column: ${analysis.optimalTwoColumnWidth.toFixed(0)}px`,
  );
  console.log(`Actual poster: ${analysis.actualPosterWidth}px`);
  console.log(`CSS Variable: ${analysis.cssVariableWidth}`);
}
