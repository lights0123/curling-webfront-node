/* Note: this mostly comes from https://github.com/chrisjaure/travisci-webhook-handler
 * modified to support express */
let EventEmitter = require('events').EventEmitter;
let NodeRSA = require('node-rsa');
let statusMessages = {
	success: [
		'Passed',
		'Fixed'
	],
	failure: [
		'Broken',
		'Failed',
		'Still Failing'
	],
	start: [
		'Pending'
	]
};

function bindEmitter(obj, emitter) {
	let methods = 'addListener,on,once,removeListener,removeAllListeners,setMaxListeners,listeners,emit';
	methods.split(',').forEach(function (fn) {
		obj[fn] = emitter[fn].bind(emitter);
	});
}

function create(publicKey) {

	let handler = function (req, res, next) {
		console.log(req.body.payload);
		console.log(req.headers);
		let repoSlug = req.headers['travis-repo-slug'];

		let sig = req.headers['signature'];
		if (!sig) {
			console.log('No Signature found on request');
			return hasError('No Signature found on request');
		}
		if (!repoSlug) {
			console.log('No repo found on request');
			return hasError('No repo found on request');
		}
		console.log(publicKey);

		function hasError(msg) {
			let err = new Error(msg);
			next(err);
		}

		//if(publicKey) {
		let key = new NodeRSA(publicKey, {signingScheme: 'sha1'});
		if (!key.verify(JSON.parse(req.body.payload), sig, 'base64', 'base64')) {
			console.log('Signed payload does not match signature');
			return hasError('Signed payload does not match signature');
		}
		//}

		let result;
		try {
			result = JSON.parse(req.body.payload);
		} catch (err) {
			return hasError(err.message);
		}
		let status = null;
		Object.keys(statusMessages).some(key => {
			let value = statusMessages[key];
			if (value.indexOf(result.status_message) !== -1) {
				status = key;
				return true;
			}
			else return false;
		});
		if (status === null) return console.log('An invalid status message was sent.'), hasError('An invalid status message was sent.');
		res.json({ok: true});

		handler.emit('*', result);
		handler.emit(status, result);
	};
	handler.emitter = new EventEmitter();
	bindEmitter(handler, handler.emitter);
	return handler;
}

module.exports = create;