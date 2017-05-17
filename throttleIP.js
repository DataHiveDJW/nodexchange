const ipAddresses = {};

const ddosStopper = (bReq, bRes, delay, requests) => {
  const ip = (bReq.headers['x-forwarded-for'] || '').split(',')[0] || bReq.connection.remoteAddress;
  // if ip address does exist in our list of client ip addresses
  // we want to make sure that they cannot make a request within 100 ms of their previous request
  if (ipAddresses[ip]) ipAddresses[ip]++;
  else ipAddresses[ip] = 1;
  setTimeout(() => delete ipAddresses[ip], delay);

  if (ipAddresses[ip] > requests) {
    bRes.statusCode = 500;
    // console.log('yoyoyoyoyoyoyoyo');
    return bRes.end('500 Server Error yo');
  }
};

module.exports = ddosStopper;

