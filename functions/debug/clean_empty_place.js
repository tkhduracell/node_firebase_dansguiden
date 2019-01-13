const _ = require('lodash')
const {table} = require('../lib/database')()
const {snapshotAsObj} = require('../lib/fn_helpers')

table('events')

  .where('region', '==', 'Stockholm')
  .where('date', '>=', '2018-12-10')
  .where('date', '<=', '2019-01-15')

  .get()
  .then(snapshotAsObj)
  .catch(error => console.error(error))
  .then(obj => {
    const keys = _.keys(obj)
    console.debug(keys)

    keys.forEach(e => {
      // db.collection('events')
      //   .doc(e)
      //   .delete()

      console.log('Removing', e)
    })
  })
  .catch(err => console.error(err))
