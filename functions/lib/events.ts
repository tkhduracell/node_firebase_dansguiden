import _ from 'lodash'

import { parseYearDate, validateWeekDay, validateDate, fixTime } from './date'
import { LogFn } from './log'
import { DanceEvent } from './types'
import { ScraperQuery, ScraperNode } from 'scraperjs'

import { Scraper } from './scraper'
import { InternalDanceEvent } from '../src/core'
import { zipAsObj, removeNullValues } from './utils'
import { serialDelayed } from './promises'

const url = 'http://www.danslogen.se'

const COLUMN_MAP = {
  'Datum-0': 'weekday',
  'Datum-1': 'date',
  'Tid': 'time',
  'Dansband': 'band',
  '': '',
  'Dansställe': 'place',
  'Ort': 'city',
  'Kommun': 'county',
  'Län': 'region',
  'Övrigt': 'extra'
} as { [key: string]: string }

export const COLUMNS = _.values(COLUMN_MAP)

export function asEntry<T>($: ScraperQuery, tr: ScraperNode, databaseColumns: string[]): T {
  const values = tr.children('td')
    .get()
    .map((elm) => $(elm).text().replace(/\s+/gi, ' ').trim()) // Trim
  const keys = databaseColumns
  const obj = zipAsObj(keys, values)
  return _.omitBy(obj, _.isEmpty) as unknown as T
}

export function asDatabaseColumns($: ScraperQuery, html: ScraperNode): string[] {
  const columnsElm = $(html).children('th').get()

  const columns = _.flatMap(columnsElm, itm => {
    const colspan = parseInt($(itm).attr('colspan') || '1')
    const txt = $(itm).text().trim()
    if (colspan === 1) {
      return [txt]
    } else {
      const range = _.range(colspan).map((v, i) => i)
      return range.map(i => txt + '-' + i)
    }
  })
  return columns.map(itm => COLUMN_MAP[itm])
}

export type InternalEvent<T> = {
  type: string;
  debug: {
    raw: string;
    pretty: string;
    text: string;
    url: string;
  };
  data: T;
  header: string;
}

type Page = { title: string; link: string }

function parseAndFilterPages(res: Page[]): Page[] {
  return res.filter((obj) => obj.title.startsWith('Visa danser i '))
}

function getPages ($: ScraperQuery): Page[] {
  return $('a[title]').get()
    .map((itm: ScraperNode) => {
      return {
        link: $(itm).attr('href'),
        title: $(itm).attr('title')
      }
    })
}

type RowFunction<T, V> = (t: T) => T | V

function onRowType<T extends {type: string}, V>(type: string, fn: (arg0: T) => V): RowFunction<T, V> {
  return (itm: T): T | V  => {
    if (itm && itm.type === type) {
      return fn(itm)
    }
    return itm
  }
}

function onEvent<T extends {type: string}, V>(fn: (arg0: T) => V ): RowFunction<T, V> {
  return onRowType('event', fn)
}

function onEventMap<D>(fn: (arg0: D) => D): RowFunction<InternalEvent<D>, InternalEvent<D>> {
  return onRowType('event', (itm) => {
    return Object.assign({}, itm, {
      data: fn(itm.data)
    })
  })
}

function onEventSideEffect<D>(fn: (arg0: D) => void): RowFunction<InternalEvent<D>, InternalEvent<D>> {
  return onRowType('event', (itm) => {
    fn(itm.data)
    return itm
  })
}

export async function parse (debug: LogFn, months?: string[]): Promise<InternalEvent<DanceEvent>[]> {

  function readPage ($: ScraperQuery, url: string): InternalDanceEvent[] {
    const databaseColumns = asDatabaseColumns($, $('tr.headline').first())

    const dateHeaderElm = $('tr').not('.headline').not("tr[class^='r']").first()
    const header = $(dateHeaderElm).text().replace(/\s+/gi, ' ').trim()
    const rows = $("tr[class^='r']").get()

    debug(`Processing ${rows.length} rows... (page: ${header})`)

    return rows.map((itm) => {
          return {
            type: 'event',
            debug: {
              raw: $(itm).html(),
              pretty: $(itm).html()
                .replace(/\n/g, '')
                .replace(/\s+/g, ' ')
                .replace(/>\s+</g, '><')
                .trim(),
              text: $(itm).text()
                .replace(/[\n\t]+/g, ' '),
              url
            },
            data: asEntry<DanceEvent>($, $(itm), databaseColumns),
            header
          } as InternalEvent<DanceEvent>;
      })
      .filter(itm => {
        // Removing bad events in source
        return !itm.debug.text.trim().endsWith(">")
      })
      .map(onEvent<InternalDanceEvent, InternalDanceEvent>(itm => Object.assign({}, itm, {
        data: Object.assign({}, itm.data, {
          date: parseYearDate(itm.header, itm.data.date).format("YYYY-MM-DD"),
          time: fixTime(itm.data.time)
        })
      })))
      .map(onEventSideEffect(e => {
        validateDate(e.date, debug)
        validateWeekDay(e.date, e.weekday, debug)
      }))
      .map(onEventMap(e => removeNullValues(e)));
  }

  function loadPage (page: Page): Promise<InternalDanceEvent[]> {
    debug('Running Dansguiden parse on page ' + JSON.stringify(page))
    return Scraper.create(url + page.link, scpr => {
      return readPage(scpr, url + page.link)
    })
  }

  debug('Running Dansguiden parser...')

  const pages = await Scraper.create(url + '/dansprogram', getPages)

  const linkContents = parseAndFilterPages(pages)
    .filter(p => !_.isArray(months) || _.some(months, m => p.title.includes(m)))
    .map(loadPage)

  const contents = serialDelayed(linkContents, 1000)
    .then(_.flatten)

  return contents
}
