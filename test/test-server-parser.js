var Parser = require('../lib/server.parser');

var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    assert = require('assert'),
    inspect = require('util').inspect,
    inherits = require('util').inherits;

var t = -1,
    group = path.basename(__filename, '.js') + '/';

var tests = [
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          methods;
      parser.on('methods', function(m) {
        methods = m;
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05, 0x01, 0x00]));
      assert.deepEqual(methods,
                       Buffer.from([0x00]),
                       makeMsg(what, 'Unexpected methods: ' + inspect(methods)));
      next();
    },
    what: 'Phase 1 - Valid (whole)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          methods;
      parser.on('methods', function(m) {
        methods = m;
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05]));
      stream.emit('data', Buffer.from([0x01]));
      stream.emit('data', Buffer.from([0x00]));
      assert.deepEqual(methods,
                       Buffer.from([0x00]),
                       makeMsg(what, 'Unexpected methods: ' + inspect(methods)));
      next();
    },
    what: 'Phase 1 - Valid (split)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x04, 0x01, 0x00]));
      assert(errors.length === 1
             && /Incompatible SOCKS protocol version: 4/i.test(errors[0].message),
             makeMsg(what, 'Error(s) mismatch'));
      next();
    },
    what: 'Phase 1 - Bad version'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x05, 0x00]));
      assert(errors.length === 1
             && /empty methods list/i.test(errors[0].message),
             makeMsg(what, 'Error(s) mismatch'));
      next();
    },
    what: 'Phase 1 - Bad method count'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          request;
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function(r) {
        request = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x01,
                                      0x00,
                                      0x01,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert.deepEqual(request,
                       { cmd: 'connect',
                         srcAddr: undefined,
                         srcPort: undefined,
                         dstAddr: '192.168.100.1',
                         dstPort: 80 },
                       makeMsg(what, 'Request mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - CONNECT (IPv4)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          request;
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function(r) {
        request = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x02,
                                      0x00,
                                      0x01,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert.deepEqual(request,
                       { cmd: 'bind',
                         srcAddr: undefined,
                         srcPort: undefined,
                         dstAddr: '192.168.100.1',
                         dstPort: 80 },
                       makeMsg(what, 'Request mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - BIND (IPv4)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          request;
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function(r) {
        request = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x03,
                                      0x00,
                                      0x01,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert.deepEqual(request,
                       { cmd: 'udp',
                         srcAddr: undefined,
                         srcPort: undefined,
                         dstAddr: '192.168.100.1',
                         dstPort: 80 },
                       makeMsg(what, 'Request mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - UDP ASSOCIATE (IPv4)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          request;
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function(r) {
        request = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x01,
                                      0x00,
                                      0x04,
                                      0xFF, 0xFE, 0xE0, 0xD0,
                                       0x00, 0x0C, 0x00, 0xA0,
                                       0x00, 0x00, 0x03, 0x00,
                                       0x00, 0x02, 0xB0, 0x01,
                                      0x08, 0x40]));
      assert.deepEqual(request,
                       { cmd: 'connect',
                         srcAddr: undefined,
                         srcPort: undefined,
                         dstAddr: 'fffe:e0d0:000c:00a0:0000:0300:0002:b001',
                         dstPort: 2112 },
                       makeMsg(what, 'Request mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - CONNECT (IPv6)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          request;
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function(r) {
        request = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x01,
                                      0x00,
                                      0x03,
                                      0x0A, 0x6E, 0x6F, 0x64, 0x65, 0x6A, 0x73,
                                       0x2E, 0x6F, 0x72, 0x67,
                                      0x05, 0x39]));
      assert.deepEqual(request,
                       { cmd: 'connect',
                         srcAddr: undefined,
                         srcPort: undefined,
                         dstAddr: 'nodejs.org',
                         dstPort: 1337 },
                       makeMsg(what, 'Request mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - CONNECT (Hostname)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          request;
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function(r) {
        request = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05]));
      stream.emit('data', Buffer.from([0x01, 0x00, 0x03]));
      stream.emit('data', Buffer.from([0x0A]));
      stream.emit('data', Buffer.from([0x6E, 0x6F, 0x64, 0x65, 0x6A, 0x73]));
      stream.emit('data', Buffer.from([0x2E, 0x6F, 0x72]));
      stream.emit('data', Buffer.from([0x67]));
      stream.emit('data', Buffer.from([0x05]));
      stream.emit('data', Buffer.from([0x39]));
      assert.deepEqual(request,
                       { cmd: 'connect',
                         srcAddr: undefined,
                         srcPort: undefined,
                         dstAddr: 'nodejs.org',
                         dstPort: 1337 },
                       makeMsg(what, 'Request mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (split) - CONNECT (Hostname)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x04,
                                      0x01,
                                      0x00,
                                      0x01,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert(errors.length === 1
             && /Incompatible SOCKS protocol version: 4/i.test(errors[0].message),
             makeMsg(what, 'Error(s) mismatch'));
      next();
    },
    what: 'Phase 2 - Bad version'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x05,
                                      0xFE,
                                      0x00,
                                      0x01,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert(errors.length === 1
             && /invalid request command: 254/i.test(errors[0].message),
             makeMsg(what, 'Error(s) mismatch'));
      next();
    },
    what: 'Phase 2 - Bad command'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.authed = true;
      parser.on('methods', function() {
        assert(false, makeMsg(what, 'Unexpected methods event'));
      }).on('request', function() {
        assert(false, makeMsg(what, 'Unexpected request event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x01,
                                      0x00,
                                      0xFF,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert(errors.length === 1
             && /Invalid request address type: 255/i.test(errors[0].message),
             makeMsg(what, 'Error(s) mismatch'));
      next();
    },
    what: 'Phase 2 - Bad address type'
  },
];

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



function FakeStream() {
  EventEmitter.call(this);
}
inherits(FakeStream, EventEmitter);
FakeStream.prototype.pause = function() {};
FakeStream.prototype.resume = function() {};


next();
