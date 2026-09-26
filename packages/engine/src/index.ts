/**
 * @vellum/engine — Pure computation layer
 *
 * No filesystem, no git, no network, no clock.
 * Stateless functions that compute lifecycle state, approvals, evidence, and verification.
 */

// Core engine components
export * from './artifact.js';

// Quality checker (Slice 3)
export * from './quality/index.js';

// Protocol validator (Slice 1)
export * from './validate/index.js';

// Policy engine (Slice 2)
export * from './policy/index.js';

// Gate runner (Slice 3)
export * from './gate/index.js';

// Metrics (Slice 4)
export * from './metrics/index.js';
