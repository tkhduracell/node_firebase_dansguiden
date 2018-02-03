const _ = require('lodash');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pug = require('pug');
const jf = require('jsonfile');
const events = require('./lib/events.js');
const versions = require('./lib/versions.js');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();


/**
 * Helper functions
 */
const json = (elms, with_key) => {
	var arr = [];
	elms.forEach(function(element) {
		const obj = with_key ? {_id: element.id} : {}
		arr.push(_.merge(element.data(), obj))
	});
	return arr;
}

const debug = (name) => {
	return console.log.bind(null, name);
}

const report = (res) => {
	return (err) => {
		if (res && !res.headersSent) {
			res.status(500).send(err.toString());
		} else {
			console.error(err);
		}
	}
}

const success = (log, res) => {
	return (output) => {
		if (res && !res.headersSent) {
			res.status(200).send(output);
		} else {
			log("Success! => " + output);
		}
	}
}

/**
 * Cloud functions
 */

const fetchIndex = (log, done, error) => {

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

			done(pug.renderFile('views/index.pug', opts));
		})
		.catch(err => error(err));

};

const fetchEvents = (params) => {
	const log = debug('fetchEvents(): ');
	var query = db.collection('events');

	if (params.from) {
		query = query.where('date', '>=', params.from);
	}

	if (params.to) {
		query = query.where('date', '<=', params.to);
	}

	['weekday', 'date', 'time', 'band', 'place', 'city', 'region', 'country']
		.filter(col => params[col])
		.forEach(col => {
			query = query.where(col, '==', params[col]);
		});

	return query.get()
};

const updateEvents = (log, done, error) => {
	return events.update(log).then((output) => {

		const writes = _.chunk(output, 500).map((chunk, idx) => {

			log("Batch#" + idx + " creating...");
			const batch = db.batch();

			chunk.filter(event => event.type === 'event')
				.map(event => event.data)
				.forEach(event => {
					const date = event.date.format('YYYY-MM-DD');
					const key = _([date, event.band]).map(_.snakeCase).join('_');
					const eventDoc = _.merge(event, {date, _id: key});

					log("Adding event " + key);
					const doc = db.collection('events').doc(key);
					batch.set(doc, eventDoc, { merge: true });
				})

			return batch.commit()
				.then((result) => log("Batch#" + idx + " write done!"));
		});

		return Promise.all(writes)
			.then(() => done("Wrote " + _.size(output) + " events"));

	}).catch(err => error(err));
};

const fetchVersions = (params) => {
	const log = debug('fetchVersions(): ');
	var query = db.collection('versions');
	return query.get()
};

const updateVersions = (log, done, error) => {

	return versions.update(log).then((data) => {

		const batch = db.batch();
		const key = _.snakeCase("v " + data.name);

		log('Updating version' + key);
		const doc = db.collection('versions').doc(key)
		batch.set(doc, {
			name: data.name,
			lines: data.lines
		}, { merge: true });

		return batch.commit()
			.then(() => done("Batch write done!"))
			.catch(err => error(err));

	}).catch(err => error(err));
};

const hourlyTopic = functions.pubsub.topic('hourly-tick')

exports.updateVersionData = hourlyTopic.onPublish((event, callback) => {
	const log = debug('hourlyTopic => updateVersionData(): ');
	const error = report();
	const done = success(log);

	return updateVersions(log, done, error);
})
exports.updateEventData = hourlyTopic.onPublish((event, callback) => {
	const log = debug('hourlyTopic => updateEventData(): ');
	const error = report();
	const done = success(log);

	return updateEvents(log, done, error);
})

exports.updateVersions = functions.https.onRequest((req, res) => {
	const log = debug('updateVersions(): ');
	const error = report(res);
	const done = success(log, res);

	updateVersions(log, done, error);
})

exports.updateEvents = functions.https.onRequest((req, res) => {
	const log = debug('updateEvents(): ');
	const error = report(res);
	const done = success(log, res);

	updateEvents(log, done, error);
})

exports.getVersions  = functions.https.onRequest((req, res) => {
	fetchVersions(req.query)
		.then(versions => res.status(200).send(json(versions)))
		.catch(err => res.status(500).send("Error occurred: " + err))
})
exports.getEvents = functions.https.onRequest((req, res) => {
	fetchEvents(req.query)
		.then(events => res.status(200).send(json(events, true)))
		.catch(err => res.status(500).send("Error occurred: " + err))
})

exports.index = functions.https.onRequest((req, res) => {
	const log = debug('fetchIndex(): ');
	const error = report(res);
	const done = success(log, res);
	fetchIndex(log, done, error);
})

