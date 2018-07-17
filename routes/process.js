var express = require('express');

module.exports = appConfig=>{
	var router = express.Router();

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/process\/+/g, '');
		var rekogOptions = {
			AWS : appConfig.AWS,
			bucket : appConfig.bucketName,
			bucketKey : bucketKey,
			rekognitionCollection : appConfig.rekognitionCollection,
			table : appConfig.table
		};
		require('./OpenCVRecog').processRekog(rekogOptions).then(data=>{
			appConfig.utils.CacheUtils.clear("requestCache", bucketKey);
			res.end(data);
		}).catch(err=>{
			res.end(err.message);
		});
	});
	return router;
}