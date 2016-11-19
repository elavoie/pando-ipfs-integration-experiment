var Node = require('./node.js')

/*

function multiaddrs (node) {
  console.log('Pando node listening on:')
  node._libp2p.peerInfo.multiaddrs.forEach((a) => {
    console.log(a.toString() + '/ipfs/' + node._libp2p.peerInfo.id.toB58String())
  })
}

pando.multiaddrs = multiaddrs
*/

module.exports.Node = Node
