var express = require('express');
const querystring = require("querystring");

module.exports = appConfig=>{
	var router = express.Router();

	var PhotoUtils = require('./PhotoUtils')(appConfig);

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/original\/+/g, '');
		PhotoUtils.showFaces({
			bucket : appConfig.bucketName,
			bucketKey : bucketKey
		}).then(image=>{
			res.end(image.data.formats.original);
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}