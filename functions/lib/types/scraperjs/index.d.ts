
declare module "scraperjs" {
  export class StaticScraper {
    static create: (s: string) => Scraper
  }

  export class DynamicScraper {

  }

  export type ScraperData<T> = (data: T) => void
  export type ScraperExtract<T> = (query: ScraperQuery) => T

  export class Scraper {
    scrape<T>($: ScraperExtract<T>, callback: ScraperData<T>): Promise<T>
  }

  export type ScraperQuery = (query: string | ScraperNode) => ScraperNode & ScraperNodeQuery

  export class ScraperNode {
    html: () => string
    text: () => string
    parent: () => ScraperNode
    children: (query: string) => ScraperNodeQuery
    find: (query: string) => ScraperNodeQuery
    not: (query: string) => ScraperNodeQuery
    attr: (attr: string) => string
  }

  export class ScraperNodeQuery {
    get: () => ScraperNode[]
    not: (query: string) => ScraperNodeQuery
    first: () => ScraperNode
  }


}
