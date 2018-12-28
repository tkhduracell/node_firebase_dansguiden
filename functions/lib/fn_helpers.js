const _ = require('lodash')

/**
 * Helper functions
 */
const json = (elms, withKey) => {
  var arr = []
  elms.forEach(function (element) {
    const obj = withKey ? {_id: element.id} : {}
    arr.push(_.merge(element.data(), obj))
  })
  return arr
}

function mapArray (snapshot, fn) {
  var output = []
  snapshot.forEach(doc => {
    output.push(fn ? fn(doc) : doc.data())
  })
  return output
}

const debug = (name) => {
  return console.log.bind(console.log, name)
}

const report = (res) => {
  return (err) => {
    if (res && !res.headersSent) {
      res.status(500).send(err.toString())
    } else {
      console.error(err)
    }
  }
}

const success = (log, res) => {
  return (output) => {
    if (res && !res.headersSent) {
      res.status(200).send(output)
    } else {
      log('Success! => ' + JSON.stringify(output))
    }
  }
}

module.exports = {success, report, debug, json, mapArray}
