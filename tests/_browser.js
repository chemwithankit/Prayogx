/* Shared Playwright launcher for every browser suite.

   The suites were written in the Claude Cowork Linux container, where
   Playwright lived in /home/claude/build and Chromium was a prebuilt Linux
   binary. This file keeps that working and adds the local Mac setup:

   Playwright, first found of:
     $PLAYWRIGHT                                  explicit override (unchanged)
     tests/node_modules/playwright                `npm ci` in tests/ (pinned 1.56.1)
     /home/claude/build/node_modules/playwright   the Cowork container

   Chromium, first found of:
     $PRAYOGX_CHROMIUM                            explicit binary
     /opt/pw-browsers/chromium-1194/...           the Cowork container
     Playwright's own download                    `npx playwright install chromium`

   Both routes land on Chromium build 1194 (141.0.7390.37).                   */
const fs = require('fs');
const path = require('path');

const COWORK_PLAYWRIGHT = '/home/claude/build/node_modules/playwright';
const COWORK_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function resolvePlaywright() {
  if (process.env.PLAYWRIGHT) return process.env.PLAYWRIGHT;
  const local = path.join(__dirname, 'node_modules', 'playwright');
  if (fs.existsSync(local)) return local;
  if (fs.existsSync(COWORK_PLAYWRIGHT)) return COWORK_PLAYWRIGHT;
  throw new Error('Playwright not found. Run:  npm ci --prefix tests && ' +
                  'npx --prefix tests playwright install chromium   (see tests/README.md)');
}

const { chromium } = require(resolvePlaywright());

function launch(options) {
  const opts = Object.assign({}, options);
  if (!opts.executablePath) {
    if (process.env.PRAYOGX_CHROMIUM) opts.executablePath = process.env.PRAYOGX_CHROMIUM;
    else if (fs.existsSync(COWORK_CHROMIUM)) opts.executablePath = COWORK_CHROMIUM;
  }
  return chromium.launch(opts);
}

module.exports = { chromium, launch };
