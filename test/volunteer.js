var pando = require('../')
var node = new pando.Node({port: 0})
node.start(() => {
  node.volunteer('/ip4/192.168.0.174/tcp/4002/ipfs/QmP4gHA2TjXuXjZ2qNk5T7eXB91aeZuWDQM7sUeiAF3yJE', null, (err) => { if (err) throw err; else process.exit(0) })
})
