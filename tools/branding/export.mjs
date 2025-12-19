import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const argumentsList = process.argv.slice(2);
if (argumentsList.length < 3) {
  throw new Error(
    'Usage: node tools/branding/export.mjs --favicon|--social <address> <output-file>',
  );
}

let mode = null;
const remainingArguments = [];

for (const argument of argumentsList) {
  if (argument === '--favicon' || argument === '-f') {
    if (mode) {
      throw new Error('Use exactly one of --favicon or --social');
    }
    mode = 'favicon';
    continue;
  }
  if (argument === '--social' || argument === '-s') {
    if (mode) {
      throw new Error('Use exactly one of --favicon or --social');
    }
    mode = 'social';
    continue;
  }
  remainingArguments.push(argument);
}

if (!mode) {
  throw new Error('Missing required mode flag: --favicon or --social');
}

if (remainingArguments.length !== 2) {
  throw new Error(
    'Usage: node tools/branding/export.mjs --favicon|--social <address> <output-file>',
  );
}

const [targetAddress, outputFilePath] = remainingArguments;
const parsedAddress = new URL(targetAddress);
if (!['http:', 'https:'].includes(parsedAddress.protocol)) {
  throw new Error('Address must start with http:// or https://');
}

if (!outputFilePath.endsWith('.png')) {
  throw new Error('Output file must be a .png');
}

const resolvedOutputFilePath = path.resolve(outputFilePath);
const outputDirectoryPath = path.dirname(resolvedOutputFilePath);
const outputDirectoryStat = fs.statSync(outputDirectoryPath);
if (!outputDirectoryStat.isDirectory()) {
  throw new Error('Output directory is not a directory');
}

const userDataDirectoryPath = path.resolve('tmp/puppeteer-profile');
fs.mkdirSync(userDataDirectoryPath, { recursive: true });

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  userDataDir: userDataDirectoryPath,
});
const page = await browser.newPage();

const viewport =
  mode === 'favicon'
    ? { width: 1024, height: 1024, deviceScaleFactor: 1 }
    : { width: 1280, height: 640, deviceScaleFactor: 1 };

await page.setViewport(viewport);
await page.goto(targetAddress, { waitUntil: 'networkidle0' });

const selector = mode === 'favicon' ? '.favicon' : '.social-card';
const element = await page.waitForSelector(selector, { timeout: 5000 });
if (!element) {
  throw new Error('Export element not found');
}

const screenshotOptions = {
  path: resolvedOutputFilePath,
  omitBackground: mode === 'favicon',
};

await element.screenshot(screenshotOptions);
await browser.close();
