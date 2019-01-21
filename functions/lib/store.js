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
    get: (key) => metadata.doc(key)
      .get()
      .then(doc => doc.exists ? doc.data() : undefined),
    set: (key, value) => {
      console.log(`Updating ${key} => ${value}`)
      return metadata.doc(key)
        .set(value, { merge: merge || true })
        .then(ignored => value)
    }
  }
}
