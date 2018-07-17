var express = require('express');
const cv = require('opencv4nodejs');
if (!cv.xmodules.face) {
  throw new Error('exiting: opencv4nodejs compiled without face module');
}

const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);


module.exports = appConfig=>{
	var router = express.Router();

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/process-opencv\/+/g, '');
		var rekogOptions = {
			AWS : appConfig.AWS,
			bucket : appConfig.bucketName,
			bucketKey : bucketKey,
			table : appConfig.table
		};
		require('./OpenCVRecog').process(rekogOptions).then(data=>{
			appConfig.utils.CacheUtils.clear("requestCache", bucketKey);
			res.end(JSON.stringify(data));
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}