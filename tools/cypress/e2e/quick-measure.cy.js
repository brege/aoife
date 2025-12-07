describe('Quick Mobile Measurements', () => {
  it('captures measurements and writes to file', () => {
    cy.viewport(980, 1835);
    cy.visit('/');
    cy.wait(3000);

    // Get measurements and write to file for Claude to read
    cy.window().then((win) => {
      const container = win.document.querySelector('.grid-container');
      const posters = win.document.querySelectorAll('.grid-poster');
      const gridItems = win.document.querySelectorAll('.grid-item');

      const measurements = {
        timestamp: new Date().toISOString(),
        viewport: {
          width: win.innerWidth,
          height: win.innerHeight,
        },
        container: container
          ? {
              width: Math.round(container.getBoundingClientRect().width),
              height: Math.round(container.getBoundingClientRect().height),
              computedStyle:
                win.getComputedStyle(container).gridTemplateColumns,
              className: container.className,
              posterWidth: win
                .getComputedStyle(container)
                .getPropertyValue('--poster-width')
                .trim(),
              gap: win.getComputedStyle(container).gap,
              allStyles: {
                width: win.getComputedStyle(container).width,
                maxWidth: win.getComputedStyle(container).maxWidth,
                minWidth: win.getComputedStyle(container).minWidth,
              },
            }
          : null,
        posters: Array.from(posters)
          .slice(0, 4)
          .map((poster, i) => ({
            index: i,
            width: Math.round(poster.getBoundingClientRect().width),
            height: Math.round(poster.getBoundingClientRect().height),
            naturalWidth: poster.naturalWidth,
            naturalHeight: poster.naturalHeight,
          })),
        gridItems: Array.from(gridItems)
          .slice(0, 4)
          .map((item, i) => ({
            index: i,
            width: Math.round(item.getBoundingClientRect().width),
            height: Math.round(item.getBoundingClientRect().height),
            computedWidth: win.getComputedStyle(item).width,
            computedMaxWidth: win.getComputedStyle(item).maxWidth,
          })),
        analysis: {
          expectedPosterWidth30vw: Math.round(win.innerWidth * 0.3),
          expectedPosterWidthOptimal: Math.round(
            (win.innerWidth - 32 - 16) / 2,
          ),
          actualPosterWidth: posters[0]
            ? Math.round(posters[0].getBoundingClientRect().width)
            : 0,
          problem: 'CSS --poster-width not scaling to 30vw',
        },
      };

      // Write to file that Claude can read
      cy.writeFile('tools/cypress/fixtures/measurements.json', measurements);

      // Also log key findings
      cy.log(`VIEWPORT: ${measurements.viewport.width}px`);
      cy.log(`CSS --poster-width: ${measurements.container.posterWidth}`);
      cy.log(
        'EXPECTED (30vw): ' +
          measurements.analysis.expectedPosterWidth30vw +
          'px',
      );
      cy.log(`ACTUAL: ${measurements.analysis.actualPosterWidth}px`);
      cy.log(
        `PROBLEM: ${
          measurements.analysis.expectedPosterWidth30vw -
          measurements.analysis.actualPosterWidth
        }px too small`,
      );
    });
  });
});
