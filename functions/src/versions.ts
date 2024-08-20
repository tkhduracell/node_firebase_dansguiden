import _ from "lodash"
import { fetchLatestVersion, Version, versionSort } from "./lib/google/play/versions"
import { TableFn } from "./lib/utils/database"
import { snapshotAsArray } from "./lib/utils/utils"

export class Versions {
    static async fetch (table: TableFn, sorted?: boolean): Promise<Version[]> {
      const versions = await table('versions').get()
      const list = snapshotAsArray<Version>(versions)
      return sorted ? _.sortBy(list, versionSort) : list
    }
  
    static async update (table: TableFn): Promise<Version> {
      const version: Version = await fetchLatestVersion()
  
      const invalid = _.isEmpty(version.name) || _.isEmpty(version.lines)
      if (invalid) {
        console.log('No updated version, result was empty: ' + JSON.stringify(version, null, 2))
      }
  
      const key = _.snakeCase('v ' + version.name)
  
      console.log('Updating version' + key)
      const ref = table('versions').doc(key)
  
      const data = _.pickBy(version, (_k, v) => !_.isNull(v)) as object
  
      await ref.set(data, { merge: true })
  
      return version
    }
  }