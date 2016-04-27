/* Note: this mostly comes from https://github.com/chrisjaure/travisci-webhook-handler
 * modified to support express */
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var statusMessages = {
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
	var methods = 'addListener,on,once,removeListener,removeAllListeners,setMaxListeners,listeners,emit';
	methods.split(',').forEach(function (fn) {
		obj[fn] = emitter[fn].bind(emitter);
	});
}

function signRequest(repoSlug, userToken) {
	return crypto.createHash('sha256').update(repoSlug + userToken).digest('hex');
}

function create(token) {

	var handler = function (req, res, next) {
		function hasError(msg) {
			var err = new Error(msg);
			next(err);
		}

		if (token) {
			var repoSlug = req.headers['travis-repo-slug'];
			var sig = req.headers['authorization'];
			if (!sig) {
				return hasError('No authorization found on request');
			}
			if (!repoSlug) {
				return hasError('No repo found on request');
			}
			if (sig !== signRequest(repoSlug, token)) {
				return hasError('Authentication does not match');
			}
		}

		var result;
		try {
			result = JSON.parse(req.body.payload);
		} catch (err) {
			return hasError(err.message);
		}
		var status = null;
		Object.keys(statusMessages).some(key=> {
			var value = statusMessages[key];
			if (value.indexOf(result.status_message) !== -1) {
				status = key;
				return true;
			}
			else return false;
		});
		if (status === null) return hasError('An invalid status message was sent.');
		res.json({ok: true});

		handler.emit('*', result);
		handler.emit(status, result);
	};
	handler.emitter = new EventEmitter();
	bindEmitter(handler, handler.emitter);
	return handler;
}

module.exports = create;