var inherits = require('util').inherits,
    EventEmitter = require('events').EventEmitter;

var ATYP = require('./constants').ATYP,
    REP = require('./constants').REP;

var STATE_VERSION = 0,
    STATE_METHOD = 1,
    STATE_REP_STATUS = 2,
    STATE_REP_RSV = 3,
    STATE_REP_ATYP = 4,
    STATE_REP_BNDADDR = 5,
    STATE_REP_BNDADDR_VARLEN = 6,
    STATE_REP_BNDPORT = 7;

var ERRORS = {},
    ERROR_UNKNOWN = ['unknown error', 'EUNKNOWN'];
ERRORS[REP.GENFAIL] = ['general SOCKS server failure', 'EGENFAIL'];
ERRORS[REP.DISALLOW] = ['connection not allowed by ruleset', 'EACCES'];
ERRORS[REP.NETUNREACH] = ['network is unreachable', 'ENETUNREACH'];
ERRORS[REP.HOSTUNREACH] = ['host is unreachable', 'EHOSTUNREACH'];
ERRORS[REP.CONNREFUSED] = ['connection refused', 'ECONNREFUSED'];
ERRORS[REP.TTLEXPIRED] = ['ttl expired', 'ETTLEXPIRED'];
ERRORS[REP.CMDUNSUPP] = ['command not supported', 'ECMDNOSUPPORT'];
ERRORS[REP.ATYPUNSUPP] = ['address type not supported', 'EATYPNOSUPPORT'];

function Parser(stream) {
  var self = this;

  this._stream = stream;
  this._listening = false;
  this.__onData = function(chunk) {
    self._onData(chunk);
  };

  this._state = STATE_VERSION;
  this._atyp = 0;
  this._bndaddr = undefined;
  this._bndaddrp = 0;
  this._bndport = undefined;

  this.authed = false;

  this.start();
}
inherits(Parser, EventEmitter);

Parser.prototype._onData = function(chunk) {
  var state = this._state,
      i = 0,
      len = chunk.length,
      left,
      chunkLeft,
      minLen;

  while (i < len) {
    switch (state) {
      /*
        +----+--------+
        |VER | METHOD |
        +----+--------+
        | 1  |   1    |
        +----+--------+
      */
      case STATE_VERSION:
        if (chunk[i] !== 0x05) {
          this.emit('error',
                    new Error('Incompatible SOCKS protocol version: '
                              + chunk[i]));
          return;
        }
        ++i;
        if (this.authed)
          state = STATE_REP_STATUS;
        else
          ++state;
      break;
      case STATE_METHOD:
        var method = chunk[i];
        ++i;
        this.stop();
        this._state = STATE_VERSION;
        if (i < len)
          this._stream.unshift(chunk.slice(i));
        this.emit('method', method);
        return;
      break;
      // =======================================================================
      /*
        +----+-----+-------+------+----------+----------+
        |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
        +----+-----+-------+------+----------+----------+
        | 1  |  1  | X'00' |  1   | Variable |    2     |
        +----+-----+-------+------+----------+----------+

        Where:

          o  VER    protocol version: X'05'
          o  REP    Reply field:
             o  X'00' succeeded
             o  X'01' general SOCKS server failure
             o  X'02' connection not allowed by ruleset
             o  X'03' Network unreachable
             o  X'04' Host unreachable
             o  X'05' Connection refused
             o  X'06' TTL expired
             o  X'07' Command not supported
             o  X'08' Address type not supported
             o  X'09' to X'FF' unassigned
          o  RSV    RESERVED
          o  ATYP   address type of following address
             o  IP V4 address: X'01'
             o  DOMAINNAME: X'03'
             o  IP V6 address: X'04'
          o  BND.ADDR       server bound address
          o  BND.PORT       server bound port in network octet order
      */
      case STATE_REP_STATUS:
        var status = chunk[i];
        if (status !== REP.SUCCESS) {
          var errinfo = ERRORS[status] || ERROR_UNKNOWN,
              err = new Error(errinfo[0]);
          err.code = errinfo[1];

          this.stop();
          this.emit('error', err);
          return;
        }
        ++i;
        ++state;
      break;
      case STATE_REP_RSV:
        ++i;
        ++state;
      break;
      case STATE_REP_ATYP:
        var atyp = chunk[i];
        state = STATE_REP_BNDADDR;
        if (atyp === ATYP.IPv4)
          this._bndaddr = new Buffer(4);
        else if (atyp === ATYP.IPv6)
          this._bndaddr = new Buffer(16);
        else if (atyp === ATYP.NAME)
          state = STATE_REP_BNDADDR_VARLEN;
        else {
          this.stop();
          this.emit('error',
                    new Error('Invalid request address type: ' + atyp));
          return;
        }
        this._atyp = atyp;
        ++i;
      break;
      case STATE_REP_BNDADDR:
        left = this._bndaddr.length - this._bndaddrp;
        chunkLeft = len - i;
        minLen = (left < chunkLeft ? left : chunkLeft);
        chunk.copy(this._bndaddr,
                   this._bndaddrp,
                   i,
                   i + minLen);
        this._bndaddrp += minLen;
        i += minLen;
        if (this._bndaddrp === this._bndaddr.length)
          state = STATE_REP_BNDPORT;
      break;
      case STATE_REP_BNDADDR_VARLEN:
        this._bndaddr = new Buffer(chunk[i]);
        state = STATE_REP_BNDADDR;
        ++i;
      break;
      case STATE_REP_BNDPORT:
        if (this._bndport === undefined)
          this._bndport = chunk[i];
        else {
          this._bndport <<= 8;
          this._bndport += chunk[i];
          ++i;

          this.stop();
          if (i < len)
            this._stream.unshift(chunk.slice(i));

          if (this._atyp === ATYP.IPv4)
            this._bndaddr = Array.prototype.join.call(this._bndaddr, '.');
          else if (this._atyp === ATYP.IPv6) {
            var ipv6str = '',
                addr = this._bndaddr;
            for (var b = 0; b < 16; ++b) {
              if (b % 2 === 0 && b > 0)
                ipv6str += ':';
              ipv6str += addr[b].toString(16);
            }
            this._bndaddr = ipv6str;
          } else
            this._bndaddr = this._bndaddr.toString();

          this.emit('reply', {
            bndAddr: this._bndaddr,
            bndPort: this._bndport
          });
          return;
        }
        ++i;
      break;
      // ===================================================================
    }
  }

  this._state = state;
};

Parser.prototype.start = function() {
  if (this._listening)
    return;
  this._listening = true;
  this._stream.on('data', this.__onData);
  this._stream.resume();
};

Parser.prototype.stop = function() {
  if (!this._listening)
    return;
  this._listening = false;
  this._stream.removeListener('data', this.__onData);
  this._stream.pause();
};

module.exports = Parser;
