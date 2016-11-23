var fs = require('fs')
var IPFSApi = require('ipfs-api')
var libp2p = require('libp2p-ipfs')
var PeerId = require('peer-id')
var PeerInfo = require('peer-info')
var multiaddr = require('multiaddr')
var pify = require('pify')
var debug = require('debug')
var log = debug('pando:start')
log.error = debug('pando:start:error')
var protocols = require('./protocols')
var utils = require('./utils')
var path = require('path')

var createPeerInfo = pify(function createPeerInfo (config, cb) {
  if (config) {
    log('retrieving peerid')
    PeerId.createFromPrivKey(config.Identity.PrivKey, (err, peerId) => {
      if (err) {
        log.err(err)
        return cb(err)
      }

      log('retrieved id: ' + peerId.toB58String())
      var peerInfo = new PeerInfo(peerId)
      cb(null, peerInfo)
    })
  } else {
    log('creating a new peer id')
    PeerId.create((err, peerId) => {
      if (err) throw err
      cb(null, new PeerInfo(peerId))
    })
  }
})

var startNetwork = pify(function startNetwork (node, cb) {
  log('Starting communication node')
  node._libp2p.start((err) => {
    if (err) {
      log.error(err)
      return cb(err)
    }

    log('Node started successfully')

    log('Installing protocols')
    protocols.install(node, '/jobs/1.0.0')

    node._started = true

    log('Node listening')
    node._events.emit('listening')

    cb(null, node)
  })
})

module.exports = function (node, cb) {
  if (typeof cb !== 'function') {
    throw new Error('Invalid callback function')
  }

  // When using IPFS, retrieve the PeerId in the config file so the node shares
  // the same id on both the IPFS and Pando (libp2p) networks. If no IPFS repository
  // has been initialized already create a new PeerId.
  var config
  try {
    log('Reading config')
    config = JSON.parse(fs.readFileSync(path.join(node._options.repoPath, 'config')))
  } catch (err) {
    log(err)
    log('creating a new peer id')
    config = null
  }

  // Connecting to ipfs daemon
  utils.isIpfsRunning((running) => {
    if (!running) {
      // TODO: Reactivate when the file sharing protocol
      //       becomes necessary
      // var err = new Error('ipfs not running, aborting')
      // log.error(err)
      // return cb(err)
      log('WARNING: ipfs not running')
    }

    try {
      log('Starting ipfs api')
      node._ipfs = new IPFSApi()
    } catch (err) {
      log.error(err)
      cb(err)
    }
  })

  // We need to create a complete peer info (using the peer id) for using the
  // lower-level apis of libp2p
  createPeerInfo(config)
    .then((peerInfo) => {
      log('Creating communication node')
      node._libp2p = new libp2p.Node(peerInfo)

      log('Adding multiaddresses')
      node._libp2p.peerInfo.multiaddr.add(multiaddr.fromNodeAddress({
        family: 'IPv4',
        address: '0.0.0.0',
        port: node._options.port
      }, 'tcp'))

      startNetwork(node, cb)
    })
    .catch((err) => {
      log.error(err)
      cb(err)
    })
}
