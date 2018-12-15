const _ = require('lodash')

module.exports.update = (batch, table, log) => {
  const metadata = table('band_metadata')
    .get()
    .then(snapshot => {
      log('Fetched band_metadata table!')
      return get(snapshot, m => getImageAndId(m))
    })

  const eventsKeys = table('events')
    .get()
    .then(snapshot => {
      log('Fetched events table!')
      return get(snapshot, e => e.band)
    })

  return Promise.all([eventsKeys, metadata])
    .then(arr => {
      log('Starting events batch updates')
      const [events, meta] = arr
      return Promise.all(_.flatMap(_.chunk(_.toPairs(events), 500), (chunk, idx) => {
        log('Building batch#' + idx)
        const batcher = batch()
        _.forEach(chunk, (pair) => {
          const [id, band] = pair
          const doc = table('events').doc(id)
          if (meta[band]) {
            const changeset = _.omitBy(meta[band], _.isUndefined)
            batcher.update(doc, changeset)
            log(`Updating event ${id} with data for ${band} => ${JSON.stringify(changeset)}`)
          }
        })
        log('Executing batch#' + idx)
        return batcher.commit()
      }))
    })
    .then(writes => {
      log('Batches committed succesfully! writes: ' + JSON.stringify(writes, null, 2))
      return eventsKeys
    })
}

function get (snapshot, fn) {
  fn = fn || _.identity
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
