var express = require('express');

module.exports = appConfig=>{
	var router = express.Router();

	/* Delete face metadata. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/delete\/+/g, '');
		const docClient = new appConfig.AWS.DynamoDB.DocumentClient();
		docClient.delete({
			TableName : appConfig.table,
			Key : {
				bucket : appConfig.bucketName,
				image : bucketKey
			}
		}).promise().then(data=>{
			console.log(data);
			appConfig.utils.CacheUtils.clear("requestCache", bucketKey);
			res.end("Metadata deleted.");
		}).catch(err=>{
			res.end(err.message);
		});
	});
	return router;
}