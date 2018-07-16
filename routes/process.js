var express = require('express');

module.exports = options=>{
	var router = express.Router();

	/* GET face. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/process\/+/g, '');
		var rekogOptions = {
			AWS : options.AWS,
			bucket : options.bucketName,
			bucketKey : bucketKey,
			rekognitionCollection : options.rekognitionCollection,
			table : options.table
		};
		require('./Rekog').process(rekogOptions).then(data=>{
			res.end(data);
		}).catch(err=>{
			res.end(err);
		});
	});
	return router;
}