const _ = require('lodash')
const {snapshotAsObj} = require('../lib//fn_helpers')

module.exports.update = (batch, table, log) => {
  const metadata = table('band_metadata')
    .get()
    .then(snapshot => {
      log('Fetched band_metadata table!')
      return snapshotAsObj(snapshot, m => getImageAndId(m))
    })

  const eventsKeys = table('events')
    .get()
    .then(snapshot => {
      log('Fetched events table!')
      return snapshotAsObj(snapshot, e => e.band)
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
        const counters = { touched: 0, unknowns: 0 }
        _.forEach(chunk, (pair) => {
          const [id, band] = pair
          const bandRemaped = remap(band)
          const doc = table('events').doc(id)
          if (meta[band] || meta[bandRemaped]) {
            const metadata = meta[band] || meta[bandRemaped]
            const changeset = _.omitBy(metadata, _.isUndefined)
            batcher.update(doc, changeset)
            counters.touched++
            // log(`Updating event ${id} with data for ${band} => ${JSON.stringify(changeset)}`)
          } else {
            counters.unknowns++
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

function remap (band) {
  return band.replace(/-/gi, '')
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
