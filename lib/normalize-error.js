module.exports = function normalizeError(err) {
  return {
    when: new Date(),
    message: err.message,
    stack: err.stack,
  };
};
