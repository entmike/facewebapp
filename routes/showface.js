var express = require('express');
const querystring = require("querystring");

module.exports = options=>{
	var router = express.Router();

	var PhotoUtils = require('./PhotoUtils')({
		AWS : options.AWS
	});

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/showface\/+/g, '');
		console.log(req.query.face);
		PhotoUtils.showFace({
			bucket : options.bucketName,
			bucketKey : bucketKey,
			face : req.query.face
		}).then(image=>{
			// res.sendFile(image);
			console.log(image);
			res.end(image.data.formats.face);
		}).catch(err=>{
			// response.end(err.message);
		});
	});
	return router;
}