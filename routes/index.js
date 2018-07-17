var express = require('express');

module.exports = appConfig=>{
	var router = express.Router();

	var ContentUtils = require('./ContentUtils')(appConfig);

	/* GET home page. */
	router.get('/', function(req, res, next) {
		ContentUtils.createList(appConfig.bucketName).then(list=>{
			res.render('index', { list: list });
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}
