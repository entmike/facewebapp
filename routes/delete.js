var express = require('express');

module.exports = options=>{
	var router = express.Router();

	/* Delete face metadata. */
	router.get('/', function(req, res, next) {
		var bucketKey = req.baseUrl.replace(/^\/delete\/+/g, '');
		const docClient = new options.AWS.DynamoDB.DocumentClient();
		docClient.delete({
			TableName : options.table,
			Key : {
				bucket : options.bucketName,
				image : bucketKey
			}
		}).promise().then(data=>{
			console.log(data);
			res.end("Metadata deleted.");
		}).catch(err=>{
			res.end(err.message);
		});
	});
	return router;
}