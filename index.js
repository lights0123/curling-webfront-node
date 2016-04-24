const fs = require('fs');
const express = require('express');
const app = express();
var http;
var travisHandler;
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
const createTravisHandler = require('./travis-webhook');
const childProcess = require('child_process');
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
		port: 2000,
		deploy:{
			"travis-token": null,
			script: ""
		},
		cookie_secret:"CHANGE THIS"
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
	secret: nconf.get('cookie_secret'),
	cookie: {secure: 'auto'},
	resave: false,
	saveUninitialized: false
}));
app.use(compression());

if (nconf.get('travis-token') !== null) {
	if (nconf.get('travis-token') === "") {
		travisHandler = createTravisHandler();
		app.use('/deploy',travisHandler);
	} else {
		travisHandler = createTravisHandler(nconf.get('travis-token'));
		app.use('/deploy',travisHandler);
	}
	travisHandler.on('success', data=> {
		if(data.type==='push'&&data.branch==='master'){
			childProcess.exec(nconf.get('deploy:script'))
		}
	});
}

app.use(require('./routes/users'));
app.use(require('./routes/spreadsheet'));
app.use(require('./content'));
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
http.listen(nconf.get('port'), () => {
	console.log('listening on *:' + nconf.get('port'));
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