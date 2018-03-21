let mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	scrypt = require('scrypt'),
	MAX_LOGIN_ATTEMPTS = 100,
	LOCK_TIME = 10 * 60 * 1000;

let UserSchema = new Schema({
	username: {type: String, required: true, index: true, unique: true},
	password: {type: String, required: true},
	perm: [],
	dateCreated: {type: Date, default: Date.now},
	loginAttempts: {type: Number, required: true, default: 0},
	email: {type: String, required: true, unique: true},
	lockUntil: {type: Number}
});

UserSchema.virtual('isLocked').get(function () {
	// check for a future lockUntil timestamp
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function (next) {
	let user = this;

	// only hash the password if it has been modified (or is new)
	if (!user.isModified('password')) return next();

	scrypt.kdf(Buffer.from(user.password), {N: 68, r: 8, p: 1}, (err, hash) => {
		if (err) return next(err);
		user.password = hash.toString('base64');
		next();
	});
});

UserSchema.methods.verifyPassword = function (candidatePassword, cb) {
	scrypt.verifyKdf(Buffer.from((this.password), "base64"), Buffer.from(candidatePassword), function (err, isMatch) {
		if (err) return cb(err);
		cb(null, isMatch);
	});
};

UserSchema.methods.incLoginAttempts = function (cb) {
	// If there's an expired lock, restart at 1
	if (this.lockUntil && this.lockUntil < Date.now()) {
		return this.update({
			$set: {loginAttempts: 1},
			$unset: {lockUntil: 1}
		}, cb);
	}
	let updates = {$inc: {loginAttempts: 1}};
	// lock the account if we've reached max attempts and it's not locked already
	if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
		updates.$set = {lockUntil: Date.now() + LOCK_TIME};
	}
	return this.update(updates, cb);
};

let reasons = UserSchema.statics.failedLogin = {
	NOT_FOUND: 0,
	PASSWORD_INCORRECT: 1,
	MAX_ATTEMPTS: 2
};

UserSchema.statics.getAuthenticated = function (username, password, cb) {
	try {
		username = username.toString();
	} catch (e) {
		cb(new TypeError("Expected a letiable that could be turned into a string"));
	}
	this.findOne({$or: [{username: username}, {email: username}]}, function (err, user) {
		if (err) return cb(err);

		// make sure the user exists
		if (!user) {
			return cb(null, null, reasons.NOT_FOUND);
		}

		// check if the account is currently locked
		if (user.isLocked) {
			// just increment login attempts if account is already locked
			return user.incLoginAttempts(function (err) {
				if (err) return cb(err);
				return cb(null, null, reasons.MAX_ATTEMPTS);
			});
		}

		// test for a matching password
		user.verifyPassword(password, function (err, isMatch) {
			if (err) return cb(err);

			// check if the password was a match
			if (isMatch) {
				// if there's no lock or failed attempts, just return the user
				if (!user.loginAttempts && !user.lockUntil) return cb(null, user);
				// reset attempts and lock info
				let updates = {
					$set: {loginAttempts: 0},
					$unset: {lockUntil: 1}
				};
				return user.update(updates, function (err) {
					if (err) return cb(err);
					return cb(null, user);
				});
			}

			// password is incorrect, so increment login attempts before responding
			user.incLoginAttempts(function (err) {
				if (err) return cb(err);
				return cb(null, null, reasons.PASSWORD_INCORRECT);
			});
		});
	});
};

UserSchema.statics.userExists = function (username, cb) {
	this.findOne({$or: [{username: username}, {email: username}]}, function (err, user) {
		if (err) return cb(err);

		if (user) return cb(null, true);
		else return cb(null, false);
	});
};

module.exports = mongoose.model('User', UserSchema);