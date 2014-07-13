var fs = require('fs'),
    path = require('path');

['server'].forEach(function(f) {
  var exp = require('./lib/' + f),
      keys = Object.keys(exp);
  for (var i = 0, len = keys.length; i < len; ++i)
    exports[keys[i]] = exp[keys[i]];
});

exports.auth = {};

fs.readdirSync('./lib/auth').forEach(function(f) {
  exports.auth[path.basename(f, '.js')] = require('./lib/auth/' + f);
});