// Libraries
const functions = require('firebase-functions')

// Dependencies
const { table, batch } = require('./lib/database')()
const { success, report, debug, json } = require('./lib/fn_helpers')

const secrets = require('../.secrets')
const core = require('./core')

const fetchIndex = core.fetchIndex(table)
const fetchEvents = core.fetchEvents(table)
const fetchVersions = core.fetchVersions(table)
const updateVersions = core.updateVersions(table)
const updateEvents = core.updateEvents(batch, table)
const updateBands = core.updateBands(batch, table, secrets)

/**
 * Topic function
 */

const dailyTopic = functions.pubsub.topic('daily-tick')

exports.updateVersionTopic = dailyTopic.onPublish((event, context) => {
  const log = debug('dailyTopic => updateVersionData(): ')
  const error = report()
  const done = success(log)

  return updateVersions(log, done, error)
})

exports.updateEventTopic = dailyTopic.onPublish((event, context) => {
  const log = debug('dailyTopic => updateEventData(): ')
  const error = report()
  const done = success(log)

  return updateEvents(log, done, error)
})

exports.updateBandsTopic = dailyTopic.onPublish((event, context) => {
  const log = debug('dailyTopic => updateBandsData(): ')
  const error = report()
  const done = success(log)

  return updateBands(log, done, error)
})

/**
 * Web functions
 */

// Must be us-central1 due to limitation in hosting. Hosting will redirect to wrong domain!
// https://firebase.google.com/docs/functions/locations under "* Important: "
// functions.region("europe-west-1").https

const httpsUS = functions.https

exports.updateVersions = httpsUS.onRequest((req, res) => {
  const log = debug('onRequest => updateVersions(): ')
  const error = report(res)
  const done = success(log, res)

  updateVersions(log, done, error)
})

exports.updateEvents = httpsUS.onRequest((req, res) => {
  const log = debug('onRequest => updateEvents(): ')
  const error = report(res)
  const done = success(log, res)

  updateEvents(log, done, error)
})

exports.updateBands = httpsUS.onRequest((req, res) => {
  const log = debug('onRequest => updateBands(): ')
  const error = report(res)
  const done = success(log, res)

  updateBands(log, done, error)
})

exports.getVersions = httpsUS.onRequest((req, res) => {
  fetchVersions(req.query)
    .then(versions => res.status(200).send(json(versions)))
    .catch(err => res.status(500).send('Error occurred: ' + err))
})

exports.getEvents = httpsUS.onRequest((req, res) => {
  fetchEvents(req.query)
    .then(events => res.status(200).send(json(events, true)))
    .catch(err => res.status(500).send('Error occurred: ' + err))
})

exports.index = httpsUS.onRequest((req, res) => {
  const log = debug('fetchIndex(): ')
  const error = report(res)
  const done = success(log, res)
  fetchIndex(log, done, error)
})
