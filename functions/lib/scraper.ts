import { StaticScraper } from 'scraperjs'

export class Scraper {
  static create<T>(url: string, extract: ($: cheerio.CheerioAPI) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      StaticScraper
        .create(url)
        .scrape(extract, (data: T) => resolve(data))
        .catch((err: Error) => reject(err))
    })
  }
}
