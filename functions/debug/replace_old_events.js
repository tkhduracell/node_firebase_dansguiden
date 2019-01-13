const _ = require('lodash')
const {table} = require('../lib/database')()
const {snapshotAsObj} = require('../lib/fn_helpers')

table('events')
  .where('_id', '>', '2018_01_')
  .where('_id', '<=', '2018_12_')
  .get()
  .then(snapshotAsObj)
  .then(obj => {
    const keys = _.keys(obj)
    console.debug(keys)

    keys.forEach(k => {
      table('events')
        .doc(k)
        .get()
        .then(doc => {
          if (!doc.exists) {
            console.log(k)
          }
        })
    })
  })
  .catch(err => console.error(err))
