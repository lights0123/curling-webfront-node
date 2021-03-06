const {expect} = require('chai');
const request = require('request');
const fs = require('fs');
const Handlebars = require('handlebars');
const {fork} = require('child_process');
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
describe('Server', function () {
	describe('HTTP', function () {
		let port = 8080;
		let server;
		describe('Startup', function () {
			this.timeout(10000);
			it('should exist', function (done) {
				fs.access("index.js", fs.constants.R_OK, function (err) {
					done(err);
				});
			});
			it('should successfully start', function (done) {
				server = fork("index.js", {
					env: {port: port},
					stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
					cwd: __dirname + '/..'
				});
				server.on("error", function (err) {
					done(err);
				});
				server.on("message", function (message) {
					expect(message).to.equal("online");
					done();
				});
				server.stderr.on('data', (data) => {
					console.log(`stderr: ${data}`);
				});
			});
		});
		describe('Content', function () {
			it('should respond to connections', function (done) {
				request('http://localhost:' + port, function (err, res) {
					expect(err).to.not.be.an('error');
					expect(res.statusCode).to.be.at.most(399);
					done();
				});
			});
			describe('Pages', function () {
				let menu = {
					'/': ['Home', ['active']],
					'/data': ['View Draws', []],
					'/contact': ['Contact', []],
					'/about': ['About', []],
					'/login': ['Login', ['right']],
					'/signup': ['Sign Up', ['right']]
				};
				let template = Handlebars.compile(fs.readFileSync('content/page.handlebars').toString());
				it('should show the home page correctly', function (done) {
					request('http://localhost:' + port + '/', function (err, res, resBody) {
						expect(err).to.not.exist;
						expect(res.statusCode).to.be.at.most(399);
						fs.readFile('content/index.handlebars', function (err,index) {
							expect(err).to.not.be.an('error');
							let originalYear = 2015;
							let templateParameters = {
								title: "",
								menu: menu,
								content: Handlebars.compile(index.toString()),
								serviceWorker: false,
								originalYear: originalYear
							};
							if (new Date().getFullYear() !== originalYear) {
								templateParameters.showSecondYear = true;
								templateParameters.year = new Date().getFullYear();
							}
							expect(resBody).to.equal(template(templateParameters));
							done();
						});
					});
				});
			});
		});
		describe('Shutdown', function () {
			it('should shutdown properly', function (done) {
				server.kill(2); //SIGINT
				server.on('exit', function () {
					request('http://localhost:' + port, function (err) {
						expect(err).to.be.an('error');
						done();
					});
				});
			});
		});
	})
});