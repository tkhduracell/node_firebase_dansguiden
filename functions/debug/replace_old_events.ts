import _ from 'lodash'
import {database} from '../lib/database'
import {snapshotAsObj} from '../lib/utils'

const { table } = database()

async function run(): Promise<void> {

  const events = await table('events')
    .where('_id', '>', '2018_01_')
    .where('_id', '<=', '2018_12_')
    .get()

  const obj = snapshotAsObj(events)
  const keys = _.keys(obj)
  console.debug(keys)

  await Promise.all(keys.map(async (k) => {
    const doc = await table('events').doc(k).get()
    if (!doc.exists) {
      console.log(k)
    }
    return doc
  }))

  return
}

run()
