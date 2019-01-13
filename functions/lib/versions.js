const scraperjs = require('scraperjs')

module.exports.getLatest = (log) => {
  const url = 'https://play.google.com/store/apps/details?id=feality.dans'

  const extractContent = ($) => {
    return {
      lines: $("div:contains('What's New') > h2")
        .parent()
        .parent()
        .find('content')
        .get()
        .map(itm => $(itm).text()
          .replace(/^\W*\*\W*/, '')
        )
        .filter(s => s !== 'Read more'),
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

  log('Running Google Play parser...')
  return new Promise((resolve, reject) => {
    scraperjs.StaticScraper
      .create(url)
      .scrape(extractContent, data => resolve(data))
      .catch(err => reject(err))
  })
}
