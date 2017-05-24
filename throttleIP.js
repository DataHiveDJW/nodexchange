const ipAddresses = {};

const ddosStopper = (bReq, bRes, delay, requests) => {
  const ip = (bReq.headers['x-forwarded-for'] || '').split(',')[0] || bReq.connection.remoteAddress;
  // if ip address does exist in our list of client ip addresses
  // we want to make sure that they cannot make a request within 100 ms of their previous request
  ipAddresses[ip] ? ipAddresses[ip]++ : ipAddresses[ip] = 1;
  setTimeout(() => delete ipAddresses[ip], delay);

  if (ipAddresses[ip] > requests) {
    bRes.statusCode = 500;
    return bRes.end('500 Server Error');
  }
};

module.exports = ddosStopper;
