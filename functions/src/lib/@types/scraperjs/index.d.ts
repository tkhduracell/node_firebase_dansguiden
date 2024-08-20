
declare module "scraperjs" {
  import type cheerio from 'cheerio'

  export class StaticScraper {
    static create: (s: string) => Scraper
  }

  export class Scraper {
    scrape<T>($: ScraperExtract<T>, callback: ScraperData<T>): Promise<T>
  }

  export type ScraperData<T> = (data: T) => void
  export type ScraperExtract<T> = (query: cheerio.CheerioAPI) => T

}
