var expect = require('chai').expect;
var request = require('request');
var fs = require('fs');
var helpers = require('../helpers');
var Handlebars = require('handlebars');
var childProcess = require('child_process');
var path = require('path');
describe('Server', function () {
	describe('HTTPS', function () {
		var port = 8443;
		var server;
		var key = path.normalize(process.cwd() + "/key.key");
		var cert = path.normalize(process.cwd() + "/cert.crt");
		describe('Startup', function () {
			it('should allow OpenSSL to generate an SSL certificate', function (done) {
				childProcess.exec('openssl req -x509 -sha256 -nodes -subj "/C=US/ST=Ohio/L=h/O=h/CN=localhost" -days 365 -newkey rsa:2048 -keyout key.key -out cert.crt',
					function (err) {
						expect(err).to.not.exist;
						server = require('../index').init({
								port: port,
								ssl: {
									key: key,
									cert: cert
								}
							}
						);
						done();
					});
			});
			it('should connect to MongoDB', function (done) {
				expect(server.connectMongoose(function (err) {
					expect(err).to.not.exist;
					done();
				}))
			});
			it('should store sessions in MongoDB', function () {
				expect(server.connectMongoStore()).to.not.throw;
			});
			it('should startup the server', function () {
				expect(server.startServer()).to.not.throw;
			});
		});
		describe('Content', function () {
			it('should respond to connections', function (done) {
				request({
					url: 'https://localhost:'+port,
					agentOptions: {ca: fs.readFileSync(cert)}
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.statusCode).to.be.at.most(399);
					done();
				});
			});
			describe('Pages', function () {
				var menu = {
					'/': ['Home', []],
					'/data': ['View Draws', []],
					'/contact': ['Contact', []],
					'/about': ['About', []],
					'/login': ['Login', ['right']],
					'/signup': ['Sign Up', ['right']]
				};
				var template = Handlebars.compile(fs.readFileSync('content/page.handlebars').toString('utf-8'));
				it('should show the home page correctly', function (done) {
					request({
						url: 'https://localhost:'+port,
						agentOptions: {ca: fs.readFileSync(cert)}
					}, function (err, res, resBody) {
						expect(err).to.not.exist;
						expect(res.statusCode).to.be.at.most(399);
						fs.readFile('../content/index.handlebars', function (index) {
							var templateParameters = {
								title: "Curling CSC",
								menu: menu,
								content: Handlebars.compile(index.toString('utf-8')),
								serviceWorker: false
							};
							var originalYear = 2015;
							if(new Date().getFullYear() !== originalYear){
								templateParameters.showSecondYear = true;
								templateParameters.year = new Date().getFullYear();
							}
							expect(resBody).to.equal(template(templateParameters));
						});
						done();
					});
				});
			});
		});
		describe('Shutdown', function () {
			it('should shutdown properly', function (done) {
				server.stop();
				request('http://localhost:' + port, function (err) {
					expect(err).to.exist;
					done();
				});
			});
		});
	})
});