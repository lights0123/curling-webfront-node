let express = require('express');
const async = require('async');
const Handlebars = require('handlebars');
const {doError, formatMenu, redirect, methodNA} = require('../helpers');
const multer = require('multer');
const XLSX = require("xlsx");
const moment = require("moment");
const dataStorage = require('../models/bonspielData');
const errorCodes = dataStorage.errorCodes;
let upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5000000
	}
}).single('file');
let router = express.Router({});
let data = {
	FIRST_TEAM: 'A',
	SECOND_TEAM: 'B',
	SHEET: 'C',
	TIME: 'D',
	ID: 'E',
	WINNER_TO: 'F',
	LOSER_TO: 'G',
	WINNER: 'H'
};

function sanitizeSheetData(data) {
	let parsed = data;
	try {
		parsed = data['v'];
	} catch (e) {
	}
	return [null, undefined, ' ', '0', 0].indexOf(parsed) !== -1 ? '' : parsed
}

router.route('/upload')
	.post((req, res, next) => {
		if ("user" in req.session) {
			if (req.session.user.perm.indexOf('Upload Spreadsheets') !== -1) {
				upload(req, res, function (err) {
					if (err) return console.error(err), doError(500, req, res);
					let workbook = XLSX.read(req.file.buffer);
					let s = workbook.Sheets['Data'];
					let encounteredBlank = false;
					let completeData = {};
					let lastDay = moment(getLastSunday(new Date().getFullYear(), 1));
					for (let i = 3; !encounteredBlank; i++) {
						if (s[data.ID + i] === undefined) encounteredBlank = true;
						else {
							let firstTeam = sanitizeSheetData(s[data.FIRST_TEAM + i]);
							let secondTeam = sanitizeSheetData(s[data.SECOND_TEAM + i]);
							if (firstTeam.toLowerCase() === "bye" || secondTeam.toLowerCase() === "bye") continue;
							if (s[data.TIME + i] !== undefined) {
								let spreadsheetDate = moment(s[data.TIME + i]['v'], 'ddd h:mm a');
								let parsedDate = lastDay.clone();
								if (spreadsheetDate.day() !== 0) {
									parsedDate.subtract(lastDay.day() - spreadsheetDate.day() + 7, 'days');
								}
								parsedDate.hour(spreadsheetDate.hour());
								parsedDate.minute(spreadsheetDate.minute());
								let time = parsedDate.format("h:mma ddd., M/D");
							} else time = '';
							completeData[s[data.ID + i]['v']] = {
								teams: [
									firstTeam,
									secondTeam
								],
								sheet: sanitizeSheetData(s[data.SHEET + i]),
								winner: sanitizeSheetData(s[data.WINNER + i]),
								winnerTo: sanitizeSheetData(s[data.WINNER_TO + i]),
								loserTo: sanitizeSheetData(s[data.LOSER_TO + i]),
								time: time
							};
						}
					}
					dataStorage.updateYear(new Date().getFullYear(), {data: completeData}, err => {
						if (err) {
							console.error(err);
							return res.status(500).end('Database error');
						}
					});
					res.end();
				});
			} else res.status(403).end();
		} else redirect(req, res, "/login");
	});

function getLastSunday(year, month) {
	let lastDay = new Date(year, month, 0).getUTCDay();	//0th day is last day
	return new Date(year, month, -lastDay);				//negative days start from the end of the month
}

router.route(['/data', '/data/:panel'])
	.get((req, res, next) => {
		let panels = {
			1: {name: "First", active: false},
			2: {name: "Second", active: false},
			3: {name: "Third", active: false},
			4: {name: "Fourth", active: false},
			5: {name: "Fifth", active: false}
		};
		let selected = 1;
		if (req.params.panel
		&& (req.params.panel = parseInt(req.params.panel)), !isNaN(req.params.panel)
		&& req.params.panel <= 5
		&& req.params.panel >= 1)
			selected = req.params.panel;
		panels[selected].active = true;
		dataStorage.getLatestYear((err, data) => {
			if (!err && data) {
				res.render('data', {
					...formatMenu(req, "View Draws"),
					data: JSON.stringify(data[0].data),
					selected: selected,
					panels: panels,
					selectedEvent: panels[selected]
				});
			} else
				res.render('data', {
					...formatMenu(req, "View Draws"),
					selected: selected,
					panels: panels,
					selectedEvent: panels[selected]
				});
		});
	});
methodNA(router);
module.exports = router;