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

const fetchIndex = (req, res) => {
	const getVersions = db.collection('versions').get();
	const getImages = db.collection('images').get();

	Promise.all([getVersions, getImages])
		.then((resolved) => {
			const [versions, images] = resolved;

			const opts = {
				compileDebug: false,
				images: json(images),
				versions: json(versions)
			};

			const html = pug.renderFile('views/index.pug', opts);
			res.status(200).send(html);
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send(err.messsage);
		});

};

const fetchEvents = (params) => {
	const log = debug('app:events:get');
	var query = db.collection('events');
	log(JSON.stringify(params));

	if (params.from && params.to) {
		query = query.where('date', '>=', params.from)
			.where('date', '<=', params.to);
	}

	const columns = ['weekday', 'date', 'time', 'band', 'place', 'city',
	'region', 'country'];

	columns.filter(col => params[col])
		.forEach(col => {
			query = query.where(col, '==', params[col]);
		});

	return query.get()
};

const updateEvents = () => {
	const log = debug('app:events');

	const updater = events.update(log);

	const batch = db.batch();

	updater.then((output) => {
		output.filter(event => event.type === 'event')
			.map(event => event.data)
			.forEach(event => {
				const date = event.date.format('YYYY-MM-DD');
				const key = _([date, event.band]).map(_.snakeCase).join('_');
				const eventDoc = _.merge(event, {date, _id: key});

				log("Updating " + key);
				const doc = db.collection('events').doc(key);
				batch.set(doc, eventDoc, { merge: true });
			})
	}).catch(err => console.error(err));

	return batch.commit()
		.then(() => {
			log("Batch write done!");
		})
		.catch((err) => {
			console.error(err);
		});
}

const fetchVersions = (params) => {
	const log = debug('app:versions:get');
	var query = db.collection('versions');
	return query.get()
};

const updateVersions = () => {
	const log = debug('app:versions');

	const updater = versions.update(log);
	const batch = db.batch();

	updater((data) => {
		const key = _.snakeCase("v " + data.name);

		log('Updating ' + key);
		const doc = db.collection('versions').doc(key)
		batch.set(doc, {
			name: data.name,
			lines: data.lines
		}, { merge: true });
	});

	return batch.commit()
		.then(() => {
			log("Batch write done!");
		})
		.catch((err) => {
			console.error(err);
		});
}

function json(elms, with_key) {
	var arr = [];
	elms.forEach(function(element) {
		const obj = with_key ? {_id: element.id} : {}
		arr.push(_.merge(element.data(), obj))
	});
	return arr;
}

const hourlyTopic = functions.pubsub.topic('hourly-tick')

exports.updateVersionData = hourlyTopic.onPublish(updateVersions)
exports.updateVersions = functions.https.onRequest(updateVersions)

exports.updateEventData = hourlyTopic.onPublish(updateEvents)
exports.updateEvents = functions.https.onRequest(updateEvents)

exports.getVersions  = functions.https.onRequest((req, res) => {
	fetchVersion(req.query)
		.then(versions => res.status(200).send(json(versions)))
		.catch(err => res.status(500).send("Error occurred: " + err))
})
exports.getEvents = functions.https.onRequest((req, res) => {
	fetchEvents(req.query)
		.then(events => res.status(200).send(json(events, true)))
		.catch(err => res.status(500).send("Error occurred: " + err))
})

exports.index = functions.https.onRequest(fetchIndex)

