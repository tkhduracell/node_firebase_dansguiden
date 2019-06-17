const scraperjs = require('scraperjs')
const flatMap = require('lodash.flatmap')

module.exports.versionSort = (v) => {
  return v.name.split('.', 3)
    .map(s => s.padStart(4, '0'))
    .join('')
}

const extractContent = module.exports.extractContent = $ => {
  const content = $("div:contains('What's New') > h2")
    .parent()
    .parent()
    .find("div[itemprop='description']")
    .get()
    .map(block => $(block).text())
  const lines = flatMap(content, l => l.split(/\W*\*\W*/gi))
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
  const html = $('html').html()

  return { lines, name, date, html }
}

module.exports.fetchLatestVersion = (log) => {
  const url = 'https://play.google.com/store/apps/details?id=feality.dans'

  log('Running Google Play parser...')
  return new Promise((resolve, reject) => {
    scraperjs.StaticScraper
      .create(url)
      .scrape(extractContent, data => resolve(data))
      .catch(err => reject(err))
  })
}
