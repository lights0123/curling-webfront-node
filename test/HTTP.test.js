var expect = require('chai').expect;
var request = require('request');
var fs = require('fs');
var helpers = require('../helpers');
var Handlebars = require('handlebars');
describe('Server', function () {
	describe('HTTP', function () {
		var port = 8080;
		var server = require('../index').init({port:port});
		describe('Startup', function () {
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
				request('http://localhost:' + port, function (err, res) {
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
					request('http://localhost:' + port + '/', function (err, res, resBody) {
						expect(err).to.not.exist;
						expect(res.statusCode).to.be.at.most(399);
						fs.readFile('../content/index.handlebars', function (index) {
							expect(resBody).to.equal(template({
								title: "Curling CSC",
								menu: menu,
								content: Handlebars.compile(index.toString('utf-8')),
								serviceWorker: false
							}));
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