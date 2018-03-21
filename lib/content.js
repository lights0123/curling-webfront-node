import express from 'express';

const {formatMenu} = require('./helpers');
let router = express.Router({});
module.exports = router;

router.get('/', (req, res) => {
	res.render('index', formatMenu(req));
});
router.get('/about', (req, res) => {
	res.render('about', formatMenu(req, "About"));
});
router.get('/contact', (req, res) => {
	res.render('contact', formatMenu(req, "Contact"));
});
router.get('/license', (req, res) => {
	res.render('license', formatMenu(req, "License"));
});
router.get('/privacy', (req, res) => {
	res.render('privacy', formatMenu(req, "Privacy Policy"));
});
router.get('/tos', (req, res) => {
	res.render('tos', formatMenu(req, "Terms of Service"));
});
router.get('/signup', (req, res) => {
	res.render('signup', formatMenu(req, "Sign Up"));
});
router.get('/login', (req, res) => {
	res.render('login', formatMenu(req, "Log In"));
});
