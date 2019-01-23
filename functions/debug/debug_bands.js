const _ = require('lodash')

const secrets = require('../../.secrets')
const { table } = require('../lib/database')()
const bands = require('../lib/bands')
const store = require('../lib/store')
const bandMetadataStore = store.simpleKeyValue(table, 'band_metadata')

// Older events are broken
console.log('-------------------------------------------------')

/*
const query = tbl => tbl.where('date', '>=', '2019-01-01')
const allBands = store.getValues(table, 'events', doc => doc.band, query)
  .then(_.uniq)
  .then(Array.sort)
*/

bands.fetch(bandMetadataStore, secrets)(['Lövgrens'])
  .then(output => {
    console.log(JSON.stringify(output, null, 2))
  })
  .catch(console.error)
