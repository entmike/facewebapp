module.exports = options=>{

	
	docClient.query({
					TableName: "imageInfo",
					ProjectionExpression:"faceIndex, #uuid",
					KeyConditionExpression: "#bucket = :bucket and image = :image",
					ExpressionAttributeNames:{
						"#uuid" : "uuid",
						"#bucket": "bucket"
					},
					ExpressionAttributeValues: {
						":bucket" : options.bucket,
						":image" : options.bucketKey
					}
				}).promise()
}