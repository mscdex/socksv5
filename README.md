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

* Server with no authentication, hijacking all connections to port 80, and passing through all others:

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


API
===

Exports
-------

* **Server** - A class representing a SOCKS server.

* **createServer**([< _function_ >connectionListener]) - _Server_ - Similar to `net.createServer()`.

* **auth** - An object containing built-in authentication handlers for Server instances:

    * **None**() - Returns an authentication handler that permits no authentication.

    * **UserPassword**(< _function_ >validateUser) - Returns an authentication handler that permits username/password authentication. `validateUser` is passed the username, password, and a callback that you call with a boolean indicating whether the username/password is valid.


Server events
-------------

These are the same as [net.Server](http://nodejs.org/docs/latest/api/net.html#net_class_net_server) events, with the following exception(s):

* **connection**(< _object_ >connInfo, < _function_ >accept, < _function_ >deny) - Emitted for each new (authenticated, if applicable) connection request. `connInfo` has the properties:

    * **srcAddr** - _string_ - The remote IP address of the client that sent the request.

    * **srcPort** - _integer_ - The remote port of the client that sent the request.

    * **dstAddr** - _string_ - The destination address that the client has requested. This can be a hostname or an IP address.

    * **dstPort** - _integer_ - The destination port that the client has requested.

    `accept` has a boolean parameter which if set to `true`, will return the underlying `net.Socket` for you to read from/write to, allowing you to hijack the request instead of proxying the connection to its intended destination.


Server methods
--------------

These are the same as [net.Server](http://nodejs.org/docs/latest/api/net.html#net_class_net_server) methods, with the following exception(s):

* **useAuth**(< _function_ >authHandler) - _Server_ - Appends the `authHandler` to a list of authentication methods to allow for clients. This list's order is preserved and the first authentication method to match that of the client's list "wins." Returns the Server instance for chaining.
