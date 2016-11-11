var pull = require('pull-stream')
var pando = require(__dirname)

module.exports = function (cb) {
    pando.node().then((node) => {
        node._libp2p.dialByMultiaddr(
            '/ip4/192.168.0.174/tcp/4002/ipfs/QmP4gHA2TjXuXjZ2qNk5T7eXB91aeZuWDQM7sUeiAF3yJE',
            '/jobs/1.0.0',
            function (err, conn) {
                if (err) return cb(err)
                
                pull(
                    conn,
                    pull.asyncMap(cb),
                    conn
                )
            }
        )
    })
}

