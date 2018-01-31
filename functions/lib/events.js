const moment = require('moment');
const _ = require('lodash');
const scraperjs = require('scraperjs');

const url = 'http://www.danslogen.se';

const months = {
	"januari": 1,
	"februari": 2,
	"mars": 3,
	"april": 4,
	"maj": 5,
	"juni": 6,
	"juli": 7,
	"augusti": 8,
	"september": 9,
	"oktober": 10,
	"november": 11,
	"december": 12
};
const columns = ['weekday', 'date', 'time', 'band', 'place', 'city', 'region', 'country'];

const NOT_SET_BAND = 'Ej fastställt';

module.exports.update = (debug) => {
	debug('Running Dansguiden parser... ' + now() );

	const result = new Promise((resolve, reject) => {
		const output = scraperjs.StaticScraper
			.create(url + '/dansprogram')
			.scrape(getLinks, data => resolve(data))
			.catch((err) => reject(err))
	})

	const updates = result.then(res => {
			return res.filter(function (obj) {
					return obj.title.startsWith("Visa danser i ");
				})
				.map(function (obj) {
					return {link: obj.link, date: obj.title.replace(/Visa danser i /i, '')};
				})
				.map(function (obj) {
					const split = obj.date.split(/\W+/i);
					return {link: obj.link, month: split[0], year: split[1]};
				})
				.map(function (obj) {
					return {link: obj.link, month: months[obj.month], year: parseInt(obj.year)};
				})
		})
		.then(res => {
			return Promise.all(res.map(loadLink))
		})

	return updates.then(_.flatten)

	function loadLink(obj) {

		debug('Running Dansguiden parse on page ' + obj.year + "-" + obj.month );

		return new Promise((resolve, reject) => {
			const re = scraperjs.StaticScraper
			.create(url + obj.link)
			.scrape($ => readPage($, obj.month, obj.year), data => resolve(data))
			.catch(err => reject(err))
		});
	}

	function readPage($, month, year) {
		return $("tr")
			.get()
			.filter(function (itm) {
				return $(itm).children("td").length === 9 ||
					$(itm).children("td[colspan=9]").first()
				;
			})
			.filter(function (itm) {
				return $(itm).children().get().some(function (itm) {
					return itm.name !== "th";
				});
			})
			.map(function (itm) {
				if ($(itm).children("td").first().attr("colspan") === "9") {
					const arr = $(itm).text().split(/\W+/i).filter(function (s) {
						return s.trim().length > 0;
					});
					return {type: 'header', date: arr};
				} else if ($(itm).children("td").length === 9) {
					const arr = $(itm).children("td").get().map(function (td) {
						return $(td).text();
					});
					return {type: 'event', data: arr};
				} else {
					return {type: 'unknown', data: $(itm).html()};
				}
			})
			.map(function (itm) {
				if (itm.type === 'event') {
					const kv = zip(columns, itm.data).reduce(function (prev, itm) {
						prev[itm[0]] = itm[1];
						return prev;
					}, {});
					return {type: itm.type, data: kv};
				}
				return itm;
			})
			.map(function (itm) {
				if (itm.type === 'event') {
					itm.data.date = moment({
						date: parseInt(itm.data.date),
						month: month - 1,
						year: year
					});
				}
				return itm;
			});
	}

	function getLinks($) {
		return $("a[title]")
			.map(function (idx, itm) {
				return {link: $(itm).attr("href"), title: $(itm).attr('title')};
			})
			.get()
	}

}

function zip(a, b) {
	return a.map(function (e, i) {
		return [e, b[i]];
	});
}

function now() {
	return moment().toString();
}
