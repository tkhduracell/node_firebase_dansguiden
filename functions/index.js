// Libraries
const _ = require('lodash')
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const pug = require('pug')
const moment = require('moment')

// Dependencies
const events = require('./lib/events.js')
const versions = require('./lib/versions.js')
const {
  success,
  report,
  debug,
  json,
  mapArray
} = require('./lib/fn_helpers')
const artistUpdater = require('./lib/artist_updater')

// App setup
admin.initializeApp()
const db = admin.firestore()
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG)

function database (collection) {
  const prefix = firebaseConfig.collection_prefix || ''
  return db.collection(prefix + collection)
}

/**
 * Cloud functions
 */

const fetchIndex = (log, done, error) => {
  const getVersions = database('versions').get()
  const getImages = database('images').get()

  Promise.all([getVersions, getImages])
    .then((resolved) => {
      const [versions, images] = resolved

      const opts = {
        compileDebug: false,
        images: json(images),
        versions: json(versions)
      }

      done(pug.renderFile('views/index.pug', opts))
    })
    .catch(error)
}

const fetchEvents = (params) => {
  const log = debug('fetchEvents(): ')
  var query = database('events')

  // default to today
  query = query
    .where('date', '>=', params.from || moment().format('YYYY-MM-DD'))
    .where('date', '<=', params.to || moment().add(7, 'days').format('YYYY-MM-DD'))

  // apply filters
  events.COLUMNS
    .filter(col => params[col])
    .forEach(col => {
      query = query.where(col, '==', params[col])
    })

  // order by date_band
  query = query.orderBy('date', 'asc')
  // apply limit
  query = query.limit(_.toSafeInteger(params.limit || '100'))

  return query.get()
}

const deleteOverlappingEvents = (output, log) => {
  const dates = output.filter(event => event.type === 'event')
    .map(e => e.data.date.format('YYYY-MM-DD'))

  return database('events')
    .where('date', '>=', _.min(dates))
    .where('date', '<=', _.max(dates))
    .get()
    .then(result => mapArray(result, e => e.id))
    .then(output => {
      const commits = _.chunk(output, 500).map((chunk, idx) => {
        const deleteBatch = db.batch()
        chunk.forEach(id => {
          log('Deleting event ' + id)
          const ref = database('events').doc(id)
          deleteBatch.delete(ref)
        })
        return deleteBatch.commit()
          .then((result) => log('Batch#' + idx + ' deletion done!'))
      })
      return Promise.all(commits)
    })
}

const batchWriteEvents = (output, log) => {
  const writes = _.chunk(output, 500).map((chunk, idx) => {
    log('Batch#' + idx + ' creating...')
    const batch = db.batch()

    chunk.filter(event => event.type === 'event')
      .forEach(source => {
        if (!source.data.date.isValid()) {
          return console.log('Invalid date: ' + JSON.stringify(source))
        }

        const event = _.pick(source.data, events.COLUMNS)
        const date = event.date.format('YYYY-MM-DD')
        const key = _([date, event.band]).map(_.snakeCase).join('_')
        const updateAt = new Date().getTime()
        const eventDoc = _.merge(event, {
          _id: key,
          date,
          updated_at: updateAt
        })

        log('Adding event ' + key)
        const doc = database('events').doc(key)
        batch.set(doc, eventDoc, {
          merge: true
        })
      })

    return batch.commit()
      .then((result) => log('Batch#' + idx + ' write done!'))
  })

  return Promise.all(writes)
}

const updateEvents = (log, done, error) => {
  return events.update(log).then((output) => {
    return deleteOverlappingEvents(output, log)
      .then(() => {
        log('Done deleting overlapps!')
        return batchWriteEvents(output, log)
          .then(() => done('Wrote ' + _.size(output) + ' events'))
      })
  }).catch(error)
}

const fetchVersions = (params) => {
  debug('fetchVersions(): ')
  var query = database('versions')
  return query.get()
}

const updateVersions = (log, done, error) => {
  return versions.update(log).then((data) => {
    const batch = db.batch()
    const key = _.snakeCase('v ' + data.name)

    log('Updating version' + key)
    const doc = database('versions').doc(key)
    batch.set(doc, {
      name: data.name,
      lines: data.lines
    }, {
      merge: true
    })

    return batch.commit()
      .then(() => done('Batch write done!'))
      .catch(err => error(err))
  }).catch(error)
}

const updateBandMetadata = (log, done, error) => {
  return artistUpdater.update(db)
    .then(done)
    .catch(error)
}

/**
 * Topic function
 */

const dailyTopic = functions.pubsub.topic('daily-tick')

exports.updateVersionTopic = dailyTopic.onPublish((event, callback) => {
  const log = debug('dailyTopic => updateVersionData(): ')
  const error = report()
  const done = success(log)

  return updateVersions(log, done, error)
})

exports.updateEventTopic = dailyTopic.onPublish((event, callback) => {
  const log = debug('dailyTopic => updateEventData(): ')
  const error = report()
  const done = success(log)

  return updateEvents(log, done, error)
})

exports.updateBandMetadataTopic = dailyTopic.onPublish((event, callback) => {
  const log = debug('dailyTopic => updateBandMetadata(): ')
  const error = report()
  const done = success(log)

  return updateBandMetadata(log, done, error)
})

/**
 * Web functions
 */

exports.updateVersions = functions.https.onRequest((req, res) => {
  const log = debug('onRequest => updateVersions(): ')
  const error = report(res)
  const done = success(log, res)

  updateVersions(log, done, error)
})

exports.updateEvents = functions.https.onRequest((req, res) => {
  const log = debug('onRequest => updateEvents(): ')
  const error = report(res)
  const done = success(log, res)

  updateEvents(log, done, error)
})

exports.updateBandMetadata = functions.https.onRequest((req, res) => {
  const log = debug('onRequest => updateBandMetadata(): ')
  const error = report(res)
  const done = success(log, res)

  updateBandMetadata(log, done, error)
})

exports.getVersions = functions.https.onRequest((req, res) => {
  fetchVersions(req.query)
    .then(versions => res.status(200).send(json(versions)))
    .catch(err => res.status(500).send('Error occurred: ' + err))
})

exports.getEvents = functions.https.onRequest((req, res) => {
  fetchEvents(req.query)
    .then(events => res.status(200).send(json(events, true)))
    .catch(err => res.status(500).send('Error occurred: ' + err))
})

exports.index = functions.https.onRequest((req, res) => {
  const log = debug('fetchIndex(): ')
  const error = report(res)
  const done = success(log, res)
  fetchIndex(log, done, error)
})
