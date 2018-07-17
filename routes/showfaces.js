var express = require('express');
const querystring = require("querystring");

module.exports = appConfig=>{
	var router = express.Router();

	var PhotoUtils = require('./PhotoUtils')(appConfig);

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/showfaces\/+/g, '');
		PhotoUtils.showFaces({
			bucket : appConfig.bucketName,
			bucketKey : bucketKey
		}).then(image=>{
			console.log(image.data.formats);
			res.end(image.data.formats.showfaces);
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}