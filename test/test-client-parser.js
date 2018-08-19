var Parser = require('../lib/client.parser');

var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    assert = require('assert'),
    inherits = require('util').inherits;

var t = -1,
    group = path.basename(__filename, '.js') + '/';

var tests = [
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          method;
      parser.on('method', function(m) {
        method = m;
      }).on('reply', function() {
        assert(false, makeMsg(what, 'Unexpected reply event'));
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05, 0xFF]));
      assert(method === 0xFF,
             makeMsg(what, 'Unexpected method: ' + method));
      next();
    },
    what: 'Phase 1 - Valid (whole)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          method;
      parser.on('method', function(m) {
        method = m;
      }).on('reply', function() {
        assert(false, makeMsg(what, 'Unexpected reply event'));
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05]));
      stream.emit('data', Buffer.from([0x09]));
      assert(method === 0x09,
             makeMsg(what, 'Unexpected method: ' + method));
      next();
    },
    what: 'Phase 1 - Valid (split)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function() {
        assert(false, makeMsg(what, 'Unexpected reply event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x04, 0x09]));
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
          reply;
      parser.authed = true;
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function(r) {
        reply = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x00,
                                      0x00,
                                      0x01,
                                      0xC0, 0xA8, 0x64, 0x01,
                                      0x00, 0x50]));
      assert.deepEqual(reply,
                       { bndAddr: '192.168.100.1', bndPort: 80 },
                       makeMsg(what, 'Reply mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - Success (IPv4)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          reply;
      parser.authed = true;
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function(r) {
        reply = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x00,
                                      0x00,
                                      0x04,
                                      0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA,
                                       0xF9, 0xF8, 0xF7, 0xF6, 0xF5, 0xF4,
                                       0xF3, 0xF2, 0xF1, 0xF0,
                                      0x08, 0x40]));
      assert.deepEqual(reply,
                       { bndAddr: 'fffe:fdfc:fbfa:f9f8:f7f6:f5f4:f3f2:f1f0',
                         bndPort: 2112 },
                       makeMsg(what, 'Reply mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - Success (IPv6)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          reply;
      parser.authed = true;
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function(r) {
        reply = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05,
                                      0x00,
                                      0x00,
                                      0x03,
                                      0x0A, 0x6E, 0x6F, 0x64, 0x65, 0x6A, 0x73,
                                       0x2E, 0x6F, 0x72, 0x67,
                                      0x05, 0x39]));
      assert.deepEqual(reply,
                       { bndAddr: 'nodejs.org',
                         bndPort: 1337 },
                       makeMsg(what, 'Reply mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (whole) - Success (Hostname)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          reply;
      parser.authed = true;
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function(r) {
        reply = r;
      }).on('error', function(err) {
        assert(false, makeMsg(what, 'Unexpected error: ' + err));
      });
      stream.emit('data', Buffer.from([0x05, 0x00]));
      stream.emit('data', Buffer.from([0x00, 0x03, 0x0A, 0x6E, 0x6F, 0x64, 0x65]));
      stream.emit('data', Buffer.from([0x6A, 0x73, 0x2E, 0x6F, 0x72]));
      stream.emit('data', Buffer.from([0x67, 0x05]));
      stream.emit('data', Buffer.from([0x39]));
      assert.deepEqual(reply,
                       { bndAddr: 'nodejs.org',
                         bndPort: 1337 },
                       makeMsg(what, 'Reply mismatch'));
      next();
    },
    what: 'Phase 2 - Valid (split) - Success (Hostname)'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.authed = true;
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function() {
        assert(false, makeMsg(what, 'Unexpected reply event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x05, 0x02]));
      assert(errors.length === 1
             && /connection not allowed by ruleset/i.test(errors[0].message),
             makeMsg(what, 'Error(s) mismatch'));
      next();
    },
    what: 'Phase 2 - Valid - Error'
  },
  { run: function() {
      var what = this.what,
          stream = new FakeStream(),
          parser = new Parser(stream),
          errors = [];
      parser.authed = true;
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function() {
        assert(false, makeMsg(what, 'Unexpected reply event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x04, 0x02]));
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
      parser.on('method', function() {
        assert(false, makeMsg(what, 'Unexpected method event'));
      }).on('reply', function() {
        assert(false, makeMsg(what, 'Unexpected reply event'));
      }).on('error', function(err) {
        errors.push(err);
      });
      stream.emit('data', Buffer.from([0x05, 0x00]));
      stream.emit('data', Buffer.from([0x00, 0xFF, 0x0A, 0x6E, 0x6F, 0x64, 0x65]));
      stream.emit('data', Buffer.from([0x6A, 0x73, 0x2E, 0x6F, 0x72]));
      stream.emit('data', Buffer.from([0x67, 0x05]));
      stream.emit('data', Buffer.from([0x39]));
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
