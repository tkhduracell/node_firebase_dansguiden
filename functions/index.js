const _ = require('lodash');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pug = require('pug');
const jf = require('jsonfile');
const debug = require('debug');
const events = require('./lib/events.js');
const versions = require('./lib/versions.js');

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

exports.updateEvents = functions.https.onRequest((req, res) => {
	const log = debug('app:events');

	const updater = events.update(log);
	
	const batch = db.batch();

	updater((event) => {
		const date = event.date.format('YYYY-MM-DD');
		const key = _([date, event.band]).map(_.snakeCase).join('_');
		const eventDoc = _.merge(event, {date});
		
		log("Updating " + key);
		const doc = db.collection('events').doc(key);
		batch.set(doc, eventDoc, { merge: true });
	});

	return batch.commit()
		.then(function () {
			log("Batch write done!");
			res.status(200).send("OK");	
		});
});

exports.getEvents = functions.https.onRequest((req, res) => {
	const log = debug('app:events:get');
	var query = db.collection('events');
	const params = req.query;
	log(JSON.stringify(params));

	if (params.from && params.to) {
		query = query.where('date', '>=', params.from)
			.where('date', '<=', params.to);
	}
	
	[
		'weekday', 
		'date', 
		'time', 
		'band', 
		'place', 
		'city', 
		'region', 
		'country'
	]
	.filter(col => params[col])
	.forEach(col => {
		query = query.where(col, '==', params[col]);
	});

	query.get()
		.then(events => {
			res.status(200).send(data(events));
		})
		.catch(err => {
			log('Error getting documents', err);
			res.status(500).send("Error occured, check logs...");
		});
});

exports.updateVersions = functions.https.onRequest((req, res) => {
	const log = debug('app:versions');

	const updater = versions.update(log);
	
	updater((data) => {
		const key = _.snakeCase("v " + data.name);
		
		log('Updating ' + key);
		db.collection('versions').doc(key).set({
			name: data.name,
			lines: data.lines
		}, { merge: true });
	});

	res.status(200).send('OK');
});

function data(elms) {
	var arr = [];
	elms.forEach(function(element) {
		arr.push(element.data());
	});
	return arr;
}