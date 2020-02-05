import fs from 'fs'
import path from 'path'
import {promisify} from 'util'

import { snapshotAsObj } from './utils'
import { TableFn } from './database'

const writeFile = promisify(fs.writeFile)

export class Dumper {
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
