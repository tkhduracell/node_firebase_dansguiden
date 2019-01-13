const scraperjs = require('scraperjs')

module.exports.getLatest = (log) => {
  const url = 'https://play.google.com/store/apps/details?id=feality.dans'

  const extractContent = ($) => {
    log('PLAYSTORE VERSION', $("div:contains('What's New') > h2").parent().text())

    return {
      lines: $("div:contains('What's New') > h2").parent()
        .parent()
        .find('content')
        .map(() => {
          log('PLAYSTORE VERSION', $(this).text())
          return $(this).text().replace(/^\W*\*\W*/, '')
        })
        .get()
        .filter(s => s !== 'Read more'),
      name: $("div:contains('Current Version') + span")
        .map(() => $(this).text().trim())
        .get()
        .join(', '),
      date: $("div:contains('Updated') + span")
        .map(() => $(this).text().trim())
        .get()
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
