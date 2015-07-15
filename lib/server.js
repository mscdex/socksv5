var net = require('net'),
    dns = require('dns'),
    util = require('util'),
    inherits = util.inherits,
    EventEmitter = require('events').EventEmitter;

var Parser = require('./server.parser'),
    ipbytes = require('./utils').ipbytes;

var ATYP = require('./constants').ATYP,
    REP = require('./constants').REP;

var BUF_AUTH_NO_ACCEPT = new Buffer([0x05, 0xFF]),
    BUF_REP_INTR_SUCCESS = new Buffer([0x05,
                                       REP.SUCCESS,
                                       0x00,
                                       0x01,
                                       0x00, 0x00, 0x00, 0x00,
                                       0x00, 0x00]),
    BUF_REP_DISALLOW = new Buffer([0x05, REP.DISALLOW]),
    BUF_REP_CMDUNSUPP = new Buffer([0x05, REP.CMDUNSUPP]);

function Server(options, listener) {
  if (!(this instanceof Server))
    return new Server(options, listener);

  var self = this;

  if (typeof options === 'function') {
    self.on('connection', options);
    options = undefined;
  } else if (typeof listener === 'function')
    self.on('connection', listener);

  EventEmitter.call(this);

  this._srv = new net.Server(function(socket) {
    if (self._connections >= self.maxConnections) {
      socket.destroy();
      return;
    }
    ++self._connections;
    socket.once('close', function(had_err) {
      --self._connections;
    });
    self._onConnection(socket);
  }).on('error', function(err) {
    self.emit('error', err);
  }).on('listening', function() {
    self.emit('listening');
  }).on('close', function() {
    self.emit('close');
  });
  this._auths = [];
  if (options && Array.isArray(options.auths)) {
    for (var i = 0, len = options.auths.length; i < len; ++i)
      this.useAuth(options.auths[i]);
  }
  this._debug = (options && typeof options.debug === 'function'
                 ? options.debug
                 : undefined);

  this._connections = 0;
  this.maxConnections = Infinity;
}
inherits(Server, EventEmitter);

Server.prototype._onConnection = function(socket) {
  var self = this,
      parser = new Parser(socket);
  parser.on('error', function(err) {
    if (socket.writable)
      socket.end();
  }).on('methods', function(methods) {
    var auths = self._auths;
    for (var a = 0, alen = auths.length; a < alen; ++a) {
      for (var m = 0, mlen = methods.length; m < mlen; ++m) {
        if (methods[m] === auths[a].METHOD) {
          auths[a].server(socket, function(result) {
            if (result === true) {
              parser.authed = true;
              parser.start();
            } else {
              if (util.isError(result))
                self._debug && self._debug('Error: ' + result.message);
              socket.end();
            }
          });
          socket.write(new Buffer([0x05, auths[a].METHOD]));
          socket.resume();
          return;
        }
      }
    }
    socket.end(BUF_AUTH_NO_ACCEPT);
  }).on('request', function(reqInfo) {
    if (reqInfo.cmd !== 'connect')
      return socket.end(BUF_REP_CMDUNSUPP);

    reqInfo.srcAddr = socket.remoteAddress;
    reqInfo.srcPort = socket.remotePort;

    var handled = false;

    function accept(intercept) {
      if (handled)
        return;
      handled = true;
      if (socket.writable) {
        if (intercept) {
          socket.write(BUF_REP_INTR_SUCCESS);
          socket.removeListener('error', onErrorNoop);
          process.nextTick(function() {
            socket.resume();
          });
          return socket;
        } else
          proxySocket(socket, reqInfo);
      }
    }
    function deny() {
      if (handled)
        return;
      handled = true;
      if (socket.writable)
        socket.end(BUF_REP_DISALLOW);
    }

    if (self._events.connection) {
      self.emit('connection', reqInfo, accept, deny);
      return;
    }

    proxySocket(socket, reqInfo);
  });

  function onClose() {
    if (socket.dstSock && socket.dstSock.writable)
      socket.dstSock.end();
    socket.dstSock = undefined;
  }

  socket.on('error', onErrorNoop)
        .on('end', onClose)
        .on('close', onClose);
};

Server.prototype.useAuth = function(auth) {
  if (typeof auth !== 'object'
      || typeof auth.server !== 'function'
      || auth.server.length !== 2)
    throw new Error('Invalid authentication handler');
  else if (this._auths.length >= 255)
    throw new Error('Too many authentication handlers (limited to 255).');

  this._auths.push(auth);

  return this;
};

Server.prototype.listen = function() {
  this._srv.listen.apply(this._srv, arguments);
  return this;
};

Server.prototype.address = function() {
  return this._srv.address();
};

Server.prototype.getConnections = function(cb) {
  this._srv.getConnections(cb);
};

Server.prototype.close = function(cb) {
  this._srv.close(cb);
  return this;
};

Server.prototype.ref = function() {
  this._srv.ref();
};

Server.prototype.unref = function() {
  this._srv.unref();
};


exports.Server = Server;
exports.createServer = function(opts, listener) {
  return new Server(opts, listener);
};


function onErrorNoop(err) {}

function proxySocket(socket, req) {
  dns.lookup(req.dstAddr, function(err, dstIP) {
    if (err) {
      handleProxyError(socket, err);
      return;
    }

    function onError(err) {
      if (!connected)
        handleProxyError(socket, err);
    }

    var dstSock = new net.Socket(),
        connected = false;

    dstSock.setKeepAlive(false);
    dstSock.on('error', onError)
           .on('connect', function() {
             connected = true;
             if (socket.writable) {
              var localbytes = ipbytes(dstSock.localAddress || '127.0.0.1'),
                  len = localbytes.length,
                  bufrep = new Buffer(6 + len),
                  p = 4;
              bufrep[0] = 0x05;
              bufrep[1] = REP.SUCCESS;
              bufrep[2] = 0x00;
              bufrep[3] = (len === 4 ? ATYP.IPv4 : ATYP.IPv6);
              for (var i = 0; i < len; ++i, ++p)
                bufrep[p] = localbytes[i];
              bufrep.writeUInt16BE(dstSock.localPort, p, true);

              socket.write(bufrep);
              socket.pipe(dstSock).pipe(socket);
              socket.resume();
             } else if (dstSock.writable)
              dstSock.end();
           })
           .connect(req.dstPort, dstIP);
    socket.dstSock = dstSock;
  });
}

function handleProxyError(socket, err) {
  if (socket.writable) {
    var errbuf = new Buffer([0x05, REP.GENFAIL]);
    if (err.code) {
      switch (err.code) {
        case 'ENOENT':
        case 'ENOTFOUND':
        case 'ETIMEDOUT':
        case 'EHOSTUNREACH':
          errbuf[1] = REP.HOSTUNREACH;
        break;
        case 'ENETUNREACH':
          errbuf[1] = REP.NETUNREACH;
        break;
        case 'ECONNREFUSED':
          errbuf[1] = REP.CONNREFUSED;
        break;
      }
    }
    socket.end(errbuf);
  }
}