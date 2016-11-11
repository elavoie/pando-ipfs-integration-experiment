var start = require(__dirname + '/start.js')
var work = require(__dirname + '/work.js')
var promisify = require(__dirname + '/promisify.js')

function saveNode (start) {
    return function (options, cb) {
        start(options, function (err, node) {
            if (err) return cb(err)

            pando._node = node
            cb(null, node)
        }) 
    } 
}

function node (cb) {
    if (pando._node === null) {
        pando.start((err, node) => {
            if (err) return cb(err)

            cb(null, node)
        })
    }
    cb(null, pando._node)
}

function addresses (node) {
    console.log('Pando node listening on:')
    node._libp2p.peerInfo.multiaddrs.forEach((a) => {
        console.log(a.toString() + '/ipfs/' + node._libp2p.peerInfo.id.toB58String()) 
    })
}

var pando = promisify({
    _node: null,
    node: node,
    start: saveNode(start),
    work: work
})

pando.addresses = addresses

module.exports = pando
