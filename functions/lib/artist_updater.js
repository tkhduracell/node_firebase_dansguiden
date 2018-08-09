const _ = require('lodash')

module.exports.update = (db) => {
  const metadata = db.collection('band_metadata')
    .get()
    .then(snapshot => get(snapshot, m => getImageAndId(m)))

  const eventsKeys = db.collection('events')
    .get()
    .then(snapshot => get(snapshot, e => e.band))

  return Promise.all([eventsKeys, metadata])
    .then(arr => {
      const [events, meta] = arr
      return Promise.all(_.flatMap(_.chunk(_.toPairs(events), 500), events_chunk => {
        const batch = db.batch()
        _.forEach(events_chunk, (pair) => {
          const [id, band] = pair
          const doc = db.collection('events').doc(id)
          if (meta[band]) {
            batch.update(doc, _.omitBy(meta[band], _.isUndefined))
          }
        })
        return batch.commit()
      }))
    })
    .then(writes => eventsKeys)
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
