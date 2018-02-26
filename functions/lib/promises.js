const delayed = (value, duration) => {
	return function() {
		return new Promise(function(resolve, reject) {
			setTimeout(() => resolve(value), duration)
		});
	};
}

const serial = (funcs) => {
	return funcs.reduce((promise, func) => {
		return promise.then(result => func().then(Array.prototype.concat.bind(result)))
	}, Promise.resolve([]))
}

module.exports = {delayed, serial}
