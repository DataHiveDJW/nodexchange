const WebSocket = require('ws');
const eventEmitter = require('events');

const findTarget = (servers) => {
  // console.log(servers[0].openSockets, servers[1].openSockets, servers[2].openSockets);
  let target = null;
  for (let i = 0; i < servers.length; i += 1) {
    if (target === null && servers[i].active) target = servers[i];
    if (target.openSockets > servers[i].openSockets && servers[i].active) {
      target = servers[i];
    }
  }
  return target;
};


// findTarget
// check to see if pool identifier has been allocated to a server yet

class WsProxy extends eventEmitter {
  constructor() {
    super();
    this.tunnels = [];
    this.init = (server, options, isSecure = false) => {
      if (options === null || options === undefined) throw 'Error: Options parameter not provided'
      const wss = new WebSocket.Server({ server });
      wss.on('connection', (clientWs) => {
        // console.log(options[0].openSockets, options[1].openSockets, options[2].openSockets);
        // console.log(this.tunnels.length + ' open sockets');
        const messageQueue = [];
        let tunnelOpen = false;
        const targetServer = findTarget(options);
        targetServer.openSockets += 1;
        const targetWs = new WebSocket((isSecure ? 'wss://' : 'ws://').concat(targetServer.hostname).concat(':').concat(targetServer.port));
        clientWs.on('message', (message) => {
          if (tunnelOpen) {
            targetWs.send(message);
            // console.log(message);
          } else {
            messageQueue.push(message);
          }
        });
        targetWs.on('open', () => {
          this.tunnels.push({
            client: clientWs,
            targetSocket: targetWs,
            targetServer: { hostname: targetServer.hostname, port: targetServer.port },
          });
          while (messageQueue.length > 0) {
            targetWs.send(messageQueue.shift());
          }
          tunnelOpen = true;
          targetWs.on('message', (message) => {
            clientWs.send(message);
          });
          clientWs.on('close', () => {
            // console.log('client disconnected');
            targetWs.close();
          });
          targetWs.on('close', () => {
            targetServer.openSockets -= 1;
            let serverIndex;
            const currServer = this.tunnels.filter((item, i) => {
              if (item.targetSocket === targetWs) {
                serverIndex = i;
                return true;
              }
            });
            // console.log(currServer);
            // console.log(currServer[0].targetServer.port, ' disconnected');
            // console.log(this.tunnels.length + ' open sockets');
            this.tunnels.splice(serverIndex, 1);
            clientWs.close();
          });
        });
      });
    };
  }
}

module.exports = () => new WsProxy();
