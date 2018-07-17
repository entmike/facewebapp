var express = require('express');
const querystring = require("querystring");

module.exports = appConfig=>{
	var router = express.Router();

	var PhotoUtils = require('./PhotoUtils')(appConfig);

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/showface\/+/g, '');
		if(req.query.face){
			PhotoUtils.showFace({
				bucket : appConfig.bucketName,
				bucketKey : bucketKey,
				face : req.query.face
			}).then(image=>{
				res.end(image.data.formats.face);
			}).catch(err=>{
				// response.end(err.message);
			});
		}else if(req.query.cvface){
			PhotoUtils.showFaceCV({
				bucket : appConfig.bucketName,
				bucketKey : bucketKey,
				face : req.query.cvface
			}).then(image=>{
				res.end(image.data.formats.cvface);
			}).catch(err=>{
				// response.end(err.message);
			});
		}else{
			res.end("No Face ID given.");
		}
	});
	return router;
}