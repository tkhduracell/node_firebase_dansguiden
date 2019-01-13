const _ = require('lodash')
const { snapshotAsArray } = require('./fn_helpers')

module.exports.getValues = (table, tableName, optPicker, optQuery) => {
  const query = optQuery || _.identity
  return query(table(tableName))
    .get()
    .then(snapshot => {
      return snapshotAsArray(snapshot, optPicker)
    })
}

module.exports.simpleKeyValue = (table, tableName, merge) => {
  const metadata = table(tableName)
  return {
    get: (band) => metadata.doc(band)
      .get()
      .then(doc => doc.exists ? doc.data() : undefined),
    set: (band, meta) => {
      return metadata.doc(band)
        .set(meta, { merge: merge || true })
        .then(ignored => band)
    }
  }
}
