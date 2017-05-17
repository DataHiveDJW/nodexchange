const cluster = require('cluster');

const clusterSwitch = {};

/**
* Initialize Node Clusters
* @param {Object} -- Server Object
* @param {Number} -- Server Port
* @public
*/

clusterSwitch.init = (server, port) => {
  if (cluster.isMaster) {
    const numThreads = require('os').cpus().length;
    // creates workers for threads based on threads
    for (let i = 0; i < numThreads; i += 1) {
      cluster.fork();
    }
    // Lets user know ID of thread workers
    cluster.on('online', (thread) => console.log('Thread ' + thread.process.pid + ' is online'));
    // When worker dies while executing code, creates new one.
    cluster.on('exit', (thread, code, signal) => {
      // to inform the user of dead threads and the information behind it
      // refer to cluster docs for what these mean
      console.log(`thread ${thread.process.pid} died with code: ${code} and signal: ${signal}`);
      cluster.fork();
    });
  } else {
    server.listen(port);
    console.log('Server running at port ' + port);
  }
};

module.exports = () => clusterSwitch.init;
