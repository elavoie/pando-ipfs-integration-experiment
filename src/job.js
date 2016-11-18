var FunctionUtils = require('nor-function')
var debug = require('debug')
var log = debug('pando:job')
log.error = debug('pando:job:error')

module.exports.error = function run (err) {
  throw err
}

module.exports.run = function run (job, cb) {
  log('received: ' + job)
  job._fun(job._input, (err, output) => {
    if (err) {
      log.error(err)
      return cb(err)
    }

    job._output = output
    log('output: ' + output)
    cb(null, job)
  })
}

function Job (fun, input) {
  this._id = Job.id++
  this._input = input
  this._output = null
  this._fun = fun
}

Job.prototype.toString = function () {
  return JSON.stringify({
    type: 'Job',
    id: this._id,
    input: this._input,
    output: this._output,
    fun: FunctionUtils(this._fun).stringify()
  })
}

Job.id = 0

Job.fromString = function (s) {
  var json = JSON.parse(s)
  if (json.type !== 'Job') {
    throw new Error('Invalid json job description: ' + s)
  }
  var job = new Job()
  job._id = json.id
  job._input = json.input
  job._output = json.output
  job._fun = FunctionUtils.parse(json.fun)
  return job
}

module.exports.Job = Job
