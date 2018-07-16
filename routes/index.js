var express = require('express');

module.exports = options=>{
	var router = express.Router();

	var ContentUtils = require('./ContentUtils')({
		AWS : options.AWS
	});

	/* GET home page. */
	router.get('/', function(req, res, next) {
		ContentUtils.createList(options.bucketName).then(list=>{
			res.render('index', { list: list });
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}
