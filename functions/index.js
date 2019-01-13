// Libraries
const functions = require('firebase-functions')

// Dependencies
const { table, batch } = require('./lib/database')()
const { success, report, debug, snapshotAsArray } = require('./lib/fn_helpers')

const secrets = functions.config()
const core = require('./core')

const fetchIndex = core.fetchIndex(table)
const fetchEvents = core.fetchEvents(table)
const fetchVersions = core.fetchVersions(table)
const updateVersions = core.updateVersions(table)
const updateEvents = core.updateEvents(batch, table)
const updateBands = core.updateBands(batch, table, secrets)
const updateMetadata = core.updateMetadata(table)

// HTTP functions
// Must be us-central1 due to limitation in hosting. Hosting will redirect to wrong domain!
// https://firebase.google.com/docs/functions/locations under "* Important: "
// functions.region("europe-west-1").https
function onHttp (name, fn) {
  return functions.https.onRequest((req, res) => {
    const log = debug('onRequest => ' + name + '(): ')
    const error = report(res)
    const done = success(log, res)
    return fn(log, done, error)
  })
}

function onTopic (topic, name, fn) {
  return topic.onPublish((event, context) => {
    const log = debug('onPublish => ' + name + '(): ')
    const error = report()
    const done = success(log)
    return fn(log, done, error)
  })
}

const dailyTopic = functions.pubsub.topic('daily-tick')
const hourlyTopic = functions.pubsub.topic('hourly-tick')

exports.updateEventsTopic = onTopic(dailyTopic, 'updateEvents', updateEvents)
exports.updateBandsTopic = onTopic(dailyTopic, 'updateBands', updateBands)
exports.updateVersionTopic = onTopic(hourlyTopic, 'updateVersion', updateVersions)
exports.updateMetadataTopic = onTopic(hourlyTopic, 'updateMetadata', updateMetadata)

exports.index = onHttp('fetchIndex', fetchIndex)
exports.updateVersions = onHttp('updateVersions', updateVersions)
exports.updateEvents = onHttp('updateEvents', updateEvents)
exports.updateBands = onHttp('updateBands', updateBands)
exports.updateMetadata = onHttp('updateMetadata', updateMetadata)

exports.getVersions = functions.https.onRequest((req, res) => {
  fetchVersions(req.query)
    .then(versions => res.status(200).send(snapshotAsArray(versions)))
    .catch(err => res.status(500).send('Internal error: ' + err))
})

exports.getEvents = functions.https.onRequest((req, res) => {
  fetchEvents(req.query)
    .then(events => res.status(200).send(snapshotAsArray(events, v => v, true)))
    .catch(err => res.status(500).send('Internal error: ' + err))
})
