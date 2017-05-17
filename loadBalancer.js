const https = require('https');
const http = require('http');
const EventEmitter = require('events');
const el = require('./errorLog');
const throttleIP = require('./throttleIP');

const errorLog = el();

class LoadBalancer extends EventEmitter {
  constructor() {
    super();
    this.algo = 'lc';
    this.cache = {};
    this.options = [];
    this.routes = {};
    this.addOptions = this.addOptions.bind(this);
    this.setRoutes = this.setRoutes.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.isStatic = this.isStatic.bind(this);
    this.shouldCache = this.shouldCache.bind(this);
    this.cacheContent = this.cacheContent.bind(this);
    this.init = this.init.bind(this);
    this.lbInit = this.lbInit.bind(this);
  };

  /**
   * Sets Load-Balancing Algorithm to Round-Robin style
   * @public
   */

  setAlgoRR() {
    this.algo = 'rr';
  }

  /**
   * Sets Load-Balancing Algorithm to Least Connection style
   * @public
   */

  setAlgoLC() {
    this.algo = 'lc';
  }

  /**
   * Stores desired application routes for reverse-proxy to cache responses for
   * @param {Array} -- Nested Array of Request Type & Route
   * @public
   * Example: 
   * `rp.setRoutes([['GET', '/'], ['GET', '/html']]);`
   */

  setRoutes(routes) {
    if (routes === null || routes === undefined) throw 'Set Routes received input that was either null or undefined';
    if (!Array.isArray(routes)) throw 'Error: setRoutes expects an input of type "Array", per documentation it expects a nested Array';

    for (let i = 0; i < routes.length; i++) {
      let temp = routes[i][0].concat(routes[i][1]);
      this.routes[temp] = true;
    }
  };

  /**
   * Stores specific target server hostname and port information to direct requests to
   * @param {Object} -- Options object includes specific hostname and port info. for target servers
   * @public
   * Example:
   * `const options = [];
   *   for (let i = 2; i < process.argv.length; i += 2) {
   *     options.push({
   *        hostname: process.argv[i],
   *        port: process.argv[i + 1],
   *      });
   *   }`
   */

  addOptions(options) {
    if (!Array.isArray(options)) throw 'Error: addOptions expects an input of type "Array"';
    if (options === null || options === undefined) throw 'Error: Options is a required parameter for addOptions';

    for (let i = 1; i < options.length; i += 1) {
      this.options.push(options[i]);
    }
  };

  /**
   * Pings all target servers on an interval (if provided) or when method is called
   * @param {Number} -- Interval in miliseconds setTimeout (Default: Null)
   * @param {Boolean} -- True or False if server needs SSL to check HTTPS requests (Default: False)
   * @public
   */

  healthCheck(interval = null, ssl = false) {
    /**
     * Healthcheck sends dummy requests to servers to check server health
     * Alters 'active' property boolean value based on result of health check
     */
    const options = this.options;

    let protocol;
    ssl ? protocol = https : protocol = http;

    // Loops through servers in options & sends mock requests to each
    for (let i = 0; i < options.length; i += 1) {
      protocol.get(options[i], (res) => {
        if (res.statusCode > 100 && res.statusCode < 400) {
          console.log(res.statusCode);
          if (options[i].active === false) options[i].active = true;
        } else {
          options[i].active = false;
        }
        res.on('end', () => {
          // response from server received, reset value to true if prev false
          if (options[i].active === false) options[i].active = true;
        });
      }).on('error', (e) => {
        e.name = "HealthCheck Error";
        errorLog.write(e);
        // if error occurs, set boolean of 'active' to false to ensure no further requests to server
        if (e) options[i].active = false;
      });
    }
    //if interval param is provided, repeats checks on provided interval
    if (interval !== null) {
      setTimeout(() => {
        this.healthCheck(interval, ssl);
      }, interval);
    }
  }

  /**
   * Clears reverse-proxy internal cache
   * @param {Number} -- Interval in miliseconds for setTimeout (Default: Null)
   * @public
   */

  clearCache(interval = null) {
    this.cache = {};
    if (interval !== null) {
      setTimeout(() => {
        this.clearCache(this.cache, interval);
      }, interval);
    }
  }

  /** 
   * Checks if request is considered 'static' - HTML, CSS, JS file
   * Method is not available to users
   * @param {Object} -- Browser request object
   * @return {Boolean} -- True/False if 'static'
   * @private
   */

  isStatic(bReq) {
    // Returns true if matching any of 3 file types, otherwise returns false
    return bReq.url.slice(bReq.url.length - 5) === '.html' || bReq.url.slice(bReq.url.length - 4) === '.css' || bReq.url.slice(bReq.url.length - 3) === '.js';
  };

  /**
   * Checks return result from isStatic method & if route exists in routes object
   * Returns boolean based off result of either returning true
   * Method is not available to users
   * @param {Object} -- Browser request object
   * @param {Object} -- Routes object
   * @return {Boolean} -- True/false if 'static' or exists in routes object
   * @private
   */

  shouldCache(bReq, routes) {
    return this.isStatic(bReq) || routes[bReq.method + bReq.url];
  };

  /**
   * Caches response in reverse-proxy internal cache for future identical requests
   * Calls shouldCache and awaits boolean return value
   * Method is not available to users
   * @param {Object} -- Response body
   * @param {Object} -- Internal Cache
   * @param {Object} -- Browser request object
   * @param {Object} -- Routes object
   * @private
   */

  cacheContent(body, cache, bReq, routes) {
    if (this.shouldCache(bReq, routes)) cache[bReq.method + bReq.url] = body;
  }

  /**
   * Determines type of request protocol: HTTP or HTTPS
   * If request is not to be cached, pipe through to target servers, else cache compiled response
   * @param {Object} -- Options object
   * @param {Object} -- Response Body
   * @param {Object} -- Specific server object
   * @param {Object} -- Internal Cache
   * @param {Object} -- Routes object
   * @param {Object} -- Browser request object
   * @param {Object} -- Browser response object
   * @param {Boolean} -- SSL boolean value
   * @public
   */

  determineProtocol(options, body, target, cache, routes, bReq, bRes, ssl) {
    let protocol;
    ssl ? protocol = https : protocol = http;
    return protocol.request(options, (sRes) => {
      bRes.writeHead(200, sRes.headers);
      if (!this.shouldCache(bReq, routes)) {
        sRes.pipe(bRes);
        target.openRequests -= 1;
      } else {
        sRes.on('data', (data) => {
          body += data;
        });
        sRes.on('end', (err) => {
          if (err) errorLog.write(err);
          target.openRequests -= 1;
          this.cacheContent(body, cache, bReq, routes);
          bRes.end(body);
        });
      }
    });
  }

  /**
   * Initalize Load-balancer / Reverse-proxy
   * @param {Object} -- Browser request object
   * @param {Object} -- Browser response object
   * @param {Boolean} -- SSL boolean (if using SSL) (Default: False)
   * @param {Number} -- Delay provided for DDOS throttle (Default: 0)
   * @param {Number} -- Request count for DDOS throttle (Default: 0)
   * @public
   */

  init(bReq, bRes, ssl = false, delay = 0, requests = 0) {
    if (delay > 0 || requests > 0) throttleIP(bReq, bRes, delay, requests);
    if (!bReq) throw 'Error: The browser request was not provided to init';
    if (!bRes) throw 'Error: The browser response was not provided to init';
    if (delay > 0 && requests > 0 && throttleIP(bReq, bRes, delay, requests) !== undefined) {
      return throttleIP(bReq, bRes, delay, requests)
    }
    if ((delay > 0 && requests <= 0) || (delay <= 0 && requests > 0)) {
      throw 'Error: both delay and requests need to be defined if you want to throtte ip addresses';
    }
    const options = this.options;
    const cache = this.cache;
    const routes = this.routes;

    if (cache[bReq.method + bReq.url]) {
      // check cache if response exists, else pass it on to target servers
      this.emit('cacheRes');
      bRes.end(cache[bReq.method + bReq.url]);
    } else {
      this.emit('targetRes');
      let body = '';
      // checks for valid request & edge case removes request to '/favicon.ico'
      if (bReq.url !== null && bReq.url !== '/favicon.ico') {
        let INDEXTEST = 0;
        let target = null;
        options.push(options.shift());
        if (this.algo === 'rr') {
          while (!options[0].active) options.push(options.shift());
          target = options[0];
        } else if (this.algo === 'lc') {
          while (!options[0].active) options.push(options.shift());
          const min = {};
          min.reqs = options[0].openRequests;
          min.option = 0;
          for (let i = 1; i < options.length; i += 1) {
            if (options[i].openRequests < min.reqs && options[i].active) {
              min.reqs = options[i].openRequests;
              min.option = i;
              INDEXTEST = i;
            }
          }
          target = options[min.option];
        }

        const serverOptions = {};
        serverOptions.method = bReq.method;
        serverOptions.path = bReq.url;
        serverOptions.headers = bReq.headers;
        serverOptions.hostname = target.hostname;
        serverOptions.port = target.port;

        target.openRequests += 1;

        const originServer = this.determineProtocol(serverOptions, body, target, cache, routes, bReq, bRes, ssl);

        originServer.on('error', e => {
          e.name = 'Target Server Error';
          errorLog.write(e);
        });
        bReq.pipe(originServer);
      }
    }
  }

  /**
   * Injects target server collection (options) into library
   * @param {Object} -- Options object
   * @param {Function} -- Callback exists if you want to take an action before server start/after injection
   * @return {Object} -- Returns loadBalancer object
   * @private
   */

  lbInit(options, cb) {
    if (options === null || options === undefined) throw 'Error: Options is a required parameter for this method';
    this.options = options;
    this.options.forEach((option) => {
      option.openSockets = 0;
      option.openRequests = 0;
      option.active = true;
    });
    if (cb) cb();
    return this;
  }
}

const loadBalancer = new LoadBalancer();

module.exports = loadBalancer.lbInit;
