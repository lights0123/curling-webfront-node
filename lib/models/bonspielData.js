let mongoose = require('mongoose'),
	Schema = mongoose.Schema;

let DataSchema = new Schema({
	year: {type: Number, default: () => new Date().getFullYear(), index: {unique: true, dropDups: true}},
	data: {type: Object}
});

let reasons = DataSchema.statics.errorCodes = {
	NOT_FOUND: 1
};

DataSchema.statics.getYear = function (year, cb) {
	this.findOne({year: year}, function (err, data) {
		if (err) return cb(err);
		if (!data) {
			return cb(reasons.NOT_FOUND);
		}
		return cb(null, data);
	});
};

DataSchema.statics.getLatestYear = function (cb) {
	this
		.find()
		.sort({year: -1})
		.limit(1)
		.exec((err, data) => {
			if (err) return cb(err);
			if (!data) {
				return cb(reasons.NOT_FOUND);
			}
			return cb(null, data);
		});
};

DataSchema.statics.updateYear = function (year, data, cb) {
	this.findOneAndUpdate({year: year}, data, {upsert: true}, function (err, data) {
		if (err) return cb(err);
		return cb();
	});
};

module.exports = mongoose.model('Data', DataSchema);