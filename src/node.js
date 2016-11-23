var start = require('./start')
var events = require('events')
var path = require('path')
var debug = require('debug')
var log = debug('pando:Node')
log.error = debug('pando:Node:error')
var distmap = require('./distmap')

function withStarted (node, cb) {
  setImmediate(() => {
    if (node._started) {
      cb(null, node)
    } else if (node._starting) {
      node._events.once('listening', () => cb(null, node))
    } else {
      node._starting = true
      start(node, cb)
    }
  })
}

function getUserHome () {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']
}

function Node (options) {
  options = options || {}
  this._options = {
    'repoPath': options.repoPath || path.join(getUserHome(), '.ipfs'),
    'silent': options.silent || false,
    'port': Object.keys(options).indexOf('port') >= 0 ? options.port : 4002,
    'ws-port': Object.keys(options).indexOf('ws-port') >= 0 ? options['ws-port'] : 3000
  }
  // libp2p is used for communication between nodes within a dedicated for Pando network
  this._libp2p = null
  // ipfs is used for transmitting data
  this._ipfs = null
  this._dialers = null
  this._events = new events.EventEmitter()
  // Jobs awaiting completion
  this._jobs = []
  this._starting = false
  this._started = false
  this._source = {}
  this._fun = null

  if (!this._options.silent) {
    this._events.on('listening', (err) => {
      if (err) throw err

      console.log('Node ready, listening on:')
      this._libp2p.peerInfo.multiaddrs.forEach((ma) => {
        console.log(ma.toString() + '/ipfs/' + this._libp2p.peerInfo.id.toB58String())
      })
    })
  }
}

Node.prototype.start = function (cb) {
  cb = cb || (() => {
  })
  withStarted(this, cb)
  return this
}

// Distributed version of pull.asyncMap
// fun signature: function (data, cb) { cb(null, data) }
Node.prototype.distmap = function (fun) {
  if (this._fun) {
    throw new Error('distmap already running')
  }
  this._fun = fun
  this.start((err) => {
    if (err) throw err
  })
  return distmap(this._source)
}

// Volunteer computing on jobs created at multiaddr
Node.prototype.volunteer = function (multiaddr, nb, done) {
  nb = nb || Infinity
  done = done || (() => {
  })

  withStarted(this, (err) => {
    if (err) {
      log.error(err)
      throw err
    }

    let next = () => {
      setImmediate(() => {
        if (nb-- <= 0) {
          return done()
        }

        log('volunteering, ' + nb + ' offers remaining')
        multiaddr = multiaddr || '/ip4/192.168.0.174/tcp/4002/ipfs/QmP4gHA2TjXuXjZ2qNk5T7eXB91aeZuWDQM7sUeiAF3yJE'
        this._dialers['/jobs/1.0.0'](
          multiaddr,
          next,
          done
        )
      })
    }
    next()
  })
}

Node.prototype.onError = function (cb) {
  this._events.on('error', cb)
}

Node.prototype.onListening = function (cb) {
  this._events.on('listening', cb)
}

Node.prototype.onStatusChanged = function (cb) {
  this._events.on('status-changed', cb)
}

Node.prototype.onJob = function (started, completed) {
  if (typeof started === 'function') {
    this._events.on('job-started', started)
  }
  if (typeof completed === 'function') {
    this._events.on('job-completed', completed)
  }
}

module.exports = Node
