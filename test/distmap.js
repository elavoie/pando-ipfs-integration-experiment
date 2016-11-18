var distmap = require('../src/distmap.js')
var pull = require('pull-stream')

var handles = {}
pull(
  pull.count(100),
  distmap(handles),
  pull.through((x) => console.log('output: ' + x)),
  pull.drain()
)

function worker (i) {
  (function next () {
    handles.asyncMap((x, cb) => {
      console.log('worker ' + i + ' processes ' + x)
      setTimeout(() => {
        cb(null, x * x)
        next()
      }, Math.random() * 1000)
    })
  })()
}

for (var i = 1; i <= 10; ++i) {
  worker(i)
}
