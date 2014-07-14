var auth = require('../index').auth,
    createServer = require('../index').createServer,
    connect = require('../index').connect;

var path = require('path'),
    assert = require('assert');

var t = -1,
    group = path.basename(__filename, '.js') + '/';

var PROXY_RESPONSE = 'hello from the node.js proxy server!';

var tests = [
  { run: function() {
      var what = this.what,
          conns = 0,
          response,
          server;
      server = createServer(function(info, accept) {
        ++conns;
        var socket;
        if (socket = accept(true))
          socket.end(PROXY_RESPONSE);
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        connect({
          host: 'localhost',
          port: 1,
          proxyHost: 'localhost',
          proxyPort: server.address().port
        }, function(socket) {
          bufferStream(socket, 'ascii', function(data) {
            response = data;
          });
        }).on('error', function(err) {
          assert(false, makeMsg(what, 'Unexpected error: ' + err));
        }).on('close', function() {
          server.close();
          // allow bufferStream() callback to be called first
          process.nextTick(function() {
            assert(response === PROXY_RESPONSE,
                   makeMsg(what, 'Response mismatch'));
            assert(conns === 1,
                   makeMsg(what, 'Wrong number of connections'));
            next();
          });
        }).useAuth(auth.None());
      });
    },
    what: 'No authentication'
  },
  { run: function() {
      var what = this.what,
          conns = 0,
          response,
          server;
      server = createServer(function(info, accept) {
        ++conns;
        var socket;
        if (socket = accept(true))
          socket.end(PROXY_RESPONSE);
      });

      server.useAuth(auth.UserPassword(function(user, pass, cb) {
        cb(user === 'nodejs' && pass === 'rules');
      }));

      server.listen(0, 'localhost', function() {
        connect({
          host: 'localhost',
          port: 1,
          proxyHost: 'localhost',
          proxyPort: server.address().port
        }, function(socket) {
          bufferStream(socket, 'ascii', function(data) {
            response = data;
          });
        }).on('error', function(err) {
          assert(false, makeMsg(what, 'Unexpected error: ' + err));
        }).on('close', function() {
          server.close();
          // allow bufferStream() callback to be called first
          process.nextTick(function() {
            assert(response === PROXY_RESPONSE,
                   makeMsg(what, 'Response mismatch'));
            assert(conns === 1,
                   makeMsg(what, 'Wrong number of connections'));
            next();
          });
        }).useAuth(auth.UserPassword('nodejs', 'rules'));
      });
    },
    what: 'User/Password authentication (valid credentials)'
  },
  { run: function() {
      var what = this.what,
          errors = [],
          server;
      server = createServer(function() {
        assert(false, makeMsg(what, 'Unexpected connection'));
      });

      server.useAuth(auth.UserPassword(function(user, pass, cb) {
        cb(user === 'nodejs' && pass === 'rules');
      }));

      server.listen(0, 'localhost', function() {
        connect({
          host: 'localhost',
          port: 1,
          proxyHost: 'localhost',
          proxyPort: server.address().port
        }, function() {
          assert(false, makeMsg(what, 'Unexpected connect callback'));
        }).on('error', function(err) {
          errors.push(err);
        }).on('close', function() {
          server.close();
          assert(errors.length === 1
                 && /authentication failed/i.test(errors[0].message),
                 makeMsg(what, 'Expected 1 error'));
          next();
        }).useAuth(auth.UserPassword('php', 'rules'));
      });
    },
    what: 'User/Password authentication (invalid credentials)'
  },
  { run: function() {
      var what = this.what,
          errors = [],
          server;
      server = createServer(function() {
        assert(false, makeMsg(what, 'Unexpected connection'));
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        connect({
          host: 'localhost',
          port: 1,
          proxyHost: 'localhost',
          proxyPort: server.address().port
        }, function() {
          assert(false, makeMsg(what, 'Unexpected connect callback'));
        }).on('error', function(err) {
          errors.push(err);
        }).on('close', function() {
          server.close();
          assert(errors.length === 1
                 && /Authentication method mismatch/i.test(errors[0].message),
                 makeMsg(what, 'Expected 1 error'));
          next();
        }).useAuth(auth.UserPassword('nodejs', 'rules'));
      });
    },
    what: 'No matching authentication method'
  },
  { run: function() {
      var what = this.what,
          conns = 0,
          errors = [],
          server;
      server = createServer(function(info, accept, deny) {
        ++conns;
        deny();
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        connect({
          host: 'localhost',
          port: 1,
          proxyHost: 'localhost',
          proxyPort: server.address().port
        }, function() {
          assert(false, makeMsg(what, 'Unexpected connect callback'));
        }).on('error', function(err) {
          errors.push(err);
        }).on('close', function() {
          server.close();
          assert(errors.length === 1
                 && /not allowed by ruleset/i.test(errors[0].message),
                 makeMsg(what, 'Expected 1 error'));
          assert(conns === 1,
                 makeMsg(what, 'Wrong number of connections'));
          next();
        }).useAuth(auth.None());
      });
    },
    what: 'Denied connection'
  },
];

function bufferStream(stream, encoding, cb) {
  var buf;
  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = undefined;
  }
  if (!encoding) {
    var nb = 0;
    stream.on('data', function(d) {
      if (nb === 0)
        buf = [ d ];
      else
        buf.push(d);
      nb += d.length;
    }).on((stream.writable ? 'close' : 'end'), function() {
      cb(nb ? Buffer.concat(buf, nb) : buf);
    });
  } else {
    stream.on('data', function(d) {
      if (!buf)
        buf = d;
      else
        buf += d;
    }).on((stream.writable ? 'close' : 'end'), function() {
      cb(buf);
    }).setEncoding(encoding);
  }
}

function next() {
  if (t === tests.length - 1)
    return;
  var v = tests[++t];
  v.run.call(v);
}

function makeMsg(what, msg) {
  return '[' + group + what + ']: ' + msg;
}

process.once('uncaughtException', function(err) {
  if (t > -1 && !/(?:^|\n)AssertionError: /i.test(''+err))
    console.log(makeMsg(tests[t].what, 'Unexpected Exception:'));

  throw err;
});
process.once('exit', function() {
  assert(t === tests.length - 1,
         makeMsg('_exit',
                 'Only finished ' + (t + 1) + '/' + tests.length + ' tests'));
});

next();