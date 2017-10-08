const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pug = require('pug');
const jf = require('jsonfile');
const scraperjs = require('scraperjs');
const debug = require('debug')
const _ = require('lodash/string');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

exports.index = functions.https.onRequest((request, response) => {
	const getVersions = db.collection('versions').get();
	const getImages = db.collection('images').get();
	
	Promise.all([getVersions, getImages])
		.then((resolved) => {
			const [versions, images] = resolved;
			
			const opts = {
				compileDebug: true,
				images: data(images),
				versions: data(versions)
			};
			
			const html = pug.renderFile('views/index.pug', opts);
			
			response.status(200).send(html);
		})
		.catch((err) => {
			console.error(err);
			response.status(500).send(err.message);
		});
	
});

exports.updateVersions = functions.https.onRequest((req, res) => {
	const log = debug('app:versions');
	
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

	const saveToDb = (data) => {
		const key = _.snakeCase("v " + data.name);
		
		log('Updating ' + key);
		db.collection('versions').doc(key).set({
			name: data.name,
			lines: data.lines
		}, { merge: true });
	}

	log('Running Google Play parse');
	scraperjs.StaticScraper
		.create(url)
		.scrape(extractContent, saveToDb);

	res.status(200).send('OK');
});

function data(elms) {
	var arr = [];
	elms.forEach(function(element) {
		arr.push(element.data());
	});
	return arr;
}