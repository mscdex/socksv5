var STATE_VERSION = 0,
    STATE_ULEN = 1,
    STATE_UNAME = 2,
    STATE_PLEN = 3,
    STATE_PASSWD = 4;

var BUF_SUCCESS = new Buffer([0x05, 0x00]),
    BUF_FAILURE = new Buffer([0x05, 0x01]);

module.exports = function(authcb) {
  if (typeof authcb !== 'function')
    throw new Error('Missing authentication callback');

  function handler(stream, cb) {
    var state = STATE_VERSION,
        user,
        userp = 0,
        pass,
        passp = 0;

    function onData(chunk) {
      var i = 0,
          len = chunk.length,
          left,
          chunkLeft,
          minLen;

      while (i < len) {
        switch (state) {
          /*
            +----+------+----------+------+----------+
            |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
            +----+------+----------+------+----------+
            | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
            +----+------+----------+------+----------+
          */
          case STATE_VERSION:
            if (chunk[i] !== 0x01) {
              cb(new Error('Unsupported auth request version: ' + chunk[i]));
              return;
            }
            ++i;
            ++state;
          break;
          case STATE_ULEN:
            var ulen = chunk[i];
            if (ulen === 0) {
              cb(new Error('Bad username length (0)'));
              return;
            }
            ++i;
            ++state;
            user = new Buffer(ulen);
            userp = 0;
          break;
          case STATE_UNAME:
            left = user.length - userp;
            chunkLeft = len - i;
            minLen = (left < chunkLeft ? left : chunkLeft);
            chunk.copy(user,
                       userp,
                       i,
                       i + minLen);
            userp += minLen;
            i += minLen;
            if (userp === user.length) {
              user = user.toString('utf8');
              ++state;
            }
          break;
          case STATE_PLEN:
            var plen = chunk[i];
            if (plen === 0) {
              cb(new Error('Bad password length (0)'));
              return;
            }
            ++i;
            ++state;
            pass = new Buffer(plen);
            passp = 0;
          break;
          case STATE_PASSWD:
            left = pass.length - passp;
            chunkLeft = len - i;
            minLen = (left < chunkLeft ? left : chunkLeft);
            chunk.copy(pass,
                       passp,
                       i,
                       i + minLen);
            passp += minLen;
            i += minLen;
            if (passp === pass.length) {
              stream.removeListener('data', onData);
              pass = pass.toString('utf8');
              ++state;
              if (i < len)
                stream.unshift(chunk.slice(i));
              authcb(user, pass, function(success) {
                if (stream.writable) {
                  if (success)
                    stream.write(BUF_SUCCESS);
                  else
                    stream.write(BUF_FAILURE);
                  cb(success);
                }
              });
              return;
            }
          break;
          // ===================================================================
        }
      }
    }
    stream.on('data', onData);
  }
  handler.METHOD = 0x02;
  return handler;
};
