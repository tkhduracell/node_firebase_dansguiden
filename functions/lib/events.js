const moment = require('moment')
const _ = require('lodash')
const scraperjs = require('scraperjs')

const url = 'http://www.danslogen.se'

const months = {
  'januari': 1,
  'februari': 2,
  'mars': 3,
  'april': 4,
  'maj': 5,
  'juni': 6,
  'juli': 7,
  'augusti': 8,
  'september': 9,
  'oktober': 10,
  'november': 11,
  'december': 12
}

module.exports.COLUMNS = ['weekday', 'date', 'time', 'band', 'place', 'city', 'county', 'region']

const COLUMNS = {
  '9': ['weekday', 'date', 'time', 'band',
    'place', 'city', 'county', 'region', 'extra'],
  '10': ['weekday', 'date', 'time', 'crap', 'band',
    'place', 'city', 'county', 'region', 'extra']
}

module.exports.update = (debug) => {
  debug('Running Dansguiden parser... ' + now())

  const result = new Promise((resolve, reject) => {
    scraperjs.StaticScraper
      .create(url + '/dansprogram')
      .scrape(getLinks, data => resolve(data))
      .catch((err) => reject(err))
  })

  return result.then(res => {
    return res.filter(function (obj) {
      return obj.title.startsWith('Visa danser i ')
    })
      .map(function (obj) {
        return {link: obj.link, date: obj.title.replace(/Visa danser i /i, '')}
      })
      .map(function (obj) {
        const split = obj.date.split(/\W+/i)
        return {link: obj.link, month: split[0], year: split[1]}
      })
      .map(function (obj) {
        return {link: obj.link, month: months[obj.month], year: parseInt(obj.year)}
      })
  })
    .then(res => {
      return Promise.all(res.map(loadLink))
    })
    .then(_.flatten)

  function loadLink (obj) {
    debug('Running Dansguiden parse on page ' + obj.year + '-' + obj.month)

    return new Promise((resolve, reject) => {
      scraperjs.StaticScraper
        .create(url + obj.link)
        .scrape(scpr => readPage(scpr, obj.month, obj.year), data => resolve(data))
        .catch(err => reject(err))
    })
  }

  function readPage ($, month, year) {
    return $('tr').get()
      .filter(function (itm) {
        return $(itm).children('td').length === 10 || $(itm).children('td[colspan=9]').first()
      })
      .filter(function (itm) {
        return $(itm).children().get().some(function (itm) {
          return itm.name !== 'th'
        })
      })
      .map(function (itm) {
        function createHeader (itm) {
          return $(itm).text().split(/\W+/i).filter(function (s) {
            return s.trim().length > 0
          })
        }

        function createEvent (itm) {
          return $(itm).children('td').get().map(function (td) {
            return _.trim($(td).text())
          }).filter((val, idx) => !(val.trim().length === 0 && idx === 0))
        }

        const isHeader = (function () {
          const monthsRegex = _.keys(months).join('|')
          const yearRegex = ' ?20\\d\\d'
          const compiled = _.template('(<%= monthsRegex %>)(<%= yearRegex %>)?')
          const regex = new RegExp(compiled({
            yearRegex: yearRegex,
            monthsRegex: monthsRegex
          }), 'i')

          return function (itm) {
            const txt = $(itm).text().trim().replace(/\W+/g, ' ')
            return txt.match(regex)
          }
        }())

        function isEvent (itm) {
          const columns = $(itm).children('td').length
          return columns === 10 || columns === 9
        }

        if (isHeader(itm)) {
          return { type: 'header', data: createHeader(itm), debug: $(itm).html() }
        } else if (isEvent(itm)) {
          return { type: 'event', data: createEvent(itm), debug: $(itm).html() }
        } else {
          return { type: 'unknown', debug: $(itm).html() }
        }
      })
      .map(function (itm) {
        if (itm.type === 'event') {
          const kv = zip(COLUMNS[itm.data.length], itm.data).reduce(function (prev, itm) {
            prev[itm[0]] = itm[1]
            return prev
          }, {})
          return _.merge(itm, { data: kv })
        }
        return itm
      })
      .map(function (itm) {
        if (itm.type === 'event') {
          const dateStr = itm.data.date
          itm.data.date = moment({
            date: parseInt(dateStr),
            month: month - 1,
            year: year
          })

          if (!itm.data.date.isValid()) {
            throw Error('Invalid date: ' + year + '-' + month + '-' + dateStr + ' \n' + itm.data + '\n' + itm.debug)
          }
        }
        return itm
      })
  }

  function getLinks ($) {
    return $('a[title]')
      .map(function (idx, itm) {
        return {link: $(itm).attr('href'), title: $(itm).attr('title')}
      })
      .get()
  }
}

function zip (a, b) {
  return a.map(function (e, i) {
    return [e, b[i]]
  })
}

function now () {
  return moment().toString()
}
