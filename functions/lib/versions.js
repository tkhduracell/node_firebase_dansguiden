const scraperjs = require('scraperjs')

module.exports.getLatest = (log) => {
  const url = 'https://play.google.com/store/apps/details?id=feality.dans'

  const extractContent = ($) => {
    return {
      lines: $("div:contains('What's New') > h2").parent()
        .parent()
        .find('content')
        .map(function () {
          return $(this).text()
            .replace(/^\W*\*\W*/, '')
        })
        .get()
        .filter(s => s !== 'Read more'),
      name: $("div:contains('Current Version') + span")
        .map(function () {
          return $(this).text()
            .trim()
        })
        .get()
        .join(', '),
      date: $("div:contains('Updated') + span")
        .map(function () {
          return $(this).text()
            .trim()
        })
        .get()
        .join(', ')
    }
  }

  log('Running Google Play parser...')
  return new Promise((resolve, reject) => {
    scraperjs.StaticScraper
      .create(url)
      .scrape(extractContent, data => {
        debugger
        return resolve(data)
      })
      .catch(err => reject(err))
  })
}
