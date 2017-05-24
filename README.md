# Installation

```
$ npm install nodexchange
```

# Features

### 1. Reverse-Proxy features such as :

 * Internal caching of static files and desired route responses

 * Internal health checks

 * Cache clearing mechanisms

### 2. Load-Balancing features such as :

 * Least-connections / round-robin load-balancing algorithm for http/https and web sockets

### 3. Additional Features :

 * Error logging

 * IP throttling

 * Direct compability with Redis for session storage

 * Direct compability with the Node Cluster module for multi-threading Node instances

# Reverse Proxy Setup

Include our library in your application using:

```javascript
const lb = require(‘nodexchange’);
```

## Options  —

Options is a collection of the addresses to the target servers, consisting of their hostnames and ports.
In order to create the reverse proxy object, it will need this input upon deployment.

### Example:

```javascript
const options = [
  {
    hostname: '127.0.0.1',
    port: 3000,
  },
  {
    hostname: '127.0.0.1',
    port: 4000,
  },
  {
    hostname: '127.0.0.1',
    port: 5000,
  },
];
```

## lb.deploy ( string, array( options ), function[optional] ) —

lb.deploy triggers the creation of the reverse proxy object.

**First parameter (string):** is a configuration argument for the reverse proxy server which in this case must be: ’rp’

**Second parameter (array):** will be the options collection created previously (see above)

**Third parameter (function) - optional:** callback function executed upon initializing objects for reverse-proxy

**‘rp’ is the only valid string input for the first parameter to trigger your reverse proxy setup**

### Example:
```javascript
const rp = lb.deploy(‘rp’, options);
```

lb.deploy has six specific strings that can be used in this library.

*****To see the other use cases and strings for lb.deploy in this library, click these links:*****

* [Websocket Deploy Section](https://github.com/DataHiveDJW/nodexchange/blob/master/README.md#websockets-setup)

* [Error Log Deploy Section](https://github.com/DataHiveDJW/nodexchange/blob/master/README.md#error-log-setup)

* [Redis Deploy Section](https://github.com/DataHiveDJW/nodexchange/blob/master/README.md#redis-sessions-setup)

* [Multi-Threading Deploy Section](https://github.com/DataHiveDJW/nodexchange/blob/master/README.md#threads-setup)

## rp.addOptions ( options ) —

**Options (array of objects)**

You can use rp.addOptions to append your existing options collection. This method will not overwrite your previous collection.

### Example:

```javascript
const newOptions =
[
 { hostname: '127.0.0.1', port: '3000' },
 { hostname: '127.0.65.120', port: '4000' }
]
rp.addOptions(newOptions);
```

## rp.setRoutes ( nestedArray ) —

**The nestedArray parameter:** is stored in the reverse proxy server as an object of what routes in your application you would like cached upon first request.

Convention implies that you will declare this nestedArray as ‘routes’.
Each subarray of routes takes two strings: ‘method’ & ‘url’:

```javascript
const routes = [['method', 'URL'], ['method', 'URL']];
```

**Method (string):** are the usual type of requests (e.g. ‘GET’, ‘POST’, ‘DELETE’, ‘PUT’);

**URL (string):** will be the portion of your specific route (e.g. ‘/users’, ‘/puppies’);

rp.setRoutes can be called multiple times and will add the new routes to the routes cache

### Example:

```javascript
const routes = [['GET', '/puppies'], ['POST', '/login']];
```

## rp.init ( req , res, boolean[optional], number[optional], number[optional] ) —

**This method sends/ends the response to the client**

This method initializes the reverse proxy.
The reverse proxy server will cache static files (.HTML, .CSS., .JS) & routes from rp.setRoutes method.

This method does the following:
Checks cache for existence of incoming ‘req’
Accepts ‘req’ and pipes it to target servers if it does not exist in cache
Receives ‘res’ back from target servers, appends header to response, and then pipes/ends response back to browser

**Third parameter (boolean):** to set up your protocol input true for https and false for http

### DDoS Considerations

*****fourth parameter must be used with fifth parameter for the purpose of ip throttling*****

**Fourth parameter (number) - optional:** milliseconds allowed between n (defined below) number of client requests per ip - 500 Server Error will result from violating ip throttling rules setup with fourth and fifth parameters.

**Fifth parameter (number) - optional:** number of requests per ip address allowed within duration set in fourth parameter before responding with a 500 Server Error.

### Example:

```javascript
const server = http.createServer((req, res) => {
 rp.init(req, res, false, 5000, 10);
}).listen(1337);
console.log('Server running at 127.0.0.1:1337');
```

## rp.healthCheck ( interval[optional] , ssl[optional]) —

rp.healthCheck sends pings from the reverse proxy to all target servers with a test requests to review target server health.
Uses internal boolean logic to toggle target servers as active or inactive based on results of pings.

**First parameter (number) - optional:** accepts an interval in ms (milliseconds)

**Second parameter (number) - optional:** accepts a boolean indicating whether the protocol is http or https.  This parameter defaults to false, setting an http protocol.  For https, set this parameter to true.

If the interval parameter is NULL, rp.healthCheck can be called by user discretion.
If interval has a value, rp.healthCheck will run on that given interval value (e.g. every 5 minutes).

### Example:

```javascript
// interval = 10000 milliseconds
rp.healthCheck(10000);

// interval is null
rp.healthCheck();
```

## rp.clearCache ( interval[optional] ) —

Accepts an interval parameter in ms (milliseconds).

rp.clearCache clears the internal cache of the reverse proxy server.

If the interval parameter is NULL, rp.clearCache can be called by user discretion for a one-time cache clear.
If interval has a value, rp.clearCache will run on that given interval value (e.g. every 5 minutes).

rp.clearCache is an integral method in this library ensure cached content is fresh. This method also aids in preventing the cache from consuming too much RAM in media heavy applications and bogging down the performance of the proxy server.

It is recommended to utilize this method in some capacity in your application.

### Example:

```javascript
// interval = 10000 milliseconds
rp.clearCache(10000);

// interval is null
rp.clearCache();
```

## rp.getCache ( ) -

Returns an object of what is currently cached.

## rp.setAlgoLC ( ) -

Sets the load-balancing algorithm to least-connections.  This is the default
algorithm in NodeXchange.

## rp.setAlgoRR ( ) —

Sets the load-balancing algorithm to round-robin.

# Websockets Setup

The websockets feature extends http/https routing and load-balancing to websocket connections. There are two websockets options, pooling and non-pooling. The pooling option expects a pool id message from the client before connecting the persistent web socket tunnel to the appropriate target server handling that web socket pool. The non-pooling options creates persistent web socket tunnels with target servers on a least connection basis.

## lb.deploy ( string ) —

**First parameter (string):** is a configuration argument for the load-balance library which in this case must be: ’wspool’ to initialize websocket proxying for the pooling option or 'ws' for the non-pooling option

### Example:
```javascript
const ws = lb.deploy('wspool'); // or lb.deploy('ws');
```

## ws.init ( server, options, boolean[optional] ) —
This method commences websocket routing.

**server (previously instantiated http(s) server object)**

The server parameter expects the object returned from the http/https createServer method. The websockets feature leverages the same port as http/https server.

**options (array of objects)**

If further target server options are added, you can use rp.addOptions to update your existing options collection.
This method will not overwrite your previous collection.

**boolean (ssl flag)**

The third boolean parameter defaults to false. If ssl communication is required between proxy server and target servers, 'true' should be used for this argument.

**IMPORTANT NOTE ON POOLING FEATURE**
All web socket messages from client will be dropped until message is received with socketPoolId. Format of message must be "{'socketPoolId': 5}" where '5' is the pool id in this case (ie unique id for chatroom or lobby etc). Upon receiving this message, the web socket tunnel will be connected with the appropriate target server and messages will routed accordingly.

### Example:
```javascript
const server = http.createServer((req, res) => {
 rp.init(req, res);
}).listen(1337);

ws.init(server, options, true);
```

# Error Log Setup

Handling a multitude of servers for your application requires constant monitoring of the health of each individual server. To coincide with our health check functionality, we provided some simple to use methods to create an error log path that can cleanly and readibly store the results of errors from health checks.

## lb.deploy ( string ) —

**First parameter (string):** is a configuration argument for the error log library which in this case must be ’errorLog’ to gain access to the init and write methods.

### Example:
```javascript
const errorLog = lb.deploy('errorLog');
```

## errorLog.init ( string ) --

Accepts a string as its sole parameter which provides your desired file path for the log file to be generated at.
This method will simply store the file path.

```javascript
errorLog.init(path.join(__dirname + '/healthCheck.log'));
```

## errorLog.write ( object ) --

Accepts the error object as it's parameter to be written to the log file.
Method will read the previous copy of the file before re-writing it and concatenating the old data with the new data.

```javascript
res.on('end', () => {
// response from server received, reset value to true if prev false
 if (options[i].active === false) options[i].active = true;
 });
 }).on('error', (e) => {
        e.name = "HealthCheck Error";
        errorLog.write(e);
```

# Redis Sessions Setup
Nodexchange comes packaged with a lightweight controller to store and read session data from a Redis server, providing a central session data store between multiple target servers.

A Redis server must be setup as a prerequisite to utilizing the Redis Sessions object on the target server.
[see Redis documentation for more information on setting up your personal Redis instance](https://redis.io/documentation)
The deploy method requires the Redis server address in the options argument (host/ip and port) and creates/returns the ‘rs’ (Redis sessions) object.

```javascript
const lb = require(‘nodexchange’);
const options = {
  host: '127.0.0.1', // —> string hostname or IP address
  port: 6379,        // —> integer port number
};

const rs = lb.deploy(‘redis’, options);
```

## rs.authenticate(req, res, cookieKey(string), uniqueId(string), cb(function))

Encrypts (SHA-256 via crypto module) and saves session cookie in Redis
Sets cookie in header (DOES NOT END RESPONSE)

**Req (object):** client request object

**Res (object):** client response object

**cookieKey (string):** name of cookie as seen in browser

**uniqueId (string):** uniqueId per cookieKey (e.g. username)

**Cb (function):** callback function executed after redis save - includes redis error and reply arguments --

Example: `(err, reply) => {. . .}`

## rs.verifySession(req, cookieKey(string), cb(function))
Parses cookies in request header
Validates session cookies against central redis store
Returns true or false based on cookie validity

**Req (object):** client request object

**cookieKey (string):** name of cookie as seen in browser (targets this cookie name exclusively when validating)

**Cb (function):** callback function with result argument true or false --

Example: `(sessionVerified) => {. . .}`

# Threads Setup
Since node is built on a single-threaded foundation, we provide the option to use all threads on target servers using the Node cluster module. Utilizing this module, the target servers will be able to sustain a much higher load for synchronous tasks than when node is running single-threaded solely.

For example, a hypothetical single-threaded target server handles 100 concurrent requests. A Node server running 4 threads in an ideal setting will be able to handle 200 concurrent requests (not accounting for OS IPC overhead).

The threads will balance requests to the target server through the cluster module’s native round-robin algorithm (except on Windows which has it's own scheduling policy).

See more details at [Node's Cluster Module Docs](https://nodejs.org/api/cluster.html#cluster_how_it_works)

## threads(server(object), port(number));

The threads function commences cpu thread forking - this process includes executing the 'listen' method on the input server object (**IMPORTANT NOTE: REMOVE THE LISTEN METHOD FROM SERVER OBJECT IF USING THREADS**)

**server (previously instantiated http/https server object)**

The server parameter expects the object returned from the http/https createServer method

**port (number):** number indicating at what port will the server/threads respond to (e.g. 80)

A simple set up to getting threads started:

```javascript
const lb = require('nodexchange');
const threads = lb.deploy(‘threads’);

const port = 3000;
const server = http.createServer((bReq, bRes) => {
  // . . .
});
threads(server, port);
```
