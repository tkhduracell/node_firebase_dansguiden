const moment = require('moment')
const _ = require('lodash')
const scraperjs = require('scraperjs')

const { parseYearDate, validateWeekDay, validateDate } = require('./date')

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
}

module.exports.COLUMNS = _.values(COLUMN_MAP)

function scrape (url, extract) {
  return new Promise((resolve, reject) => {
    scraperjs.StaticScraper
      .create(url)
      .scrape(extract, data => resolve(data))
      .catch((err) => reject(err))
  })
}

module.exports.parse = (debug) => {
  debug('Running Dansguiden parser...')

  const result = scrape(url + '/dansprogram', getLinks)

  return result.then(parseAndFilterLinks)
    .then(res => Promise.all(res.map(loadLink)))
    .then(_.flatten)

  function loadLink (obj) {
    debug('Running Dansguiden parse on page ' + JSON.stringify(obj))

    return scrape(url + obj.link, scpr => {
      return readPage(scpr, url + obj.link)
    })
  }

  function readPage ($, url) {
    const tableHeader = $('tr.headline').first()
    const columnsElm = tableHeader.children('th').get()

    const columns = _.flatMap(columnsElm, itm => {
      const colspan = parseInt($(itm).attr('colspan') || '1')
      const txt = $(itm).text().trim()
      if (colspan === 1) {
        return [txt]
      } else {
        const range = Array(colspan).fill().map((v, i) => i)
        return range.map(i => txt + '-' + i)
      }
    })

    const databaseColumns = columns.map(itm => COLUMN_MAP[itm])

    const dateHeaderElm = $('tr').not('.headline').not('.odd').not('.even').first()
    const trimElement = (elm) => $(elm).text().replace(/\s+/gi, ' ').trim()
    const header = trimElement(dateHeaderElm)

    function data (tr) {
      const values = $(tr).children('td')
        .get()
        .map(trimElement)
      const keys = databaseColumns
      const obj = zipAsObj(keys, values)
      return _.omitBy(obj, _.isEmpty)
    }

    const rows = $('tr.odd, tr.event').get()
    debug(`Processing ${rows.length} rows... (page: ${header})`)

    return rows.map(itm => {
      return {
        type: 'event',
        debug: {
          raw: $(itm).html(),
          pretty: $(itm).html()
            .replace(/\n/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
          url
        },
        data: data(itm),
        header
      }
    })
      .map(onEvent(itm => Object.assign({}, itm, {
        data: Object.assign({}, itm.data, {
          date: parseYearDate(itm.header, itm.data.date)
        })
      })))
      .map(onEvent(itm => {
        validateDate(itm.data.date, debug)
        validateWeekDay(itm.data.date, itm.data.weekday, itm, debug)
        return itm
      }))
  }

  function getLinks ($) {
    return $('a[title]')
      .map(function (idx, itm) {
        return {
          link: $(itm).attr('href'),
          title: $(itm).attr('title')
        }
      })
      .get()
  }

  function parseAndFilterLinks (res) {
    return res.filter((obj) => obj.title.startsWith('Visa danser i '))
      .map((obj) => ({
        link: obj.link
      }))
  }
}

const onEvent = (fn) => onRowType('event', fn)

function onRowType (type, fn) {
  return (itm) => {
    if (!!itm && itm.type === type) {
      return fn(itm)
    }
    return itm
  }
}

function zip (a, b) {
  return a.map(function (e, i) {
    return [e, b[i]]
  })
}

function zipAsObj (keys, values) {
  const zipped = zip(keys, values)
  return zipped.reduce((prev, itm) => {
    prev[itm[0]] = itm[1]
    return prev
  }, {})
}
