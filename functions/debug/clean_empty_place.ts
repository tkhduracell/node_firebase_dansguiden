import _ from 'lodash'
import {database} from '../lib/database'
import {snapshotAsObj} from '../lib/utils'

const { table } = database()

async function run(): Promise<void> {
  const events = await table('events')
    .where('region', '==', 'Stockholm')
    .where('date', '>=', '2018-12-10')
    .where('date', '<=', '2019-01-15')
    .get()

  const obj = snapshotAsObj(events)

  const keys = _.keys(obj)
  console.debug(keys)

  keys.forEach(e => {
    // db.collection('events')
    //   .doc(e)
    //   .delete()
    console.log('Removing', e)
  })
}

run()
