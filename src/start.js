var path = require('path')
var fs = require('fs')
var IPFSApi = require('ipfs-api')
var Libp2p = require('libp2p-ipfs')
var PeerId = require('peer-id')
var PeerInfo = require('peer-info')
var multiaddr = require('multiaddr')
var ip = require('ip')

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

// libp2p is used for communication between nodes within a dedicated for Pando nodes
// ipfs is used for storing and retrieving data
function Node(libp2p, ipfs) {
    this._libp2p = libp2p
    this._ipfs = ipfs
}

// Assumptions:
// - ipfs daemon with the go-client is running
// - ipfs init has been run previously to initialize an ipfs repo
module.exports = function (options, cb) {
    if (cb === undefined) {
        cb = options
        options = {
            verbose: false
        }
    }

    if (options === undefined) {
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

        // We need to create a complete peer info (using the peer id) for using the
        // lower-level apis of libp2p for direct connection between nodes
        if (options.verbose) { console.log('Retrieving PeerId') }
        PeerId.createFromPrivKey(config.Identity.PrivKey, (err, peerId) => {
            if (err) return cb(err)

            var peerInfo = new PeerInfo(peerId)

            // Initialize ipfs and obtain network addresses (including the public IP
            // for nodes behind a NAT)
            if (options.verbose) { console.log('Starting ipfs api') }
            var ipfs = new IPFSApi()

            if (options.verbose) { console.log('Retrieving network addresses from daemon') }
            ipfs.id()
            .then((node) => {
                // We use the addresses obtained using the go implementation to have
                // both the LAN and public IP address and derive new addresses for the
                // communication network with different ports (+1, typically 4002)
                if (options.verbose) { console.log('Retrieving daemon multi-addresses') }
                mas = node.addresses
                .map(multiaddr)
                .map((a) => a.decapsulate('ipfs'))

                if (options.verbose) { 
                    console.log('Retrieved:') 
                    mas.forEach((a) => { console.log(a) })
                }

                if (options.verbose) { console.log('Creating a new multi-addresses') }
                peerInfo.multiaddr.add(multiaddr.fromNodeAddress({
                    family: 'IPv4',
                    address: ip.address(),
                    port: 4002
                }, 'tcp'))

                if (options.verbose) {
                    console.log('PeerInfo:')
                    console.log(peerInfo)
                }

                if (options.verbose) { console.log('Creating communication node') }
                var net = new Libp2p.Node(peerInfo)

                if (options.verbose) { console.log('Starting communication node') }
                net.start((err) => {
                    if (err) cb(err)

                    if (options.verbose) { console.log('Adding pando protocols') }
                    net.handle('/hello/1.0.0', (protocol, conn) => {
                        console.log('received hello')
                        pull(
                            pull.values(['world']),
                            conn
                        )
                    })

                    if (options.verbose) { console.log('Communication node ready, listening on:') }
                    peerInfo.multiaddrs.forEach((ma) => {
                        console.log(ma.toString() + '/ipfs/' + peerId.toB58String())
                    })

                    cb(null, new Node(net, ipfs))
                })
            }).catch(cb)
        })
    } catch (err) {
        cb(err)
    }
}
