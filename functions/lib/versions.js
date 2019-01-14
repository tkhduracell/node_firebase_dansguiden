const scraperjs = require('scraperjs')

module.exports.versionSort = (v) => {
  return v.name.split('.', 3)
    .map(s => s.padStart(4, '0'))
    .join('')
}

const extractContent = module.exports.extractContent = $ => {
  return {
    lines: $("div:contains('What's New') > h2")
      .parent()
      .parent()
      .find('content')
      .get()
      .map(block => block.children.map(node => {
        return $(node).text()
          .replace(/^\W*\*\W*/, '')
          .trim()
      }))
      .map(items => items.filter(s => s !== ''))
      .filter(s => s.indexOf('Read more') === -1)
      .filter(s => s.indexOf('Collapse') === -1)
      .pop(),
    name: $("div:contains('Current Version') + span")
      .get()
      .map(itm => $(itm).text().trim())
      .join(', '),
    date: $("div:contains('Updated') + span")
      .get()
      .map(itm => $(itm).text().trim())
      .join(', ')
  }
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
