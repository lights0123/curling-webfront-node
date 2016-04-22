const fs = require('fs');
const express = require('express');
const app = express();
var http;
const path = require('path');
const compression = require('compression');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const async = require('async');
const Handlebars = require('handlebars');
const bodyParser = require('body-parser');
const nconf = require('nconf');
const helpers = require('./helpers');
const getTemplate = helpers.getTemplate;
const doError = helpers.doError;
nconf.argv()
	.env()
	.file({file: 'config.json'})
	.defaults({
		database: {
			host: 'localhost',
			database: 'curlcsc',
			port: 27017
		},
		ssl: false,
		proxy: false
	});
if (nconf.get('ssl')) {
	http = require('https').createServer(nconf.get('ssl'), app);
} else {
	http = require('http').createServer(app);
}
app.set('trust proxy', 'loopback');
app.use((req, res, next)=> {
	req.path = path.normalize(req.path);
	next();
});
app.all("/content/*", (req, res, next)=> {
	req.content = true;
	req.url = path.normalize(req.params[0] === "" ? "/" : req.params[0]);
	next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect('mongodb://' + nconf.get('database:host') + ':' + nconf.get('database:port') + '/' + nconf.get('database:database'), {
	user: nconf.get('database:user'),
	pass: nconf.get('database:password')
}, (err)=>console.log(err));

app.use(session({
	store: new MongoStore({mongooseConnection: mongoose.connection}),
	secret: "waffles",
	cookie: {secure: 'auto'},
	resave: false,
	saveUninitialized: false
}));
app.use(compression());
app.use(require('./routes/users'));
app.use(require('./routes/spreadsheet'));
app.use(require('./content').register());
app.use((req, res, next) => {
	var reqURI = req.path;
	var checkPath = path.normalize("public/" + reqURI);
	checkRaw(checkPath, result=> {
		if (result !== null) {
			if (result.isDir) {
				//TODO: add directory viewer
			} else if (!req.content) return res.sendFile(path.resolve(result.path));
			else if (req.content) return res.end(req.path);
		}
		next();
	});
});
http.listen(2000, () => {
	console.log('listening on *:2000');
});
function checkRaw(checkPath, callback) {
	async.parallel([
		callback=>fs.stat(checkPath, (err, stats)=> {
			if (!err) {
				if (stats.isDirectory()) {
					fs.stat(checkPath + "/index.html", (err, stats)=> {
						if (!err && !stats.isDirectory()) callback(null, {
							path: path.normalize(checkPath + "/index.html"),
							isDir: false
						}); else callback(null, {path: path.normalize(checkPath), isDir: true});
					});
				} else callback(null, {path: path.normalize(checkPath), isDir: false});
			} else callback(null, null);
		}),
		callback=>fs.stat(checkPath + ".html", (err, stats)=> {
			if (!err && !stats.isDirectory()) {
				callback(null, {path: path.normalize(checkPath + ".html"), isDir: false})
			} else callback(null, null);
		})], (err, results)=> {
		var bestMatch = null;
		results.forEach(item=> {
			if (item !== null) {
				if (bestMatch === null) bestMatch = item;
				else if (item.isDir === false && bestMatch.isDir === true) bestMatch = item;
			}
		});
		!Handlebars.Utils.isFunction(callback) || callback(bestMatch);
	});
}
app.use((req, res) => {
	doError(404, req, res);
});
app.use((err, req, res, next) => {
	console.log(err);
	doError(500, req, res);
});