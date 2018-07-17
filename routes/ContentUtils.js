module.exports = options=>{
	const AWS = options.AWS;
	const dynamodb = new AWS.DynamoDB({
		apiVersion: '2012-08-10'
	});
	const s3 = new AWS.S3({
		apiVersion: '2006-03-01'
	});
	const docClient = new AWS.DynamoDB.DocumentClient();
	const formatDate = date=>{
		var d = new Date(date),
			month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear();

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		return [year, month, day].join('-');
	};

	return {
		createList2 : function(bucketName){
			return new Promise((resolve,reject)=>{
				s3.listObjectsV2({
					Bucket : bucketName
				}).promise().then(data=>{
					resolve(data);
				}).catch(err=>{
					reject(err);
				});
			});
		},
		processFiles : function(bucketName){
			return new Promise((resolve,reject)=>{
				files = this.createList2(bucketName).then(data=>{
					var promises = [];
					for(file of data.Contents){
						var f = JSON.parse(JSON.stringify(file));
						var key = file.Key;
						promises.push(
							docClient.query({
								TableName: "imageInfo",
								ProjectionExpression:"faceDetails, processedOn, faceIndex, cvData",
								KeyConditionExpression: "#bucket = :bucket and image = :image",
								ExpressionAttributeNames:{
									"#bucket": "bucket"
								},
								ExpressionAttributeValues: {
									":bucket" : bucketName,
									":image" : key
								}
							}).promise().then(function(f){
								// Gotta capture right file obj
								return data=>{
									return{
										db : data,
										s3 : f
									};
								};
							}(f))
						);
					}
					Promise.all(promises).then(data=>{
						for(item of data){
							if(item.s3.Key == "test/"){
								var docClient = new AWS.DynamoDB.DocumentClient();
								docClient.put({
									TableName: 'imageInfo',
									Item: {
										'bucket' : bucketName,
										'image' : item.s3.Key,
										'processedOn' : formatDate(new Date()),
										// 'test' : 'abc'
									}
								}).promise();
							}
						}
						resolve(data);
					});
				})
				.catch(err=>{reject(err)});
			});
		},
		createList : function(bucketName){
			return new Promise((resolve,reject)=>{
				files = this.processFiles(bucketName).then(data=>{
					resolve(data);
				})
				.catch(err=>{
					reject(err);
				});
			});
		}
	}
}
