import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiPathname } from '../api-route-utils.mjs';

test('normalizes /api/admin routes to backend routes', () => {
  assert.equal(normalizeApiPathname('/api/admin/candidates'), '/admin/candidates');
  assert.equal(normalizeApiPathname('/api/admin/register-candidate'), '/admin/register-candidate');
  assert.equal(normalizeApiPathname('/api/generate'), '/generate');
  assert.equal(normalizeApiPathname('/api/health'), '/health');
});

test('leaves non-prefixed routes unchanged', () => {
  assert.equal(normalizeApiPathname('/health'), '/health');
  assert.equal(normalizeApiPathname('/admin/results'), '/admin/results');
  assert.equal(normalizeApiPathname('/'), '/');
});
