var start = require(__dirname + '/start.js')

function promisify(context) {
    function promisifyMethod(method) {
        return function () {
            const args = Array.prototype.slice.call(arguments);
            const lastIndex = args.length - 1;
            const lastArg = args && args.length > 0 ? args[lastIndex] : null;
            const cb = typeof lastArg === 'function' ? lastArg : null;

            if (cb) {
                return method.apply(context, args);
            }

            return new Promise((resolve, reject) => {
                args.push((err, val) => {
                    if (err) return reject(err);
                    resolve(val);
                });

                method.apply(context, args);
            });
        }
    }

    Object.keys(context)
    .filter((k) => typeof context[k] === 'function')
    .forEach((k) => {
        context[k] = promisifyMethod(context[k])
    })

    return context
}

function saveNode (start) {
    return function (cb) {
        start(function (err, node) {
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
})

pando.addresses = addresses

module.exports = pando
