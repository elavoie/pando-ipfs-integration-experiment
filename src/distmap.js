module.exports = function (handles) {
  if (typeof handles !== 'object') {
    throw new Error('Invalid handles object')
  }
  var reading = false
  var abort = false
  return function (read) {
    var i = 0
    var j = 0
    var last = 0
    var seen = []
    var ended = false
    var _cb
    var error

    function drain () {
      if (_cb) {
        var cb = _cb
        if (error) {
          _cb = null
          return cb(error)
        }
        if (Object.hasOwnProperty.call(seen, j)) {
          _cb = null
          var data = seen[j]
          delete seen[j]; j++
          cb(null, data)
        } else if (j >= last && ended) {
          _cb = null
          cb(ended)
        }
      }
    }

    handles.asyncMap = function (map) {
      if (ended) return drain()
      // If currently busy reading a value from the source,
      // defer until the source is available
      if (reading) {
        return setImmediate(() => {
          handles.asyncMap(map)
        })
      }
      reading = true
      read(abort, function (end, data) {
        reading = false
        if (end) {
          last = i; ended = end
          drain()
        } else {
          var k = i++

          map(data, function (err, data) {
            seen[k] = data
            if (err) error = err
            drain()
          })
        }
      })
    }

    return function (_abort, cb) {
      if (_abort) {
        read(ended = abort = _abort, function (err) {
          if (cb) return cb(err)
        })
      } else {
        _cb = cb
        drain()
      }
    }
  }
}
