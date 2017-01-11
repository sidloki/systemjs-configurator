import { assert } from 'chai';

import { configure } from '../src/index';

describe('Tests', () => {
  it('runs', () => {
    assert.equal(configure(), 42);
  });
});
