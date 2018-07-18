var express = require('express');
const querystring = require("querystring");

module.exports = appConfig=>{
	var router = express.Router();

	var PhotoUtils = require('./PhotoUtils')(appConfig);
	var LBPHUtils = appConfig.utils.LBPHUtils;

	/* Train face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/train\/+/g, '');
		new Promise((resolve,reject)=>{
			if(req.query.face){
				PhotoUtils.showFace({
					bucket : appConfig.bucketName,
					bucketKey : bucketKey,
					face : req.query.face
				}).then(image=>{
					resolve(image.data.formats.face);
				}).catch(err=>{
					// response.end(err.message);
				});
			}else if(req.query.cvface){
				PhotoUtils.showFaceCV({
					bucket : appConfig.bucketName,
					bucketKey : bucketKey,
					face : req.query.cvface
				}).then(image=>{
					resolve(image.data.formats.cvface);
				}).catch(err=>{
					res.end(err.message);
				});
			}else{
				res.end("No Face ID given.");
			}
		}).then(bufferData=>{
			if(req.query.label){
				LBPHUtils.train(req.query.label, bufferData)
				.then(data=>{
					res.end(data);
				});
			}
		}).catch(err=>{
			res.end(err.message);
		});
	});
	return router;
}