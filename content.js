const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');
const async = require('async');
const helpers = require('./helpers');
const getTemplate = helpers.getTemplate;
const doError = helpers.doError;
const formatPage = helpers.formatPage;
module.exports = (req, res, next) => {
	var reqURI = req.path;
	async.waterfall([
		callback=> {
			callback(get(reqURI, req, res) ? true : null);
		},
		callback=> {
			callback(get(path.normalize(reqURI + "/index"), req, res) ? true : null);
		}
	], err=> err || next());
	function get(reqURI, req, res) {
		if (Object.keys(pages).indexOf(reqURI) !== -1) {
			pages[reqURI](req, con=> {
				if (!(con.format === false)) {
					res.set({'content-type': 'text/html; charset=UTF-8'});
					res.end(formatPage(req, reqURI, con.title, con.content));
				} else {
					res.set({'content-type': 'text/html; charset=UTF-8'});
					res.end(con.content);
				}
			});
			return true;
		} else return false;
	}
};
var pages = {
	"/": (req, cb) => {
		isFunction(cb) && cb({content: getTemplate('content/index.handlebars')()});
	},
	"/data": (req, cb) => {
		isFunction(cb) && cb({content: getTemplate('content/data.handlebars')(), title: "View Draws"})
	},
	"/about": (req, cb) => {
		isFunction(cb) && cb({content: getTemplate('content/about.handlebars')(), title: "About"});
	},
	"/contact": (req, cb) => {
		isFunction(cb) && cb({content: getTemplate('content/contact.handlebars')(), title: "Contact"});
	},
	"/license": (req, cb) => {
		isFunction(cb) && cb({content: getTemplate('content/license.handlebars')(), title: "License"});
	},
	"/privacy": (req, cb) => {
		isFunction(cb) && cb({
			content: getTemplate('content/privacy.handlebars')(),
			title: "Privacy Policy"
		});
	},
	"/tos": (req, callback) => {
		!isFunction(callback) || callback({
			content: getTemplate('content/tos.handlebars')(),
			title: "Terms of Service"
		});
	},
	"/signup": (req, cb) => {
		isFunction(cb) && cb({
			content: getTemplate('content/signup.handlebars')(), title: "Sign Up"
		});
	},
	"/login": (req, cb) => {
		isFunction(cb) && cb({
			content: getTemplate('content/login.handlebars')(), title: "Log In"
		});
	},
	"/settings": (req, cb) => {
		var query = req.query.panel || "General";
		var panels = [
			{
				name: "General",
				content: getTemplate('content/settings/General.handlebars')(),
				selected: false
			},
			{
				name: "Data",
				content: getTemplate('content/settings/Data.handlebars')(),
				selected: false
			}
		];
		var match = false;
		panels.forEach(obj => {
			if (query.toUpperCase() === obj.name.toUpperCase()) obj.selected = true,
				match = true;
		});
		if (!match) panels[0].selected = true;
		isFunction(cb) && cb({
			content: getTemplate('content/settings.handlebars')({panels: panels}), title: "Settings"
		});
	}
};
var isFunction = Handlebars.Utils.isFunction;