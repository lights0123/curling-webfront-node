import hbs from "express-hbs";
import 'handlebars-helpers';
import fs from "fs";
import {extname, normalize} from 'path';
import mime from "mime";

const isProduction = process.env.NODE_ENV === "production";


Object.filter = function (obj, ignore, invert) {
	if (ignore === undefined) {
		return obj;
	}
	invert = invert || false;
	let not = function (condition, yes) {
		return yes ? !condition : condition;
	};
	let isArray = Array.isArray(ignore);
	for (let key in obj) {
		if (obj.hasOwnProperty(key) &&
			(isArray && not(ignore.indexOf(key) === -1, invert)) ||
			(!isArray && not(!ignore.call(undefined, key, obj[key]), invert))) {
			delete obj[key];
		}
	}
	return obj;
};

let errCodes = {
	200: ['404 Not Found', 'Uh oh! Your page was not found.'],
	403: ['403 Forbidden', 'For some reason, you are forbidden to view this content.'],
	404: ['404 Not Found', 'Uh oh! Your page was not found.'],
	405: ['405 Method Not Allowed', 'The method specified in the Request-Line is not allowed for the specified resource.'],
	408: ['408 Request Timeout', 'Your browser failed to sent a request in the time allowed by the server.'],
	500: ['500 Internal Server Error', 'The request was unsuccessful due to an unexpected condition encountered by the server.'],
	502: ['502 Bad Gateway', 'The server received an invalid response from the upstream server while trying to fulfill the request.'],
	504: ['504 Gateway Timeout', 'The upstream server failed to send a request in the time allowed by the server.'],
	0: ['Unknown Error', 'An unknown error occurred.']
};

export function doError(error, req, res) {
	res
		.status(error)
		.set({'content-type': 'text/html; charset=UTF-8'})
		.render(formatPage(req, req.path, "Error", getTemplate("content/error.handlebars")({
			code: errCodes[error][0],
			message: errCodes[error][1]
		})));
}

export function redirect(req, res, dest) {
	if (req.content) res.end(dest);
	else res.redirect(dest);
}

export function methodNA(router) {
	let routes = [];
	router.stack.forEach(obj => {
		let methodsObj = obj.route ? obj.route.methods : {};
		let methods = [];
		Object.keys(methodsObj).forEach(key => {
			let value = methodsObj[key];
			if (value) methods.push(key);
		});
		routes.push({regexp: obj.regexp, methods: methods});
	});
	router.use((req, res, next) => {
		try {
			let match = false;
			routes.forEach(obj => {
				if (obj.regexp.test(req._parsedUrl.pathname)) {
					match = true;
					let methodMatch = false;
					if (obj.methods.indexOf("_all") !== -1
						|| obj.methods.indexOf(req.method.toLowerCase()) !== -1)
						throw next();
				}
			});
			if (!match) return next();
		} catch (e) {
			return;
		}
		doError(405, req, res);
	});
}

/**
 * Sends a file using HTTP2 push
 *
 * @param res            The res object passed by Express
 * @param staticPath    The file to send
 */
export function push(res, staticPath) {
	if (res.push) {
		res.push(normalize("/" + staticPath), {
			request: {'accept': '*/*'},
			response: {'content-type': mime.getType(extname(staticPath))}
		}, (err, stream) => {
			stream.on('error', err => {
				if (!isProduction) console.log(err);
			});
			fs.readFile(normalize("../dist-web/" + staticPath), (err, data) => {
				if (err) {
					fs.readFile(normalize("../public/" + staticPath), (err, data) => {
						if (err) stream.end();
						else stream.end(data);
					});
				} else stream.end(data);
			});
		});
	}
}