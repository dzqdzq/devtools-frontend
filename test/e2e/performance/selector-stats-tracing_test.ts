// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, step} from '../../shared/helper.js';
import {getDataGridRows} from '../helpers/datagrid-helpers.js';
import {
  enableCSSSelectorStats,
  navigateToPerformanceTab,
  navigateToSelectorStatsTab,
  selectRecalculateStylesEvent,
  startRecording,
  stopRecording,
} from '../helpers/performance-helpers.js';

describe('The Performance panel', function() {
  // These tests move between panels, which takes time.
  if (this.timeout() !== 0) {
    this.timeout(30000);
  }

  async function cssSelectorStatsRecording(testName: string) {
    const {target} = getBrowserAndPages();
    await navigateToPerformanceTab(testName);
    await enableCSSSelectorStats();
    await startRecording();
    await target.reload();
    await stopRecording();
  }

  it('Includes a selector stats table in recalculate style events', async () => {
    await cssSelectorStatsRecording('empty');

    await step('Open select stats for a recorded "Recalculate styles" event', async () => {
      await selectRecalculateStylesEvent();
      await navigateToSelectorStatsTab();
    });

    await step('Check that the selector stats table was rendered successfully', async () => {
      // Since the exact selector text, order, and match counts are implementation defined,
      // we are just checking whether any rows are rendered. This indicates that the trace events
      // we receive from the backend have the expected object structure. If the structure ever
      // changes, the data grid will fail to render and cause this test to fail.
      const rows =
          await getDataGridRows(1 /* expectedNumberOfRows*/, undefined /* root*/, false /* matchExactNumberOfRows*/);
      assert.isAtLeast(rows.length, 1, 'Selector stats table should contain at least one row');
    });
  });
});
