let express = require('express');
const async = require('async');
const User = require('../models/user');
const Handlebars = require('handlebars');
const helpers = require('../helpers');
const getTemplate = helpers.getTemplate;
const doError = helpers.doError;
const formatPage = helpers.formatPage;
const redirect = helpers.redirect;
const methodNA = helpers.methodNA;
let router = express.Router();
router.route('/signout')
	.get((req, res, next) => {
		delete req.session.user;
		redirect(req, res, "/");
	});
router.route('/signup')
	.get((req, res, next) => {
		if ("user" in req.session) redirect(req, res, "/settings"); else next();
	})
	.post((req, res, next) => {
		if ("user" in req.session) redirect(req, res, "/settings");
		if ("username" in req.body || "email" in req.body || "password" in req.body) {
			let errorMappings = {
				"password": "Please enter a password",
				"passwordl": "Please enter no more than 1000 characters",
				"passwords": "Passwords must be at least 6 characters",
				"username": "Please select a username",
				"usernamel": "Please enter a username no more than 64 characters",
				"usernames": "Please enter a username no less than 4 characters",
				"usernamet": "Sorry, but this username is already taken",
				"email": "Please enter an email address",
				"emaill": "Your email address must be no more than 254 characters",
				"emailv": "Please enter a valid email address",
				"emailt": "Sorry, but this email address is already used",
				"dberror": "Uh-Oh, we're having an issue with our system. Please try again later"
			};
			let error = [];
			async.parallel([
				callback => {
					if ("username" in req.body) {
						User.userExists(req.body.username, function (err, found) {
							if (err) error.push("dberror");
							if (found) error.push("usernamet");
							if (req.body.username.length > 64) error.push("usernamel");
							if (req.body.username.length < 4) error.push("usernames");
							callback(null, null);
						});
					} else error.push("username");
				},
				callback => {
					if ("email" in req.body) {
						User.userExists(req.body.email, function (err, found) {
							if (err) error.push("dberror");
							if (found) error.push("emailt");
							if (req.body.email.length > 254) error.push("emaill");
							/.+@.+/.test(req.body.email) || error.push("emailv");
							callback(null, null);
						});
					} else error.push("email");
				},
				callback => {
					if ("password" in req.body) {
						if (req.body.password.length < 6) error.push("passwords");
						if (req.body.password.length > 1000) error.push("passwordl");
					} else error.push("password");
					callback(null, null);
				}
			], () => {
				let doError = () => {
					let errObject = Object.filter(errorMappings, error, false);
					Object.keys(errObject).forEach((index) => {
						switch (index.slice(0, -1)) {
							case "password":
								errObject.password = errObject[index];
								delete errObject[index];
								break;
							case "username":
								errObject.username = errObject[index];
								delete errObject[index];
								break;
							case "email":
								errObject.email = errObject[index];
								delete errObject[index];
								break;
						}
					});
					if ("from" in req.body && req.body.from === "jquery") {
						res.set({'content-type': 'application/json; charset=UTF-8'});
						res.end(JSON.stringify({success: false, error: errObject}));
					} else {
						redirect(req, res, "/signup");
					}
				};
				let doErrors = true;
				if (error.length === 0) {
					try {
						let user = new User({
							username: req.body.username.toString(),
							password: req.body.password.toString(),
							email: req.body.email.toString()
						});
					} catch (e) {
						cb(new TypeError("Expected a letiable that could be turned into a string"));
					}
					doErrors = false;
					user.save(function (err) {
						if (!err) {
							req.session.user = user;
							if ("from" in req.body && req.body.from === "jquery") {
								res.set({'content-type': 'application/json; charset=UTF-8'});
								res.end(JSON.stringify({success: true, redirect: "/"}))
							} else {
								res.redirect("/");
							}
							return;
						}
						error.push("dberror");
						doError();
					})
				}
				if (doErrors) doError();
			});
		} else next();
	});
router.route('/login')
	.get((req, res, next) => {
		if ("user" in req.session) redirect(req, res, "/settings"); else next();
	})
	.post((req, res, next) => {
		if ("user" in req.session) {
			redirect(req, res, "/settings");
			return;
		}
		if ("username" in req.body || "email" in req.body || "password" in req.body) {
			let errorMappings = {
				"password": "Please enter a password",
				"username": "Please enter a username or email address",
				"dberror": "Uh-Oh, we're having an issue with our system. Please try again later",
				"block": "Due to many login attempts, your account has been blocked. You may reset it by resetting your password",
				"notfound": "Your username or password is incorrect"
			};
			let error = [];
			async.parallel([
				callback => {
					if ("username" in req.body) {
						User.userExists(req.body.username, function (err, found) {
							if (err) error.push("dberror");
							if (!found) error.push("notfound");
							callback(null, null);
						});
					} else error.push("username");
				},
				callback => {
					if (!("password" in req.body)) error.push("password");
					callback(null, null);
				}
			], () => {
				let doError = () => {
					let errObject = Object.filter(errorMappings, error, false);
					Object.keys(errObject).forEach((index) => {
						switch (index.slice(0, -1)) {
							case "password":
								errObject.password = errObject[index];
								delete errObject[index];
								break;
							case "username":
								errObject.username = errObject[index];
								delete errObject[index];
								break;
						}
					});
					if ("from" in req.body && req.body.from === "jquery") {
						res.set({'content-type': 'application/json; charset=UTF-8'});
						res.end(JSON.stringify({success: false, error: errObject}));
					} else {
						redirect(req, res, "/signup");
					}
				};
				let doErrors = true;
				if (error.length === 0) {
					doErrors = false;
					let reasons = User.failedLogin;
					User.getAuthenticated(req.body.username, req.body.password, (err, user, reason) => {
						if (!err) {
							if (user) {
								req.session.user = user;
								if ("from" in req.body && req.body.from === "jquery") {
									res.set({'content-type': 'application/json; charset=UTF-8'});
									res.end(JSON.stringify({success: true, redirect: "/"}))
								} else {
									res.redirect("/");
								}
								return;
							} else {
								switch (reason) {
									case reasons.NOT_FOUND:
									case reasons.PASSWORD_INCORRECT:
										error.push("notfound");
										doError();
										break;
									case reasons.MAX_ATTEMPTS:
										error.push("block");
										doError();
										break;
								}
							}
							return;
						}
						error.push("dberror");
						doError();
					});
				}
				if (doErrors) doError();
			});
		} else next();
	});
router.route(['/settings', '/settings/:panel'])
	.get((req, res, next) => {
		if ("user" in req.session) {
			let query = req.params.panel || req.query.panel || "General";
			let panels = [
				{
					name: "General",
					content: getTemplate('content/settings/General.handlebars')(),
					selected: false
				}
			];
			if (req.session.user.perm.indexOf('Upload Spreadsheets') !== -1) {
				panels.push(
					{
						name: "Data",
						content: getTemplate('content/settings/Data.handlebars')(),
						selected: false
					})
			}
			let match = false;
			panels.forEach(obj => {
				if (query.toUpperCase() === obj.name.toUpperCase()) obj.selected = true,
					match = true;
			});
			if (!match) panels[0].selected = true;
			res.set({'content-type': 'text/html; charset=UTF-8'});
			res.end(formatPage(req, req.path, "Settings", getTemplate('content/settings.handlebars')({panels: panels})));
		} else redirect(req, res, "/login");
	});


methodNA(router);
module.exports = router;
