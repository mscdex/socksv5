const { HttpAgent, HttpsAgent } = require('./lib/Agents');
const { None, UserPassword } = require('./lib/auth');
const { Client, connect, createConnection } = require('./lib/client');
const { Server, createServer } = require('./lib/server');

exports.auth = { None, UserPassword };

exports.HttpAgent = HttpAgent;
exports.HttpsAgent = HttpsAgent;

exports.Client = Client;
exports.connect = connect;
exports.createConnection = createConnection;

exports.Server = Server;
exports.createServer = createServer;
