import _ from 'lodash'
import { Scraper } from '../../utils/scraper'

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
