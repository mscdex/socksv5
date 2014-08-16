Description
===========

SOCKS protocol version 5 server and client implementations for node.js


Requirements
============

* [node.js](http://nodejs.org/) -- v0.10.0 or newer


Install
=======

    npm install socksv5


Examples
========

* Server with no authentication and allowing all connections:

```javascript
var socks = require('socksv5');

var srv = socks.createServer(function(info, accept, deny) {
  accept();
});
srv.listen(1080, 'localhost', function() {
  console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.None());
```

* Server with username/password authentication and allowing all (authenticated) connections:

```javascript
var socks = require('socksv5');

var srv = socks.createServer(function(info, accept, deny) {
  accept();
});
srv.listen(1080, 'localhost', function() {
  console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.UserPassword(function(user, password, cb) {
  cb(user === 'nodejs' && password === 'rules!');
}));
```

* Server with no authentication and redirecting all connections to localhost:

```javascript
var socks = require('socksv5');

var srv = socks.createServer(function(info, accept, deny) {
  info.dstAddr = 'localhost';
  accept();
});
srv.listen(1080, 'localhost', function() {
  console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.None());
```

* Server with no authentication and denying all connections not made to port 80:

```javascript
var socks = require('socksv5');

var srv = socks.createServer(function(info, accept, deny) {
  if (info.dstPort === 80)
    accept();
  else
    deny();
});
srv.listen(1080, 'localhost', function() {
  console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.None());
```

* Server with no authentication, intercepting all connections to port 80, and passing through all others:

```javascript
var socks = require('socksv5');

var srv = socks.createServer(function(info, accept, deny) {
  if (info.dstPort === 80) {
    var socket;
    if (socket = accept(true)) {
      var body = 'Hello ' + info.srcAddr + '!\n\nToday is: ' + (new Date());
      socket.end([
        'HTTP/1.1 200 OK',
        'Connection: close',
        'Content-Type: text/plain',
        'Content-Length: ' + Buffer.byteLength(body),
        '',
        body
      ].join('\r\n'));
    }
  } else
    accept();
});
srv.listen(1080, 'localhost', function() {
  console.log('SOCKS server listening on port 1080');
});

srv.useAuth(socks.auth.None());
```

* Client with no authentication:

```javascript
var socks = require('socksv5');

var client = socks.connect({
  host: 'google.com',
  port: 80,
  proxyHost: '127.0.0.1',
  proxyPort: 1080,
  auths: [ socks.auth.None() ]
}, function(socket) {
  console.log('>> Connection successful');
  socket.write('GET /node.js/rules HTTP/1.0\r\n\r\n');
  socket.pipe(process.stdout);
});
```

* HTTP(s) client requests using a SOCKS Agent:

```javascript
var socks = require('socksv5');
var http = require('http');

var socksConfig = {
  proxyHost: 'localhost',
  proxyPort: 1080,
  auths: [ socks.auth.None() ]
};

http.get({
  host: 'google.com',
  port: 80,
  method: 'HEAD',
  path: '/',
  agent: new socks.HttpAgent(socksConfig)
}, function(res) {
  res.resume();
  console.log(res.statusCode, res.headers);
});

// and https too:
var https = require('https');

https.get({
  host: 'google.com',
  port: 443,
  method: 'HEAD',
  path: '/',
  agent: new socks.HttpsAgent(socksConfig)
}, function(res) {
  res.resume();
  console.log(res.statusCode, res.headers);
});
```


API
===

Exports
-------

* **Server** - A class representing a SOCKS server.

* **createServer**([< _function_ >connectionListener]) - _Server_ - Similar to `net.createServer()`.

* **Client** - A class representing a SOCKS client.

* **connect**(< _object_ >options[, < _function_ >connectListener]) - _Client_ - `options` must contain `port`, `proxyHost`, and `proxyPort`. If `host` is not provided, it defaults to 'localhost'.

* **createConnection**(< _object_ >options[, < _function_ >connectListener]) - _Client_ - Aliased to `connect()`.

* **auth** - An object containing built-in authentication handlers for Client and Server instances:

    * **(Server usage)**

        * **None**() - Returns an authentication handler that permits no authentication.

        * **UserPassword**(< _function_ >validateUser) - Returns an authentication handler that permits username/password authentication. `validateUser` is passed the username, password, and a callback that you call with a boolean indicating whether the username/password is valid.

    * **(Client usage)**

        * **None**() - Returns an authentication handler that uses no authentication.

        * **UserPassword**(< _string_ >username, < _string_ >password) - Returns an authentication handler that uses username/password authentication.

* **HttpAgent** - An Agent class you can use with `http.request()`/`http.get()`. Just pass in a configuration object like you would to the Client constructor or `connect()`.

* **HttpsAgent** - Same as `HttpAgent` except it is for use with `https.request()`/`https.get()`.


Server events
-------------

These are the same as [net.Server](http://nodejs.org/docs/latest/api/net.html#net_class_net_server) events, with the following exception(s):

* **connection**(< _object_ >connInfo, < _function_ >accept, < _function_ >deny) - Emitted for each new (authenticated, if applicable) connection request. `connInfo` has the properties:

    * **srcAddr** - _string_ - The remote IP address of the client that sent the request.

    * **srcPort** - _integer_ - The remote port of the client that sent the request.

    * **dstAddr** - _string_ - The destination address that the client has requested. This can be a hostname or an IP address.

    * **dstPort** - _integer_ - The destination port that the client has requested.

    `accept` has a boolean parameter which if set to `true`, will return the underlying `net.Socket` for you to read from/write to, allowing you to intercept the request instead of proxying the connection to its intended destination.


Server methods
--------------

These are the same as [net.Server](http://nodejs.org/docs/latest/api/net.html#net_class_net_server) methods, with the following exception(s):

* **(constructor)**([< _object_ >options[, < _function_ >connectionListener]]) - Similar to `net.Server` constructor with the following extra `options` available:

    * **auths** - _array_ - A pre-defined list of authentication handlers to use (instead of manually calling `useAuth()` multiple times).

* **useAuth**(< _function_ >authHandler) - _Server_ - Appends the `authHandler` to a list of authentication methods to allow for clients. This list's order is preserved and the first authentication method to match that of the client's list "wins." Returns the Server instance for chaining.


Client events
-------------

* **connect**(< _Socket_ >connection) - Emitted when handshaking/negotiation is complete and you are free to read from/write to the connected socket.

* **error**(< _Error_ >err) - Emitted when a parser, socket (during handshaking/negotiation), or DNS (if `localDNS` and `strictLocalDNS` are `true`) error occurs.

* **close**(< _boolean_ >had_error) - Emitted when the client is closed (due to error and/or socket closed).


Client methods
--------------

* **(constructor)**(< _object_ >config) - Returns a new Client instance using these possible `config` properties:

    * **proxyHost** - _string_ - The address of the proxy to connect to (defaults to 'localhost').

    * **proxyPort** - _integer_ - The port of the proxy to connect to (defaults to 1080).

    * **localDNS** - _boolean_ - If `true`, the client will try to resolve the destination hostname locally. Otherwise, the client will always pass the destination hostname to the proxy server for resolving (defaults to true).

    * **strictLocalDNS** - _boolean_ - If `true`, the client gives up if the destination hostname cannot be resolved locally. Otherwise, the client will continue and pass the destination hostname to the proxy server for resolving (defaults to true).

    * **auths** - _array_ - A pre-defined list of authentication handlers to use (instead of manually calling `useAuth()` multiple times).

* **connect**(< _mixed_ >options[, < _function_ >connectListener]) - _Client_ - Similar to `net.Socket.connect()`. Additionally, if `options` is an object, you can also set the same settings passed to the constructor.

* **useAuth**(< _function_ >authHandler) - _Server_ - Appends the `authHandler` to a list of authentication methods to allow for clients. This list's order is preserved and the first authentication method to match that of the client's list "wins." Returns the Server instance for chaining.
