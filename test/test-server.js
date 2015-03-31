var auth = require('../index').auth,
    createServer = require('../index').createServer;

var Socket = require('net').Socket,
    cpexec = require('child_process').execFile,
    http = require('http'),
    path = require('path'),
    assert = require('assert');

var t = -1,
    group = path.basename(__filename, '.js') + '/',
    httpServer;

var HTTP_RESPONSE = 'hello from the node.js http server!';

var tests = [
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function(info, accept) {
        assert(info.cmd === 'connect',
               makeMsg(what, 'Unexpected command: ' + info.cmd));
        assert(typeof info.srcAddr === 'string' && info.srcAddr.length,
               makeMsg(what, 'Bad srcAddr'));
        assert(typeof info.srcPort === 'number' && info.srcPort > 0,
               makeMsg(what, 'Bad srcPort'));
        assert(typeof info.dstAddr === 'string' && info.dstAddr.length,
               makeMsg(what, 'Bad dstAddr'));
        assert(typeof info.dstPort === 'number' && info.dstPort > 0,
               makeMsg(what, 'Bad dstPort'));
        conns.push(info);
        accept();
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err, stdout, stderr) {
          server.close();
          assert(!err, makeMsg(what, 'Unexpected client error: '
                                     + extractCurlError(stderr)));
          assert(stdout === HTTP_RESPONSE,
                 makeMsg(what, 'Response mismatch'));
          assert(conns.length === 1,
                 makeMsg(what, 'Wrong number of connections'));
          next();
        });
      });
    },
    what: 'No authentication, normal accept'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function(info, accept) {
        assert(info.cmd === 'connect',
               makeMsg(what, 'Unexpected command: ' + info.cmd));
        assert(typeof info.srcAddr === 'string' && info.srcAddr.length,
               makeMsg(what, 'Bad srcAddr'));
        assert(typeof info.srcPort === 'number' && info.srcPort > 0,
               makeMsg(what, 'Bad srcPort'));
        assert(typeof info.dstAddr === 'string' && info.dstAddr.length,
               makeMsg(what, 'Bad dstAddr'));
        assert(typeof info.dstPort === 'number' && info.dstPort > 0,
               makeMsg(what, 'Bad dstPort'));
        conns.push(info);
        accept();
      });

      server.useAuth(auth.UserPassword(function(user, pass, cb) {
        cb(user === 'nodejs' && pass === 'rules');
      }));

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    '-U',
                    'nodejs:rules',
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err, stdout, stderr) {
          server.close();
          assert(!err, makeMsg(what, 'Unexpected client error: '
                                     + extractCurlError(stderr)));
          assert(stdout === HTTP_RESPONSE,
                 makeMsg(what, 'Response mismatch'));
          assert(conns.length === 1,
                 makeMsg(what, 'Wrong number of connections'));
          next();
        });
      });
    },
    what: 'User/Password authentication (valid credentials), normal accept'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function() {
        assert(false, makeMsg(what, 'Unexpected connection'));
      });

      server.useAuth(auth.UserPassword(function(user, pass, cb) {
        cb(user === 'nodejs' && pass === 'rules');
      }));

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    '-U',
                    'php:rules',
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err) {
          server.close();
          assert(err, makeMsg(what, 'Expected client error'));
          assert(conns.length === 0,
                 makeMsg(what, 'Unexpected connection(s)'));
          next();
        });
      });
    },
    what: 'User/Password authentication (invalid credentials)'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function() {
        assert(false, makeMsg(what, 'Unexpected connection'));
      });

      server.useAuth(auth.UserPassword(function() {
        assert(false, makeMsg(what, 'Unexpected User/Password auth'));
      }));

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err) {
          server.close();
          assert(err, makeMsg(what, 'Expected client error'));
          assert(conns.length === 0,
                 makeMsg(what, 'Unexpected connection(s)'));
          next();
        });
      });
    },
    what: 'No matching authentication method'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function(info, accept, deny) {
        conns.push(info);
        deny();
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err) {
          server.close();
          assert(err, makeMsg(what, 'Expected client error'));
          assert(conns.length === 1,
                 makeMsg(what, 'Wrong number of connections'));
          next();
        });
      });
    },
    what: 'Deny connection'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server,
          body = 'Interception!';
      server = createServer(function(info, accept) {
        conns.push(info);
        var socket;
        if (socket = accept(true)) {
          socket.end([
            'HTTP/1.1 200 OK',
            'Connection: close',
            'Content-Type: text/plain',
            'Content-Length: ' + Buffer.byteLength(body),
            '',
            body
          ].join('\r\n'));
        }
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err, stdout, stderr) {
          server.close();
          assert(!err, makeMsg(what, 'Unexpected client error: '
                                     + extractCurlError(stderr)));
          assert(stdout === body,
                 makeMsg(what, 'Response mismatch'));
          assert(conns.length === 1,
                 makeMsg(what, 'Wrong number of connections'));
          next();
        });
      });
    },
    what: 'Intercept connection'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function(info, accept) {
        assert(info.cmd === 'connect',
               makeMsg(what, 'Unexpected command: ' + info.cmd));
        assert(typeof info.srcAddr === 'string' && info.srcAddr.length,
               makeMsg(what, 'Bad srcAddr'));
        assert(typeof info.srcPort === 'number' && info.srcPort > 0,
               makeMsg(what, 'Bad srcPort'));
        assert(typeof info.dstAddr === 'string' && info.dstAddr.length,
               makeMsg(what, 'Bad dstAddr'));
        assert(typeof info.dstPort === 'number' && info.dstPort > 0,
               makeMsg(what, 'Bad dstPort'));
        conns.push(info);
        accept();
      });

      server.useAuth(auth.None());
      server.maxConnections = 0;

      server.listen(0, 'localhost', function() {
        var args = ['--socks5',
                    'localhost:' + this.address().port,
                    'http://localhost:' + httpServer.address().port];
        cpexec('curl', args, function(err, stdout, stderr) {
          server.close();
          assert(err, makeMsg(what, 'Expected client error'));
          assert(conns.length === 0,
                 makeMsg(what, 'Wrong number of connections'));
          next();
        });
      });
    },
    what: 'maxConnections'
  },
  { run: function() {
      var what = this.what,
          conns = [],
          server;
      server = createServer(function(info, accept) {
        assert(false,
               makeMsg(what, 'Should not get here for bad client version'));
      });

      server.useAuth(auth.None());

      server.listen(0, 'localhost', function() {
        var clientSock,
            tmr;

        clientSock = new Socket();
        clientSock.on('error', function(err) {
          // ignore errors
        }).on('close', function() {
          assert(tmr !== undefined, makeMsg(what, 'Socket did not connect'));
          clearTimeout(tmr);
          server.close();
          next();
        }).on('connect', function() {
          tmr = setTimeout(function() {
            assert(false,
                   makeMsg(what,
                           'Timeout while waiting for bad client socket end'));
          }, 100);
          clientSock.write(new Buffer([0x04, 0x01, 0x00]));
        }).connect(this.address().port, 'localhost');
      });
    },
    what: 'Disconnect socket on parser error'
  },
];

function extractCurlError(stderr) {
  var m;
  return ((m = /(curl: \(\d+\)[\s\S]+)/i.exec(stderr)) && m[1].trim()) || stderr;
}

function next() {
  if (t === tests.length - 1)
    return destroyHttpServer();
  var v = tests[++t];
  v.run.call(v);
}

function makeMsg(what, msg) {
  return '[' + group + what + ']: ' + msg;
}

function destroyHttpServer() {
  if (httpServer) {
    httpServer.close();
    httpServer = undefined;
  }
}

process.once('uncaughtException', function(err) {
  destroyHttpServer();

  if (t > -1 && !/(?:^|\n)AssertionError: /i.test(''+err))
    console.log(makeMsg(tests[t].what, 'Unexpected Exception:'));

  throw err;
});
process.once('exit', function() {
  destroyHttpServer();

  assert(t === tests.length - 1,
         makeMsg('_exit',
                 'Only finished ' + (t + 1) + '/' + tests.length + ' tests'));
});

cpexec('curl', ['--help'], function(err) {
  if (err) {
    console.error('curl is required to run server tests');
    return;
  }

  // start an http server for cURL to use when passing connections through
  httpServer = http.createServer(function(req, res) {
    req.resume();
    res.statusCode = 200;
    res.end(HTTP_RESPONSE);
  });
  httpServer.listen(0, 'localhost', next);
});
