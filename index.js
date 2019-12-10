const router = module.exports = require('express').Router();

router.use('/breweries', require('./breweries'));
router.use('/beers', require('./beers'));
router.use('/owners', require('./owners'));
router.use('/login', require('./login'));