var path = require('path')
var fs = require('fs')
var IPFSApi = require('ipfs-api')
var Libp2p = require('libp2p-ipfs')
var PeerId = require('peer-id')
var PeerInfo = require('peer-info')
var multiaddr = require('multiaddr')
var ip = require('ip')
var pull = require('pull-stream')
var toPull = require('pull-promise')
var promisify = require(__dirname + '/promisify')['function']
var net = require('net');

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

// libp2p is used for communication between nodes within a dedicated for Pando nodes
// ipfs is used for storing and retrieving data
function Node(libp2p, ipfs) {
    this._libp2p = libp2p
    this._ipfs = ipfs
}

var usePortIfFree = promisify(function (port, cb) {
    var server = net.createServer();
    server.on('listening', function() {
        port = server.address().port
        server.close()
    })
    server.on('close', function() {
        cb(null, port)
    })
    server.on('error', function(err) {
        console.log('error: ' + err);
        cb(null, 0)
    })
    server.listen(port)
})

var createPeerInfo = promisify(function createPeerInfo(config, cb) {
    if (options.verbose) { console.log('Retrieving PeerId') }
    PeerId.createFromPrivKey(config.Identity.PrivKey, (err, peerId) => {
        if (err) return cb(err)

        if (options.verbose) { console.log('Retrieved id: ' + peerId.toB58String()) }
        var peerInfo = new PeerInfo(peerId)
        cb(null, peerInfo)
    })
})

var addProtocols = function addProtocols(network) {
    if (options.verbose) { console.log('Adding pando protocols') }

    var jobs = pull(pull.count(), pull.map(String))
    network.handle('/jobs/1.0.0', (protocol, conn) => {
        console.log('protocol: ' + protocol)
        pull(
            toPull.source(new Promise((resolve, reject) => {
                pull(
                    jobs,
                    pull.take(1),
                    pull.drain((j) => resolve(j), () => reject(true))
                )
            })),
            pull.through(console.log),
            conn,
            pull.drain((x) => { console.log('result: ' + x.toString()) }, 
                       (err) => { console.log('error: ' + err) })
        )
    })
}

var startNetwork = promisify(function startNetwork(network, cb) {
    if (options.verbose) { console.log('Starting communication node') }
    network.start((err) => {
        if (err) cb(err)
        addProtocols(network)

        if (options.verbose) { console.log('Communication node ready, listening on:') }
        network.peerInfo.multiaddrs.forEach((ma) => {
            console.log(ma.toString() + '/ipfs/' + network.peerInfo.id.toB58String())
        })

        cb(null, network)
    })
})

var addMultiaddr = promisify(function addMultiaddr(peerInfo, port, cb) {
    // Let the OS pick the current network address
    peerInfo.multiaddr.add(multiaddr.fromNodeAddress({
        family: 'IPv4',
        address: '0.0.0.0',
        port: port
    }, 'tcp'))

    cb(null, peerInfo)
})

var createNetwork = promisify(function createNetwork(peerInfo, cb) {
    if (options.verbose) { console.log('Creating communication node') }
    var net = new Libp2p.Node(peerInfo)
    cb(null, net)
})

var options = {
    verbose: true
}

// Assumptions:
// - ipfs daemon with the go-client is running
// - ipfs init has been run previously to initialize an ipfs repo
module.exports = function (opts, cb) {
    if (cb === undefined) {
        cb = opts
    } else {
        if (opts.hasOwnProperty('verbose')) {
            options.verbose = opts.verbose
        }
    }

    if (opts === undefined) {
        throw new Error('Invalid callback function')
    }

    // This first section uses the go implementation (1) to obtain an identity
    // and network addresses, and (2) to publish the supported
    // protocols until js-ipfs supports enough features to be used directly
    // both for data and communication
    try {
        // We need the private key to create the peer Id but the API does not provide it
        // so we are retrieving it directly from the config
        if (options.verbose) { console.log('Reading config') }
        var config = JSON.parse(fs.readFileSync(path.join(getUserHome(), '.ipfs', 'config')))

        // Initialize ipfs and obtain network addresses (including the public IP
        // for nodes behind a NAT)
        if (options.verbose) { console.log('Starting ipfs api') }
        var ipfs = new IPFSApi()

        // We need to create a complete peer info (using the peer id) for using the
        // lower-level apis of libp2p for direct connection between nodes
        createPeerInfo(config)
        .then((peerInfo) => { 
            return Promise.resolve(4002)
            .then(usePortIfFree)
            .then((port) => {
                console.log('port: ' + port)
                return addMultiaddr(peerInfo, port)
            })
            .then(createNetwork)
            .then(startNetwork)
            .then((network) => {
                if (options.verbose) { console.log('Creating pando node') }
                return cb(null, new Node(network, ipfs))
            })
            .catch(cb)
         }).catch(cb)
    } catch (err) {
        cb(err)
    }
}
