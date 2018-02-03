const scraperjs = require('scraperjs');

module.exports.update = (log) => {
    const url = 'https://play.google.com/store/apps/details?id=feality.dans';

	const extractContent = ($) => {
		return {
			lines: $(".whatsnew .recent-change")
				.map(function () {
					return $(this).text()
						.replace(/^\W*\*\W*/, '');
				})
				.get(),
			name: $("div[itemProp='softwareVersion']")
				.map(function () {
					return $(this).text()
						.trim();
				})
				.get()
				.join(", "),
			date: $("div[itemProp='datePublished']")
				.map(function () {
					return $(this).text()
						.trim();
				})
				.get()
				.join(", ")
		}
	}

	log('Running Google Play parser...');
	return new Promise((resolve, reject) => {
		scraperjs.StaticScraper
			.create(url)
			.scrape(extractContent, data => resolve(data))
			.catch(err => reject(err));
	})
}
