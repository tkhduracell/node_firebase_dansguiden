
import _ from "lodash"
import { Scraper } from "../utils/scraper"

export type Place = {
  name: string
  city: string
  region: string
  county: string
  website_url: string
  facebook_url: string
}

const mapping = {
  'Dansställe': 'name',
  'Ort': 'city',
  'Län': 'region',
  'Kommun': 'county',
  'H': 'website_url',
  'F': 'facebook_url',
  'S': 'program_url'
}

export class PlacessParser {
  static async parse (): Promise<Place[]> {
    const result = await Scraper.create('https://www.danslogen.se/dansstallen/alla', PlacessParser.extractTableRows)
    return Promise.resolve(result)
  }

  static extractTableRows($: cheerio.Root): Place[] {
    const cols = $('.danceprogram table tr.headline')
      .children('th')
      .get()
      .map(x => $(x).text())

    const trs = $('.danceprogram table tr.odd,tr.even')
      .not('.headline')
      .get()
      .map(x => $(x).children('td').get().map(c => $(c).first().get(0) as unknown as cheerio.Cheerio) as cheerio.Cheerio[])
      .map(tr => tr.map(td => $(td).children('a').attr('href') ?? $(td).text().trim()))
      .map(elm => _.zip(cols, elm).filter(([key, val]) => key && val))
      .map(kvs => kvs.map(([k, v]) => ([mapping[k as keyof typeof mapping] ?? k, v])))
      .map(kvs => Object.fromEntries(kvs))
      .map(obj => obj.program_url ? {...obj, program_url: `https://www.danslogen.se/${obj.program_url}`} : obj)

    return trs
  }
}
