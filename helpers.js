const Handlebars = require('handlebars');
const fs = require('fs');

Handlebars.registerHelper("concat", function (context, options) { //From https://github.com/duckduckgo/duckduckgo-template-helpers/blob/master/template_helpers.js#L68
	if (!context) {
		return "";
	}
	let sep = options.hash.sep || '',
		conj = options.hash.conj || '',
		len = context.length,
		out = "";
	if (len === 1) {
		return context[0];
	}
	if (len === 2) {
		return context[0] + conj + context[1];
	}
	if (len === 3) {
		return context[0] + sep + " " + context[1] + conj + context[2];
	}
	for (let i = 0; i < len; i++) {
		if (i === len - 1) {
			out += sep + conj;
		} else if (i > 0) {
			out += sep + " "
		}
		out += context[i];
	}
	return out;
});
Handlebars.registerHelper("encodeURIComponent", function (context) {
	if (!context) {
		return "";
	}
	return new Handlebars.SafeString(encodeURIComponent(context));
});
Object.filter = function (obj, ignore, invert) {
	if (ignore === undefined) {
		return obj;
	}
	invert = invert || false;
	let not = function (condition, yes) {
		return yes ? !condition : condition;
	};
	let isArray = Handlebars.Utils.isArray(ignore);
	for (let key in obj) {
		if (obj.hasOwnProperty(key) &&
			(isArray && not(ignore.indexOf(key) === -1, invert)) ||
			(!isArray && not(!ignore.call(undefined, key, obj[key]), invert))) {
			delete obj[key];
		}
	}
	return obj;
};


let compiledTemplates = {};
let getTemplate = exports.getTemplate = path => {
	if (Object.keys(compiledTemplates).indexOf(path) !== -1) {
		return compiledTemplates[path];
	} else {
		let contents = fs.readFileSync(path);
		fs.watch(path, event => {
			if (event === "change") {
				let contents = fs.readFileSync(path);
				compiledTemplates[path] = Handlebars.compile(contents.toString('utf-8'));
			}
		});
		let template = Handlebars.compile(contents.toString('utf-8'));
		compiledTemplates[path] = template;
		return template;
	}
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
let doError = exports.doError = (error, req, res) => {
	res
		.status(error)
		.set({'content-type': 'text/html; charset=UTF-8'})
		.end(formatPage(req, req.path, "Error", getTemplate("content/error.handlebars")({
			code: errCodes[error][0],
			message: errCodes[error][1]
		})));
};


let formatPage = exports.formatPage = (req, reqURI, title, content) => {
	if (!req.content) {
		let loggedIn = "user" in req.session;
		let headerTemplate = getTemplate("content/page.handlebars");
		let menu = {
			'/': ['Home', []],
			'/data': ['View Draws', []],
			'/contact': ['Contact', []],
			'/about': ['About', []]
		};
		if (loggedIn) {
			menu['/signout'] = ['Sign Out', ['right']];
			menu['/settings'] = ['Settings', ['right']];
		} else {
			menu['/login'] = ['Login', ['right']];
			menu['/signup'] = ['Sign Up', ['right']];
		}
		if (Object.keys(menu).indexOf(reqURI) !== -1) {
			menu[reqURI][1].push('active');
		}
		let originalYear = 2015;
		let templateParameters = {
			title: title,
			menu: menu,
			content: content,
			serviceWorker: req.secure,
			originalYear: originalYear
		};
		if (new Date().getFullYear() !== originalYear) {
			templateParameters.showSecondYear = true;
			templateParameters.year = new Date().getFullYear();
		}
		return headerTemplate(templateParameters);
	} else {
		return title + "\n" + content;
	}
};


exports.redirect = (req, res, dest) => {
	if (req.content) res.end(dest);
	else res.redirect(dest);
};

exports.methodNA = router => {
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
};