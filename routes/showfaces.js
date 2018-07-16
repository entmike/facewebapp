var express = require('express');
const querystring = require("querystring");

module.exports = options=>{
	var router = express.Router();

	var PhotoUtils = require('./PhotoUtils')({
		AWS : options.AWS
	});

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/showfaces\/+/g, '');
		PhotoUtils.showFaces({
			bucket : options.bucketName,
			bucketKey : bucketKey
		}).then(image=>{
			res.end(image.data.formats.showfaces);
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}