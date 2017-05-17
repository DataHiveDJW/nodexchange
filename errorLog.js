const fs = require('fs');

const errorLog = {};

/** 
 * Initialize Error Log
 * @param {String} -- File Path
 * @public
 * Example: 
 * `errorLog.Init(path.join(__dirname + '/healthCheck.log'));`
*/

errorLog.init = (path) => {
  if (path === null) throw 'Error: A file path is a required parameter for errorLog.init'
  errorLog.path = path;
}

/**
 * Begins writing of errors to file path created in errorLog.Init
 * @param {Object} -- Error Object
 * @return {File} -- Overwrites old file, persisting old error data and adding new data together
 * @public
 */

errorLog.write = (error) => {
  if (errorLog.path) {
    fs.readFile(errorLog.path, (err, data) => {
      if (err) console.log(err, 'Read File error');
      let date = new Date();
      fs.writeFile(errorLog.path, data ? data + date + ': ' + error + '\n' : date + ': ' + error + '\n', 'utf-8', (err) => {
        if (err) console.log(err, 'Write File error');
        // else console.log('File written successfully');
      })
    })
  } else {
    return;
  }
}

module.exports = () => errorLog;
