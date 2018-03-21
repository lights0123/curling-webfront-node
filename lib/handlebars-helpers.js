import hbs from "express-hbs";

hbs.registerHelper("concat", function (context, options) { //From https://github.com/duckduckgo/duckduckgo-template-helpers/blob/master/template_helpers.js#L68
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
hbs.registerHelper("encodeURIComponent", function (context) {
	if (!context) {
		return "";
	}
	return new hbs.SafeString(encodeURIComponent(context));
});

/**
 *
 * @param req
 * @param title
 * @returns {{title: *, leftMenu: {"/": {name: string}, "/data": {name: string}, "/contact": {name: string}, "/about": {name: string}}, rightMenu, serviceWorker: boolean, originalYear: number}}
 */
export function formatMenu(req, title) {
	let loggedIn = "user" in req.session;
	let reqURI = req.path;
	let rightMenu = {};
	let leftMenu = {
		'/': {name: 'Home'},
		'/data': {name: 'View Draws'},
		'/contact': {name: 'Contact'},
		'/about': {name: 'About'}
	};
	if (loggedIn) {
		rightMenu['/signout'] = {name: 'Sign Out'};
		rightMenu['/settings'] = {name: 'Settings'};
	} else {
		rightMenu['/login'] = {name: 'Login'};
		rightMenu['/signup'] = {name: 'Sign Up'};
	}
	if (reqURI in leftMenu) {
		if (!leftMenu[reqURI].class) leftMenu[reqURI].class = [];
		leftMenu[reqURI].class.push('active');
	} else if (reqURI in rightMenu) {
		if (!rightMenu[reqURI].class) rightMenu[reqURI].class = [];
		rightMenu[reqURI].class.push('active');
	}
	let originalYear = 2015;
	let templateParameters = {
		title: title,
		leftMenu: leftMenu,
		rightMenu: rightMenu,
		serviceWorker: /* req.secure */ false,
		originalYear: originalYear
	};
	if (new Date().getFullYear() !== originalYear) {
		templateParameters.showSecondYear = true;
		templateParameters.year = new Date().getFullYear();
	}
	return templateParameters;
}