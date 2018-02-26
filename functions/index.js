// Libraries
const _ = require('lodash');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const pug = require('pug');
const jf = require('jsonfile');
const moment = require('moment');

// Dependencies
const events = require('./lib/events.js');
const versions = require('./lib/versions.js');
const {success, report, debug, json} = require('./lib/fn_helpers');
const artistUpdater = require('./lib/artist_updater');

// App setup
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

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
		.catch(error);

};

const fetchEvents = (params) => {
	const log = debug('fetchEvents(): ');
	var query = db.collection('events');

	// default to today
	query = query
		.where('date', '>=', params.from || moment().format('YYYY-MM-DD'))
		.where('date', '<=', params.to || moment().add(7, 'days').format('YYYY-MM-DD'));

	// apply filters
	events.COLUMNS
		.filter(col => params[col])
		.forEach(col => {
			query = query.where(col, '==', params[col]);
		});

		// order by date_band
		query = query.orderBy("date", "asc");
		// apply limit
		query = query.limit(_.toSafeInteger(params.limit || '100'));

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
					const updateAt = new Date().getTime();
					const eventDoc = _.merge(event, {_id: key, date, updated_at: updateAt});

					log("Adding event " + key);
					const doc = db.collection('events').doc(key);
					batch.set(doc, eventDoc, { merge: true });
				})

			return batch.commit()
				.then((result) => log("Batch#" + idx + " write done!"));
		});

		return Promise.all(writes)
			.then(() => done("Wrote " + _.size(output) + " events"));

	}).catch(error);
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

	}).catch(error);
};

const updateBandMetadata = (log, done, error) => {
	return artistUpdater.update(db)
		.then(done)
		.catch(error)
}

/**
 * Topic function
 */

const hourlyTopic = functions.pubsub.topic('hourly-tick')

exports.updateVersionTopic = hourlyTopic.onPublish((event, callback) => {
	const log = debug('hourlyTopic => updateVersionData(): ');
	const error = report();
	const done = success(log);

	return updateVersions(log, done, error);
})

exports.updateEventTopic = hourlyTopic.onPublish((event, callback) => {
	const log = debug('hourlyTopic => updateEventData(): ');
	const error = report();
	const done = success(log);

	return updateEvents(log, done, error);
})

exports.updateBandMetadataTopic = hourlyTopic.onPublish((event, callback) => {
	const log = debug('hourlyTopic => updateBandMetadata(): ');
	const error = report();
	const done = success(log);

	return updateBandMetadata(log, done, error);
})

/**
 * Web functions
 */

exports.updateVersions = functions.https.onRequest((req, res) => {
	const log = debug('onRequest => updateVersions(): ');
	const error = report(res);
	const done = success(log, res);

	updateVersions(log, done, error);
})

exports.updateEvents = functions.https.onRequest((req, res) => {
	const log = debug('onRequest => updateEvents(): ');
	const error = report(res);
	const done = success(log, res);

	updateEvents(log, done, error);
})

exports.updateBandMetadata = functions.https.onRequest((req, res) => {
	const log = debug('onRequest => updateBandMetadata(): ');
	const error = report(res);
	const done = success(log, res);

	updateBandMetadata(log, done, error);
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
