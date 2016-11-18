var ps = require('current-processes')
var error = require('debug')('util:error')

function isIpfsRunning (cb) {
  ps.get((err, processes) => {
    if (err) {
      error(err)
      throw err
    }
    for (var i = 0; i < processes.length; ++i) {
      if (processes[i].name === 'ipfs') {
        return cb(true)
      }
    }
    cb(false)
  })
}

module.exports = {
  isIpfsRunning: isIpfsRunning
}
