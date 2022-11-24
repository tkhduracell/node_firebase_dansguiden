import _ from 'lodash'
import { TableFn } from '../lib/database';
import { Scraper } from '../lib/scraper'
import { snapshotAsArray } from '../lib/utils';

export type Version = {
  lines: string[];
  name: string;
  date: string;
  html: string;
}

export function versionSort(v: Version): string {
  return v.name.split('.', 3)
    .map(s => s.padStart(4, '0'))
    .join('')
}

export function extractContent($: cheerio.CheerioAPI | cheerio.Root): Version {
  const content = $("div:contains('What's New') > h2")
    .parent()
    .parent()
    .find("div[itemprop='description']")
    .get()
    .map(block => $(block).text())
  const lines = _.flatMap(content, l => l.split(/\W*\*\W*/gi))
    .map(s => s.trim())
    .filter(s => s !== '')
    .filter(s => s.indexOf('Read more') === -1)
    .filter(s => s.indexOf('Collapse') === -1)
  const name = $("div:contains('Current Version') + span")
    .get()
    .map(itm => $(itm).text().trim())
    .join(', ')
  const date = $("div:contains('Updated') + span")
    .get()
    .map(itm => $(itm).text().trim())
    .join(', ')
  const html = $.html()

  return { lines, name, date, html }
}

export async function fetchLatestVersion (): Promise<Version> {
  const url = 'https://play.google.com/store/apps/details?id=feality.dans'

  console.log('Running Google Play parser...')
  const data = await Scraper.create(url, extractContent)

  return data
}

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
