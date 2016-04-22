var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var DataSchema = new Schema({
	year: {type: Number, default: ()=>new Date().getFullYear()},
	data: {type: Object}
});