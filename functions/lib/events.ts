import _ from 'lodash'

import { parseYearDate, validateWeekDay, validateDate, fixTime } from './date'
import { LogFn } from './log'
import { DanceEvent } from './types'

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

export function asObject<T>($: cheerio.Root, tr: cheerio.Cheerio, databaseColumns: string[]): T {
  const values = tr.children('td')
    .get()
    .map((elm) => $(elm).text().replace(/\s+/gi, ' ').trim()) // Trim
  const keys = databaseColumns
  const obj = zipAsObj(keys, values)
  return _.omitBy(obj, _.isEmpty) as unknown as T
}

export function asDatabaseColumns($: cheerio.Root, html: cheerio.Cheerio): string[] {
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

function getPages ($: cheerio.CheerioAPI): Page[] {
  return $('a[title]').get()
    .map(itm => {
      return {
        link: $(itm).attr('href') || '',
        title: $(itm).attr('title') || ''
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

export function asEntry($: cheerio.Root, itm: cheerio.TagElement, header: string, cols: string[]): InternalEvent<DanceEvent> {
  return {
    type: 'event',
    debug: {
      raw: $(itm).html() ?? '',
      pretty: ($(itm).html() || '')
        .replace(/\n/g, '')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim(),
      text: $(itm).text()
        .replace(/[\n\t]+/g, ' '),
      url
    },
    data: asObject<DanceEvent>($, $(itm), cols),
    header
  }
}

export function pipeline(list: InternalDanceEvent[]): InternalDanceEvent[] {
  return list
    .map(onEvent<InternalDanceEvent, InternalDanceEvent>(itm => ({ ...itm,
      data: {
        ...itm.data,
        date: parseYearDate(itm.header, itm.data.date).format("YYYY-MM-DD"),
        time: fixTime(itm.data.time),
        extra: itm.data.extra?.replace(/^>$/, '')
      }
    })))
    .map(onEventSideEffect(e => {
      validateDate(e.date)
      validateWeekDay(e.date, e.weekday)
    }))
    .map(onEventMap(e => removeNullValues(e)))
    .map(onEventMap(e => {
      if (e.place?.includes('Viking Rosella') ||
          e.place?.includes('Viking Cinderella') ||
          e.place?.includes('Viking Grace')) {
        return { ...e, region: `${e.region} (Båt)`}
      }
      if (e.place === 'Donnez') {
        console.warn('Invalid place', e)
      }
      if (e.band === '13.30-17.00') {
        console.warn('Invalid band', e)
      }
      return e
    }))
}

export async function parse (debug: LogFn, months?: string[]): Promise<InternalEvent<DanceEvent>[]> {

  function readPage ($: cheerio.CheerioAPI): InternalDanceEvent[] {
    const databaseColumns = asDatabaseColumns($, $('tr.headline').first())
    console.log('DatabaseColumns', databaseColumns)

    const count = $('.danceprogram').siblings('p')
      .first()
      .text()
      .replace(/.*:\s*(\d+)/, '$1') // Antal danser: 109
    const style = $('.danceprogram').siblings('style').text().trim()

    const ghosts = style
      .match(/tr\.r\d+\s*{.*font-size:\s*0.*}/g)
      ?.map(g => g.replace(/tr\.(.*){.*/, '$1').trim())
      .map(clz => `.${clz}`)
      .join(',')

    console.debug({ ghosts, count })
    const dateHeaderElm = $('tr').not('.headline').not("tr[class^='r']").first()
    const header = $(dateHeaderElm).text().replace(/\s+/gi, ' ').trim()

    const rows = $("tr[class^='r']")
      .not(ghosts ?? '.__not_a_ghost__')
      .get() as cheerio.TagElement[]

    if (`${rows.length}` === count) {
      console.log('Processing', rows.length, 'rows', `(page: ${header})`)
    } else {
      console.warn('Processing', rows.length, 'rows, expected: ', count, `(page: ${header})`)
      console.warn('Page style', style)
    }

    return pipeline(rows.map(i => asEntry($, i, header, databaseColumns)))
  }

  function loadPage (page: Page): Promise<InternalDanceEvent[]> {
    console.log('Running Dansguiden parse on page ' + JSON.stringify(page))
    return Scraper.create(url + page.link, readPage)
  }

  console.log('Running Dansguiden parser...')

  const pages = await Scraper.create(url + '/dansprogram', getPages)
  const linkContents = parseAndFilterPages(pages)
    .filter(p => !_.isArray(months) || _.some(months, m => p.title.includes(m.toLocaleLowerCase())))
    .map(loadPage)

  const contents = serialDelayed(linkContents, 1000)
    .then(_.flatten)

  return contents
}
