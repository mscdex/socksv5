var net = require('net'),
    normalizeConnectArgs = net._normalizeConnectArgs,
    dns = require('dns'),
    util = require('util'),
    inherits = util.inherits,
    EventEmitter = require('events').EventEmitter;

var Parser = require('./client.parser'),
    ipbytes = require('./utils').ipbytes;

var CMD = require('./constants').CMD,
    ATYP = require('./constants').ATYP;

function Client(options) {
  if (!(this instanceof Client))
    return new Client(options);

  var self = this;

  EventEmitter.call(this);

  this._hadError = false;
  this._ready = false;
  this._sock = new net.Socket();
  this._sock.on('connect', function() {
    self._onConnect();
  }).on('error', function(err) {
    if (!self._hadError && !self._ready) {
      self._hadError = true;
      self.emit('error', err);
    }
  }).on('close', function(had_err) {
    self.emit('close', self._hadError || had_err);
  });

  this._parser = undefined;

  this._proxyaddr = options && options.proxyHost;
  this._proxyport = options && options.proxyPort;

  if (typeof this._proxyaddr !== 'string')
    this._proxyaddr = 'localhost';
  else if (typeof this._proxyport !== 'number')
    this._proxyport = 1080;

  this._dstaddr = undefined;
  this._dstport = undefined;
  this._localDNS = (options && typeof options.localDNS === 'boolean'
                    ? options.localDNS
                    : true);
  this._strictLocalDNS = (options && typeof options.strictLocalDNS === 'boolean'
                          ? options.strictLocalDNS
                          : true);
  this._auths = [];
  if (options && Array.isArray(options.auths)) {
    for (var i = 0, len = options.auths.length; i < len; ++i)
      this.useAuth(options.auths[i]);
  }
}
inherits(Client, EventEmitter);

Client.prototype._onConnect = function() {
  var self = this,
      parser = this._parser,
      socket = this._sock;

  var auths = self._auths,
      alen = auths.length,
      authsbuf = new Buffer(2 + alen);
  authsbuf[0] = 0x05;
  authsbuf[1] = alen;
  for (var a = 0, p = 2; a < alen; ++a, ++p)
    authsbuf[p] = auths[a].METHOD;
  socket.write(authsbuf);

  parser.on('method', function(method) {
    alen = auths.length;
    for (var i = 0; i < alen; ++i) {
      if (auths[i].METHOD === method) {
        auths[i].client(socket, function(result) {
          if (result === true) {
            parser.authed = true;
            parser.start();
            self._sendRequest();
          } else {
            self._hadError = true;
            if (util.isError(result))
              self.emit('error', result);
            else {
              var err = new Error('Authentication failed');
              err.code = 'EAUTHFAILED';
              self.emit('error', err);
            }
            socket.end();
          }
        });
        self._sock.resume();
        return;
      }
    }

    var err = new Error('Authentication method mismatch');
    err.code = 'EAUTHNOTSUPPORT';
    self._hadError = true;
    self.emit('error', err);
    socket.end();
  }).on('error', function(err) {
    self._hadError = true;
    self.emit('error', err);
    if (socket.writable)
      socket.end();
  }).on('reply', function(repInfo) {
    self._ready = true;
    self.emit('connect', self._sock);
    self._sock.resume();
  });
};

Client.prototype._sendRequest = function() {
  var self = this,
      iptype = net.isIP(this._dstaddr);

  var addrlen = (iptype === 0
                 ? Buffer.byteLength(self._dstaddr)
                 : (iptype === 4 ? 4 : 16)),
      reqbuf = new Buffer(6 + (iptype === 0 ? 1 : 0) + addrlen),
      p;
  reqbuf[0] = 0x05;
  reqbuf[1] = CMD.CONNECT;
  reqbuf[2] = 0x00;
  if (iptype > 0) {
    var addrbytes = ipbytes(self._dstaddr);
    reqbuf[3] = (iptype === 4 ? ATYP.IPv4 : ATYP.IPv6);
    p = 4;
    for (var i = 0; i < addrlen; ++i, ++p)
      reqbuf[p] = addrbytes[i];
  } else {
    reqbuf[3] = ATYP.NAME;
    reqbuf[4] = addrlen;
    reqbuf.write(self._dstaddr, 5, addrlen);
    p = 5 + addrlen;
  }
  reqbuf.writeUInt16BE(self._dstport, p, true);

  self._sock.write(reqbuf);
};

Client.prototype.useAuth = function(auth) {
  if (typeof auth !== 'object'
      || typeof auth.client !== 'function'
      || auth.client.length !== 2)
    throw new Error('Invalid authentication handler');
  else if (this._auths.length >= 255)
    throw new Error('Too many authentication handlers (limited to 255).');

  this._auths.push(auth);

  return this;
};

Client.prototype.connect = function(options, cb) {
  var self = this;

  if (this._auths.length === 0)
    throw new Error('Missing client authentication method(s)');

  if (typeof options !== 'object') {
    // Old API:
    // connect(port, [host], [cb])
    // connect(path, [cb]);
    var args = normalizeConnectArgs(arguments);
    return Client.prototype.connect.apply(this, args);
  }

  if (!options.port)
    throw new Error('Can only connect to TCP hosts');

  if (typeof cb === 'function')
    this.once('connect', cb);

  this._dstaddr = options.host || 'localhost';
  this._dstport = +options.port;

  if (typeof options.localDNS === 'boolean')
    this._localDNS = options.localDNS;
  if (typeof options.strictLocalDNS === 'boolean')
    this._strictLocalDNS = options.strictLocalDNS;
  if (typeof options.proxyHost === 'string')
    this._proxyhost = options.proxyHost;
  if (typeof options.proxyPort === 'string')
    this._proxyport = options.proxyPort;

  if (this._parser)
    this._parser.stop();
  this._parser = new Parser(this._sock);

  this._hadError = this._ready = false;

  var realOptions = {
    host: this._proxyhost,
    port: this._proxyport,
    localAddress: options.localAddress // TODO: remove?
  };

  if (net.isIP(this._dstaddr) === 0 && this._localDNS) {
    dns.lookup(this._dstaddr, function(err, addr) {
      if (err && self._strictLocalDNS) {
        self._hadError = true;
        self.emit('error', err);
        self.emit('close', true);
        return;
      }
      if (addr)
        self._dstaddr = addr;
      self._sock.connect(realOptions);
    });
  } else
    this._sock.connect(realOptions);

  return this;
};

exports.Client = Client;
exports.connect = exports.createConnection = function() {
  var args = normalizeConnectArgs(arguments),
      client = new Client(args[0]);
  process.nextTick(function() {
    Client.prototype.connect.apply(client, args);
  });
  return client;
};
