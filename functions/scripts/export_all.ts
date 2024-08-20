import path from 'path'
import moment from 'moment'
import fs from 'fs'
import { promisify } from 'util'

import { database } from '../src/lib/utils/database'
import { snapshotAsObj } from '../src/lib/utils/utils'
import { TableFn } from '../src/lib/utils/database'


const { table } = database()
const fileExist = promisify(fs.exists)
const makeDir = promisify(fs.mkdir)

const ymd = moment().format("YYYY-MM-DD")
const dir = path.join(__dirname, '../backups', ymd)

const save = (tableName: string): Promise<object> => Dumper.dump(table, dir, tableName)
const writeFile = promisify(fs.writeFile)

run()

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

class Dumper {
  static async dump(table: TableFn, dir: string, tableName: string): Promise<{ [key: string]: object }> {
    const snapshot = await table(tableName).get()

    const data = { [tableName]: snapshotAsObj<object>(snapshot) }
    const file = path.join(dir, tableName + '-export.json')

    try {
      await writeFile(file, JSON.stringify(data, null, 2), 'utf8')
      console.log(`The file was saved! ${file}`)
    } catch (error) {
      console.error(error)
    }
    return data
  }
}

