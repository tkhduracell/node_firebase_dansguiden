const functions = require('firebase-functions');
const pug = require('pug');
const jf = require('jsonfile');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

var db = admin.firestore();

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

function data(elms) {
	var arr = [];
	elms.forEach(function(element) {
		arr.push(element.data());
	});
	return arr;
}