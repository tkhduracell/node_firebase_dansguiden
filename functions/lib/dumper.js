
const dump = module.exports.dump = (db, dir) => (collectionName) => {
	var data = {};
	data[collectionName] = {};

	db.collection(collectionName)
		.get()
		.then(snapshot => {
			snapshot.forEach(doc => {
				data[collectionName][doc.id] = doc.data();
			})
			return data;
		})
		.catch(error => console.error(error))
		.then(dt => {
			if (!fs.existsSync(dir)) fs.mkdirSync(dir)
			const file = dir + "/" + collectionName + "-export.json"
			fs.writeFile(file, JSON.stringify(dt), function (err) {
				if (err) return console.log(err);
				console.log("The file was saved! " + file);
			})
		})
}

