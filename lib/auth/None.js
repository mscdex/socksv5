module.exports = function() {
  function handler(stream, cb) {
    cb(true);
  }
  handler.METHOD = 0x00;
  return handler;
};
