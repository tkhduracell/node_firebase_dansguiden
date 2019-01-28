// Libraries
const _ = require('lodash')
const moment = require('moment')
const path = require('path')

// Dependencies
const bands = require('./lib/bands')
const events = require('./lib/events')
const eventsDecorator = require('./lib/events_decorator')
const { fetchLatestVersion, versionSort } = require('./lib/versions')
const { simpleKeyValue, getValues } = require('./lib/store')
const { debug, snapshotAsObj, snapshotAsArray } = require('./lib/fn_helpers')

module.exports.fetchIndex = (table) => (log, done, error) => {
  const getVersions = table('versions').get()
  const getImages = table('images').get()

  Promise.all([getVersions, getImages])
    .then((resolved) => {
      const [versions, images] = resolved
      const opts = {
        compileDebug: false,
        images: snapshotAsObj(images),
        versions: _.orderBy(snapshotAsObj(versions), versionSort, 'desc')
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

const batchDeleteOverlappingEventsFn = (batch, table) => (output, log) => {
  const dates = output.filter(event => event.type === 'event')
    .map(e => e.data.date.format('YYYY-MM-DD'))

  log(`Starting batch delete between ${_.min(dates)} <-> ${_.max(dates)}`)
  return table('events')
    .where('date', '>=', _.min(dates))
    .where('date', '<=', _.max(dates))
    .get()
    .then(result => {
      log(`Found ${result.size} overlapping events`)
      return snapshotAsArray(result, e => e._id)
    })
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
  const batchWrite = batchWriteFn(batch, table, 'events', log)
  return batchWrite(output, source => {
    if (source.type !== 'event') {
      return log(`Ignoring non-event ${source.type} item...`)
    }

    if (!source.data.date.isValid()) {
      return log('Invalid date: ' + JSON.stringify(source))
    }

    const event = _.pick(source.data, events.COLUMNS)
    const date = event.date.format('YYYY-MM-DD')
    const key = _([date, event.band]).map(_.snakeCase).join('_')
    const updateAt = new Date().getTime()
    const value = _.merge(event, {
      _id: key,
      date,
      updated_at: updateAt
    })
    return {key, value}
  })
}

const batchWriteFn = (batch, table, tableName, log) => (output, kvFn) => {
  const chunks = _.chunk(output, 500)
  const writes = chunks.map((chunk, idx) => {
    log('Batch#' + idx + ' creating...')
    const batcher = batch()
    chunk.forEach(source => {
      const updateAt = new Date().getTime()

      const result = kvFn(source)
      if (result) {
        const {key, value} = result
        const document = _.merge(value, {
          _id: key,
          updated_at: updateAt
        })
        log('Adding change to ' + key)
        const ref = table(tableName).doc(key)
        batcher.set(ref, document, {merge: true})
      }
    })

    return batcher.commit()
      .then((result) => log('Batch#' + idx + ' write done!'))
  })
  return Promise.all(writes)
}

module.exports.updateBands = (batch, table, secrets) => (log, done, error) => {
  const bandsKeyValueStore = simpleKeyValue(table, 'band_metadata')

  // Older events are broken
  const query = tbl => tbl.where('date', '>=', '2019-01-01')

  log('Getting current bands in events')
  const allBands = getValues(table, 'events', doc => doc.band, query)
    .then(_.uniq)
    .then(Array.sort)

  log('Starting band update')
  return bands.fetch(bandsKeyValueStore, secrets)(allBands)
    .then(output => {
      log('Wrote ' + _.size(output) + ' bands')
      return output
    })
    .then(() => log('Completed band metadata update!'))
    .then(done)
    .catch(error)
}

module.exports.updateEvents = (batch, table) => (log, done, error) => {
  const batchDeleteOverlappingEvents = (data) => batchDeleteOverlappingEventsFn(batch, table)(data, log)
  const batchWriteEvents = (data) => batchWriteEventsFn(batch, table)(data, log)
  const updateEventMetadata = () => eventsDecorator.update(batch, table, log)

  log('Starting event update')
  return events.parse(log)
    .then(output => {
      return batchDeleteOverlappingEvents(output)
        .then(ignored => output)
    })
    .then(output => {
      log('Deleted overlapps')
      return output
    })
    .then(output => batchWriteEvents(output))
    .then(output => {
      log('Wrote ' + _.size(output) + ' events')
      return output
    })
    .then(() => {
      log('Starting event metadata updates')
      return updateEventMetadata()
    })
    .then(() => log('Completed event metadata update!'))
    .then(done)
    .catch(error)
}

module.exports.updateVersions = (table) => (log, done, error) => {
  return fetchLatestVersion(log)
    .then((data) => {
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
    })
    .catch(error)
}

module.exports.updateMetadata = (table) => (log, done, error) => {
  const today = new Date().toISOString().slice(0, 10)
  const future = col => col.where('date', '>=', today)
    .where('date', '<', '2019-02-01')

  log('Updating metadata table...')

  const updater = (fn, db) => getValues(table, 'events', fn, future)
    .then(values => _.each(_.countBy(values), (v, k) => db.set(k, {_id: k, count: v})))
    .catch(error)

  return Promise.all([
    updater(e => e.band, simpleKeyValue(table, 'metadata_bands')),
    updater(e => e.place, simpleKeyValue(table, 'metadata_places')),
    updater(e => e.date, simpleKeyValue(table, 'metadata_dates'))
  ]).then(done)
}

module.exports.fetchVersions = (table) => () => {
  return table('versions').get()
}
