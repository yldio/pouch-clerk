'use strict';

module.exports = function normalizeError(err) {
  /* istanbul ignore next */
  if (! (err instanceof Error)) {
    throw new Error('Error is not instance of Error');
  }
  return {
    when: new Date(),
    message: err.message,
    stack: err.stack,
  };
};
