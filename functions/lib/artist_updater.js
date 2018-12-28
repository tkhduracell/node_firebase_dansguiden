const _ = require('lodash')

module.exports.update = (batch, table, log) => {
  const metadata = table('band_metadata')
    .get()
    .then(snapshot => {
      log('Fetched band_metadata table!')
      return asMap(snapshot, m => getImageAndId(m))
    })

  const eventsKeys = table('events')
    .get()
    .then(snapshot => {
      log('Fetched events table!')
      return asMap(snapshot, e => e.band)
    })

  return Promise.all([eventsKeys, metadata])
    .then(arr => {
      log('Starting events batch updates')
      const [events, meta] = arr
      log(`Joining ${_.size(events)} events with ${_.size(meta)} bands`)
      const pairChunks = _.chunk(_.toPairs(events), 500)
      return Promise.all(pairChunks.map((chunk, idx) => {
        log('Building batch#' + idx)
        const batcher = batch()
        const counters = { updated: 0, noops: 0 }
        _.forEach(chunk, (pair) => {
          const [id, band] = pair
          const doc = table('events').doc(id)
          if (meta[band]) {
            const changeset = _.omitBy(meta[band], _.isUndefined)
            batcher.update(doc, changeset)
            counters.updated++
            // log(`Updating event ${id} with data for ${band} => ${JSON.stringify(changeset)}`)
          } else {
            counters.noops++
          }
        })
        log(`Executing batch#${idx}, ${JSON.stringify(counters)}`)
        return batcher.commit()
      }))
    })
    .then(writes => {
      log(`${_.size(writes)} batches committed succesfully!`)
      return eventsKeys
    })
}

function asMap (snapshot, valueFunction) {
  const fn = valueFunction || _.identity
  var output = {}
  snapshot.forEach(doc => {
    output[doc.id] = fn(doc.data())
  })
  return output
}

function getImageAndId (metadata) {
  return _.isEmpty(metadata) ? undefined : {
    spotify_id: metadata.id,
    spotify_image: getImage(metadata.images)
  }
}

function getImage (images) {
  return (_.first(
    _.orderBy(images || [], i => i.height * i.width)
  ) || {}).url
}
