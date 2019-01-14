const _ = require('lodash')

/**
 * Helper functions
 */

module.exports.snapshotAsArray = (snapshot, optFn, includeKey) => {
  var output = []
  const fn = optFn || _.identity
  snapshot.forEach(doc => {
    const data = fn(doc.data())
    if (_.isObject(data)) {
      const extension = includeKey ? {_id: doc.id} : {}
      output.push(_.merge(data, extension))
    } else {
      output.push(data)
    }
  })
  return output
}

module.exports.snapshotAsObj = (snapshot, optFn) => {
  var output = {}
  const fn = optFn || _.identity
  snapshot.forEach(doc => {
    output[doc.id] = fn(doc.data())
  })
  return output
}

module.exports.debug = (name) => {
  return console.log.bind(console.log, name)
}

module.exports.report = (res) => {
  return (err) => {
    if (res && !res.headersSent) {
      res.status(500).send(err.toString())
    } else {
      console.error(err)
    }
  }
}

module.exports.success = (log, res) => {
  return (output) => {
    if (res && !res.headersSent) {
      res.status(200).send(output)
    } else {
      log('Success! => ' + JSON.stringify(output))
    }
  }
}
