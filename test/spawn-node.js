var pando = require('../')
var pull = require('pull-stream')

var node = new pando.Node()

pull(
  pull.count(1000),
  // node.distmap should be a drop-in replacement for pull.asyncMap
  node.distmap(function (data, cb) {
    console.log('processing: ' + JSON.stringify(data))
    setTimeout(() => cb(null, data * data), Math.random() * 5000)
  }),
  pull.drain(
    (x) => console.log('output: ' + x),
    (err) => {
      if (err) return console.log(err)
      console.log('done: ' + err)
      setTimeout(() => process.exit(0), 100)
    })
)

/*
node.onListening(() => {
  var node = new pando.Node({port: 4003}).start(() => {
    node.volunteer(
      '/ip4/127.0.0.1/tcp/4002/ipfs/QmP4gHA2TjXuXjZ2qNk5T7eXB91aeZuWDQM7sUeiAF3yJE')
  })
})
*/

node.onJob(() => {
  console.log('nb of concurrent jobs: ' + node._jobs.length)
})
