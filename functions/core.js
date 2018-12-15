// Libraries
const _ = require('lodash')
const moment = require('moment')
const path = require('path')

// Dependencies
const events = require('./lib/events.js')
const versions = require('./lib/versions.js')
const {
  debug,
  json,
  mapArray
} = require('./lib/fn_helpers')
const artistUpdater = require('./lib/artist_updater')

module.exports.fetchIndex = (table) => (log, done, error) => {
  const getVersions = table('versions').get()
  const getImages = table('images').get()

  Promise.all([getVersions, getImages])
    .then((resolved) => {
      const [versions, images] = resolved

      const opts = {
        compileDebug: false,
        images: json(images),
        versions: json(versions)
      }

      done(require('pug').renderFile(path.join(__dirname, 'views/index.pug'), opts))
    })
    .catch(error)
}

module.exports.fetchEvents = (table) => (params) => {
  debug('fetchEvents(): ')
  var query = table('events')

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

const deleteOverlappingEventsFn = (batch, table) => (output, log) => {
  const dates = output.filter(event => event.type === 'event')
    .map(e => e.data.date.format('YYYY-MM-DD'))

  return table('events')
    .where('date', '>=', _.min(dates))
    .where('date', '<=', _.max(dates))
    .get()
    .then(result => mapArray(result, e => e.id))
    .then(output => {
      const commits = _.chunk(output, 500).map((chunk, idx) => {
        const deleteBatch = batch()
        chunk.forEach(id => {
          log('Deleting event ' + id)
          const ref = table('events').doc(id)
          deleteBatch.delete(ref)
        })
        return deleteBatch.commit()
          .then((result) => log('Batch#' + idx + ' deletion done!'))
      })
      return Promise.all(commits)
    })
}

const batchWriteEventsFn = (batch, table) => (output, log) => {
  const writes = _.chunk(output, 500).map((chunk, idx) => {
    log('Batch#' + idx + ' creating...')
    const batcher = batch()

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
        const doc = table('events').doc(key)
        batcher.set(doc, eventDoc, {
          merge: true
        })
      })

    return batcher.commit()
      .then((result) => log('Batch#' + idx + ' write done!'))
  })

  return Promise.all(writes)
}

module.exports.updateEvents = (batch, table) => (log, done, error) => {
  const deleteOverlappingEvents = deleteOverlappingEventsFn(batch, table)
  const batchWriteEvents = batchWriteEventsFn(batch, table)

  return events.update(log).then((output) => {
    return deleteOverlappingEvents(output, log)
      .then(() => {
        log('Done deleting overlapps!')
        return batchWriteEvents(output, log)
          .then(() => done('Wrote ' + _.size(output) + ' events'))
      })
  }).catch(error)
}

module.exports.updateBandMetadata = (batch, table) => (log, done, error) => {
  log('Start event metadata update')
  return artistUpdater.update(batch, table, log)
    .then(done)
    .then(() => log('Completed event metadata update!'))
    .catch(error)
}

module.exports.updateVersions = (table) => (log, done, error) => {
  return versions.getLatest(log).then((data) => {
    if (_.isEmpty(data.name) || _.isEmpty(data.lines)) {
      log('No updated version, result was empty: ' + JSON.stringify(data))
    }

    const key = _.snakeCase('v ' + data.name)

    log('Updating version' + key)
    return table('versions').doc(key).set({
      name: data.name,
      lines: data.lines
    }, {
      merge: true
    }).then(() => done('Batch write done!'))
  }).catch(error)
}

module.exports.fetchVersions = (table) => (params) => {
  debug('fetchVersions(): ')
  var query = table('versions')
  return query.get()
}
