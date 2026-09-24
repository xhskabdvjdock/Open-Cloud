'use strict';

// Vercel serverless entry: re-export the Express handler from server.js.
const handler = require('../server');

module.exports = handler;
module.exports.default = handler;
