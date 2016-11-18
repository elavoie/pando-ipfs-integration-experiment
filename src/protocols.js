var pull = require('pull-stream')
var debug = require('debug')
var log = debug('pando:protocols')
log.listener = debug('pando:protocols:listener')
log.listener.error = debug('pando:protocols:listener:error')
log.dialer = debug('pando:protocols:dialer')
log.dialer.error = debug('pando:protocols:dialer:error')
var job = require('./job')

function onDone (done) {
  return function (read) {
    return function (abort, cb) {
      read(abort, function (err, data) {
        if (err) {
          cb(err)
          return done()
        }
        cb(null, data)
      })
    }
  }
}

function createJob (node, data, cb) {
  let j = {
    job: new job.Job(node._fun, data),
    volunteer: 0,
    sink: pull.collect((err, outputs) => {
      if (err) {
        // Do not propagate error, wait for another
        // volunteer to restart the job
        log.error(err)
        return
      }

      var i = node._jobs.indexOf(j)
      if (i >= 0) {
        let output = outputs[0]
        log('returning output: ' + output)
        node._events.emit('job-completed', node._jobs[i])
        node._jobs.splice(i, 1)
        cb(null, output)
      }
    })
  }

  node._jobs.push(j)
  node._events.emit('job-started', j)

  return j
}

function sendJobTo (j, conn) {
  j.volunteer++
  pull(
    pull.values([j.job.toString()]),
    conn,
    pull.map((s) => job.Job.fromString(s)),
    pull.collect((err, jobs) => {
      j.volunteer--
      if (err) {
        log.listener.error(err)
      } else if (jobs.length === 0) {
        log.listener.error(new Error('no output received'))
      } else if (jobs.length > 1) {
        log.listener.error(new Error('multiple jobs received ' + jobs))
      } else if (jobs[0]._output === null) {
        log.listener.error(new Error('invalid job output'))
      } else {
        log.listener('received output: ' + jobs[0])
        pull(
          pull.values(jobs.map((j) => j._output)),
          j.sink
        )
      }
    })
  )
}

function pickJob (node) {
  for (var i = 0; i < node._jobs.length; ++i) {
    var j = node._jobs[i]
    if (j.volunteer === 0) {
      return j
    }
  }
  return null
}

function install (node, protocol) {
  const protocols = {
    '/jobs/1.0.0': {
      'listener': (protocol, conn) => {
        log.listener('protocol: ' + protocol)

        let j = pickJob(node)
        if (!j) {
          node._source.asyncMap((data, cb) => {
            let j = createJob(node, data, cb)
            sendJobTo(j, conn)
          })
        } else {
          sendJobTo(j, conn)
        }
      },
      'dialer': (next, done) => (err, conn) => {
        if (err) {
          log.dialer.error(err)
          return done(err)
        }

        let lastValue = true

        pull(
          conn,
          pull.map((s) => job.Job.fromString(s)),
          pull.asyncMap(job.run),
          pull.map((j) => j.toString()),
          pull.through((x) => {
            lastValue = false
            setImmediate(() => next())
          }),
          onDone(() => {
            if (lastValue) done()
          }),
          conn
        )
      }
    }
  }

  if (!protocols.hasOwnProperty(protocol)) {
    throw new Error('Unsupported protocol: ' + protocol)
  } else if (node._dialers !== null && node._dialers[protocol]) {
    throw new Error('Protocol already installed: ' + protocol)
  }

  node._libp2p.handle(protocol, protocols[protocol].listener)

  node._dialers = node._dialers || { }
  node._dialers[protocol] = function (destination, cb, done) {
    node._libp2p.dialByMultiaddr(
      destination,
      protocol,
      protocols[protocol].dialer(cb, done))
  }

  return node
}

module.exports = {
  install: install
}
