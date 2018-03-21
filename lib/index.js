import {readFileSync} from 'fs';
import express from 'express';
import compression from 'compression';
import session from 'express-session';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import nconf from 'nconf';
import {doError} from './helpers';
import createTravisHandler from './travis-webhook';
import {exec} from 'child_process';
import hbs from 'express-hbs';
const app = express();
const MongoStore = require('connect-mongo')(session);

const isProduction = process.env.NODE_ENV === "production";
let http;
let travisHandler;
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
		deploy: {
			"travis-token": null, //Current:  -----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvtjdLkS+FP+0fPC09j25\ny/PiuYDDivIT86COVedvlElk99BBYTrqNaJybxjXbIZ1Q6xFNhOY+iTcBr4E1zJu\ntizF3Xi0V9tOuP/M8Wn4Y/1lCWbQKlWrNQuqNBmhovF4K3mDCYswVbpgTmp+JQYu\nBm9QMdieZMNry5s6aiMA9aSjDlNyedvSENYo18F+NYg1J0C0JiPYTxheCb4optr1\n5xNzFKhAkuGs4XTOA5C7Q06GCKtDNf44s/CVE30KODUxBi0MCKaxiXw/yy55zxX2\n/YdGphIyQiA5iO1986ZmZCLLW8udz9uhW5jUr3Jlp9LbmphAC61bVSf4ou2YsJaN\n0QIDAQAB\n-----END PUBLIC KEY-----
			script: ""
		},
		cookie_secret: "CHANGE THIS"
	});
if (nconf.get('cookie_secret') === "CHANGE THIS") {
	if (isProduction) {
		console.error(`Default cookie_secret value! Change the variable "cookie_secret"!`);
		process.exit(1);
	} else console.warn(`Default cookie_secret value!`);
}
if (nconf.get('ssl')) {
	let SSLSettings = nconf.get('ssl');
	let newSSLSettings = {};
	if (SSLSettings.key) newSSLSettings.key = readFileSync(SSLSettings.key);
	if (SSLSettings.cert) newSSLSettings.cert = readFileSync(SSLSettings.cert);
	if (SSLSettings.pfx) newSSLSettings.pfx = readFileSync(SSLSettings.pfx);
	http = require('spdy').createServer(Object.assign(SSLSettings, newSSLSettings), app);
} else {
	http = require('http').createServer(app);
}

app.engine('handlebars', hbs.express4({
	partialsDir: __dirname + '/../views/partials',
	layoutsDir: __dirname + '/../views/layout',
	defaultLayout: __dirname + '/../views/layout/page.handlebars',
	extname: '.handlebars'
}));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/../views');
app.set('trust proxy', 'loopback');

app.use(express.static( __dirname +'/../dist-web', {'index': ['index.html']}));
app.use(express.static( __dirname +'/../public', {'index': ['index.html']}));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect('mongodb://' + nconf.get('database:host') + ':' + nconf.get('database:port') + '/' + nconf.get('database:database'), {
	user: nconf.get('database:user'),
	pass: nconf.get('database:password')
}, (err) => {
	if (err) {
		console.error("Could not establish connection to MongoDB");
		console.error(err);
	}
});
let sessionHandler = session({
	store: new MongoStore({mongooseConnection: mongoose.connection}),
	secret: nconf.get('cookie_secret'),
	cookie: {secure: 'auto'},
	resave: false,
	saveUninitialized: false
});

app.use(sessionHandler);
app.use(compression());

if (nconf.get('deploy:travis-token') !== null) {
	//TODO: switch to something better
	if (nconf.get('deploy:travis-token') === "") {
		travisHandler = createTravisHandler();
		app.use('/deploy', travisHandler);
	} else {
		travisHandler = createTravisHandler(nconf.get('deploy:travis-token'));
		app.use('/deploy', travisHandler);
	}
	travisHandler.on('success', data => {
		if (data.type === 'push' && data.branch === 'master') {
			exec(nconf.get('deploy:script'))
		}
	});
}

app.use(require('./routes/users'));
app.use(require('./routes/spreadsheet'));
app.use(require('./content'));

app.use((req, res) => {
	doError(404, req, res);
});
app.use((err, req, res) => {
	console.error(err);
	doError(500, req, res);
});

http.listen(nconf.get('port'), () => {
	console.log('listening on *:' + nconf.get('port'));
	if (process.send) process.send('online');
});
if (process.platform === "win32") {
	let rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("SIGINT", function () {
		process.emit("SIGINT");
	});
}

process.on("SIGINT", function () {
	console.log('stopping');
	http.close();
	mongoose.disconnect();
	process.exit();
});