import puppeteer from 'puppeteer';

async function debugMobile() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  // Emulate iPhone 12 Pro Max dimensions (980px is what you showed)
  await page.emulate({
    name: 'Custom Mobile',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 980,
      height: 1835,
      deviceScaleFactor: 2.6,
      isMobile: true,
      hasTouch: true,
    },
  });

  console.log('Opening mobile emulation...');
  await page.goto('http://localhost:5173');

  // Wait for grid to load
  await page.waitForSelector('.grid-container', { timeout: 10000 });

  // Get actual measurements
  const measurements = await page.evaluate(() => {
    const container = document.querySelector('.grid-container');
    const poster = document.querySelector('.grid-poster');
    const gridItem = document.querySelector('.grid-item');

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      container: container
        ? {
            width: container.getBoundingClientRect().width,
            height: container.getBoundingClientRect().height,
            computedStyle: getComputedStyle(container).gridTemplateColumns,
            className: container.className,
            cssVars: {
              posterWidth:
                getComputedStyle(container).getPropertyValue('--poster-width'),
            },
          }
        : null,
      poster: poster
        ? {
            width: poster.getBoundingClientRect().width,
            height: poster.getBoundingClientRect().height,
            naturalWidth: poster.naturalWidth,
            naturalHeight: poster.naturalHeight,
          }
        : null,
      gridItem: gridItem
        ? {
            width: gridItem.getBoundingClientRect().width,
            height: gridItem.getBoundingClientRect().height,
            computedWidth: getComputedStyle(gridItem).width,
            computedMaxWidth: getComputedStyle(gridItem).maxWidth,
          }
        : null,
    };
  });

  console.log('\n=== MOBILE DEBUG MEASUREMENTS ===');
  console.log('Viewport:', measurements.viewport);
  console.log('Container:', measurements.container);
  console.log('Poster:', measurements.poster);
  console.log('Grid Item:', measurements.gridItem);

  const optimalTwoColumn = (measurements.viewport.width - 32 - 16) / 2;
  const actual = measurements.poster?.width || 0;
  const waste = optimalTwoColumn - actual;

  console.log('\n=== ANALYSIS ===');
  console.log(`Optimal 2-column width: ${optimalTwoColumn}px`);
  console.log(`Actual poster width: ${actual}px`);
  console.log(`Wasted space per poster: ${waste}px`);
  console.log(
    `Space efficiency: ${((actual / optimalTwoColumn) * 100).toFixed(1)}%`,
  );

  // Keep browser open for inspection
  console.log('\nBrowser opened for inspection. Press Ctrl+C to close.');

  // Don't close automatically
  await new Promise(() => {});
}

debugMobile().catch(console.error);
