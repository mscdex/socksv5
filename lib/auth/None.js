module.exports = function NoneAuthHandlers() {
  return {
    METHOD: 0x00,
    server: function serverHandler(stream, cb) {
      cb(true);
    },
    client: function clientHandler(stream, cb) {
      cb(true);
    }
  };
};
