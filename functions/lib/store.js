

module.exports.getBandRefs = (db) => {
	return db.collection('events')
		.get()
		.then(snapshot => {
			var artists = {}
			snapshot.forEach(doc => {
				const band = doc.data().band
				artists[band] = (artists[band] || []).concat(doc.id)
			})
			return artists
		})
}

//var FileStoreSync = require('file-store-sync')
//var store = new FileStoreSync('./store-test')

module.exports.saveBandMetadata = (db, band, metadata) => {
	return db.collection('band_metadata')
		.doc(band)
		.set(metadata)
		.then(res => metadata);
}

module.exports.loadBandMetadata = (db, band) => {
	return db.collection('band_metadata')
		.doc(band)
		.get()
		.then(doc => doc.exists ? doc.data() : undefined)

}

