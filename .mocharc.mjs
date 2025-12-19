import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

const argv = yargs(hideBin(process.argv)).argv;
const hasFiles = argv._ && argv._.length > 0;
const group = argv.group || (hasFiles ? 'custom' : 'all');

const groups = {
  all: ['test/setup.js', 'test/integration/**/*.test.js', 'test/media.test.js'],
  integration: ['test/setup.js', 'test/integration/**/*.test.js'],
  e2e: ['test/setup.js', 'test/media.test.js'],
  custom: argv._.map(String),
};

const specs = groups[group] || groups.all;

if (process.argv[1]?.includes('.mocharc')) {
  // lint-skip-next-line no-console
  console.log(`[mocha] group=${group} specs=${JSON.stringify(specs)}`);
}

export default {
  spec: specs,
  'watch-files': ['src/**/*.ts', 'src/**/*.tsx', 'test/**/*.js'],
};
