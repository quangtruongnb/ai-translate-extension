import test from 'node:test';
import assert from 'node:assert/strict';

import { computeTooltipLayout } from '../src/content/tooltip.js';

test('keeps oversized tooltip within the viewport and exposes a scrollable content budget', () => {
  const layout = computeTooltipLayout(
    { left: 48, top: 520, bottom: 548, width: 420 },
    { width: 420, height: 700 },
    { width: 1280, height: 720 },
    56
  );

  assert.equal(layout.top, 10);
  assert.equal(layout.left, 48);
  assert.equal(layout.maxHeight, 700);
  assert.equal(layout.contentMaxHeight, 644);
});

test('uses the raw selection width while clamping it to the viewport', () => {
  const layout = computeTooltipLayout(
    { left: 24, top: 120, bottom: 148, width: 900 },
    { width: 900, height: 240 },
    { width: 640, height: 720 },
    56
  );

  assert.equal(layout.width, 620);
  assert.equal(layout.left, 10);
});

test('right-aligns the tooltip with the raw selection edge when it fits', () => {
  const layout = computeTooltipLayout(
    { left: 320, right: 440, top: 120, bottom: 148, width: 120 },
    { width: 200, height: 240 },
    { width: 1280, height: 720 },
    56
  );

  assert.equal(layout.width, 200);
  assert.equal(layout.left, 240);
});
