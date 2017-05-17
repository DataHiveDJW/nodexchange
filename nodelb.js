const path = require('path');
const threads = require('./clusterSwitch');
const rp = require('./loadBalancer');
const redis = require('./originServer');
const ws = require('./wsproxy');
const wspool = require('./wsproxypool');
const errorLog = require('./errorLog');

const lb = {};

const lib = {
  threads,
  rp,
  redis,
  ws,
  wspool,
  errorLog,
};

lb.deploy = (featureLib, options, cb) => {
  return lib[featureLib](options, cb);
};

module.exports = lb;
