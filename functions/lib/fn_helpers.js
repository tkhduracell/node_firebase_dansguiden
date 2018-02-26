const _ = require('lodash')

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
	return console.log.bind(console.log, name);
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

module.exports = {success, report, debug, json}
