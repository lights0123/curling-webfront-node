var express = require('express');
const async = require('async');
const Handlebars = require('handlebars');
const helpers = require('../helpers');
const getTemplate = helpers.getTemplate;
const doError = helpers.doError;
const formatPage = helpers.formatPage;
const redirect = helpers.redirect;
const methodNA = helpers.methodNA;
const multer = require('multer');
const XLSX = require("xlsx");
const moment = require("moment");
var upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5000000
	}
}).single('file');
var router = express.Router();
var data = {
	FIRST_TEAM: 'A',
	SECOND_TEAM: 'B',
	SHEET: 'C',
	TIME: 'D',
	ID: 'E',
	WINNER_TO: 'F',
	LOSER_TO: 'G',
	WINNER: 'H'
};
router.route('/upload')
	.post((req, res, next)=> {
		if ("user" in req.session) {
			req.session.user.perm.push('Upload Spreadsheets');
			if (req.session.user.perm.indexOf('Upload Spreadsheets') !== -1) {
				upload(req, res, function (err) {
					if (err) return console.log(err), doError(500, req, res);
					var workbook = XLSX.read(req.file.buffer);
					var s = workbook.Sheets['Data'];
					var encounteredBlank = false;
					var completeData = {};
					var lastDay = moment(getLastSunday(2016, 1));
					for (var i = 3; !encounteredBlank; i++) {
						if (s[data.ID + i] === undefined) encounteredBlank = true;
						else {
							if (s[data.TIME + i] !== undefined) {
								var spreadsheetDate = moment(s[data.TIME + i]['v'], 'ddd h:mm a');
								var parsedDate = lastDay.clone();
								parsedDate.subtract(lastDay.day() - spreadsheetDate.day() + 7, 'days');
								parsedDate.hour(spreadsheetDate.hour());
								parsedDate.minute(spreadsheetDate.minute());
								var time = parsedDate.format("h:mma ddd., M/D");
							} else time = '';
							completeData[s[data.ID + i]['v']] = {
								teams: [
									[undefined, ' '].indexOf(s[data.FIRST_TEAM + i]) !== -1 ? '' : s[data.FIRST_TEAM + i]['v'],
									[undefined, ' '].indexOf(s[data.SECOND_TEAM + i]) !== -1 ? '' : s[data.SECOND_TEAM + i]['v']
								],
								sheet: [undefined, ' '].indexOf(s[data.SHEET + i]) !== -1 ? '' : s[data.SHEET + i]['v'],
								time: time
							};
						}
					}
					console.log(completeData);
				});
			} else doError(403, req, res);
		} else redirect(req, res, "/login");
	});
function getLastSunday(year, month) {
	var lastDay = new Date(year, month, 0).getUTCDay();	//0th day is last day
	return new Date(year, month, -lastDay);				//negative days start from the end of the month
}
methodNA(router);
module.exports = router;