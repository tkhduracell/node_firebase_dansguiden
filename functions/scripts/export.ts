import path from 'path'
import moment from 'moment'
import fs from 'fs'
import {promisify} from 'util'

import { Dumper } from '../lib/dumper'
import { database } from '../lib/database'

const { table } = database()
const fileExist = promisify(fs.exists)
const makeDir = promisify(fs.mkdir)

const ymd = moment().format("YYYY-MM-DD")
const dir = path.join(__dirname, '../backups', ymd)

const save = (tableName: string): Promise<object> => Dumper.dump(table, dir, tableName)

async function run(): Promise<void> {
  if (!await fileExist(dir)) {
    await makeDir(path.dirname(dir))
    await makeDir(dir)
  }

  await save('events')
  await save('versions')
  await save('images')
  await save('band_metadata')
  await save('metadata_dates')
  await save('metadata_bands')
  await save('metadata_places')
}

run()
