var net = require('net');

exports.ipbytes = function(str) {
  var type = net.isIP(str),
      nums,
      bytes,
      i;

  if (type === 4) {
    nums = str.split('.', 4);
    bytes = new Array(4);
    for (i = 0; i < 4; ++i) {
      if (isNaN(bytes[i] = +nums[i]))
        throw new Error('Error parsing IP: ' + str);
    }
  } else if (type === 6) {
    var addr = str.split(':'),
      b = 0,
      group;
    if(addr.length != 8){
      var index = addr.findIndex(function (value) {
         return value == '';
      });
      var expand = new Array(8-addr.length+1);
      expand.fill('0');
      addr[index]=expand;
      addr.flat();
    }
    bytes = new Array(16);
    for (i = 0; i < 8; ++i, b += 2) {
      group = parseInt(addr[i], 16);
      bytes[b] = group >>> 8;
      bytes[b + 1] = group & 0xFF;
    }
  }

  return bytes;
};
