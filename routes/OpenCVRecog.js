const uuidv1 = require('uuid/v1');
const cv = require('opencv4nodejs');

module.exports = {
	getItem : options=>{
		return new Promise((resolve, reject)=>{
			var keep = data=>{
				resolve(data);
			};
			const docClient = new options.AWS.DynamoDB.DocumentClient();
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
			}).promise().then(data=>{
				if(data.Count==0){
					console.log("Item not found.  Creating in DB...");
					var uuid = uuidv1();
					docClient.put({
						TableName: options.table,
						Item: {
							'bucket' : options.bucket,
							'image' : options.bucketKey,
							'uuid' : uuid
						}
					}).promise().then(data=>{
						keep(data);
					});
				}else{
					keep(data);
				}
			});
		});
	},
	processRekog : options=>{
		const rekognition = new options.AWS.Rekognition({
			apiVersion: '2016-06-27'
		});
		const dynamodb = new options.AWS.DynamoDB({
			apiVersion: '2012-08-10'
		});
		const s3 = new options.AWS.S3({
			apiVersion: '2006-03-01'
		});
		const docClient = new options.AWS.DynamoDB.DocumentClient();
		return new Promise((resolve,reject)=>{
			const rekognition = new options.AWS.Rekognition({
				apiVersion: '2016-06-27'
			});
			var imageId = options.bucket + "-" + options.bucketKey.replace(/\//g,"-");
			var uuid = uuidv1();

			Promise.all([
				rekognition.detectLabels({
					Image: {
						"S3Object": { 
							"Bucket": options.bucket,
							"Name": options.bucketKey
						}
					}
				}).promise(),
				rekognition.detectFaces({
				Image: {
					"S3Object": { 
						"Bucket": options.bucket,
						"Name": options.bucketKey
					}
				}
				}).promise(),
				rekognition.indexFaces({
					"CollectionId": options.rekognitionCollection,
					"Image": {
						"S3Object": {
						"Bucket": options.bucket,
						"Name": options.bucketKey
						}
					},
					"ExternalImageId": uuid,
					"DetectionAttributes": [
						"ALL"
					]
				}).promise()
			]).then(rekogData=>{
				module.exports.getItem(options).then(()=>{
					var ddb = new options.AWS.DynamoDB();
					ddb.updateItem({
					    TableName:options.table,
					    Key:{
					        "bucket": { S: options.bucket},
					        "image": { S: options.bucketKey}
					    },
					    UpdateExpression: "set labels = :l, faceDetails = :fd, faceIndex = :fi",
					    ExpressionAttributeValues:{
					        ":l": options.AWS.DynamoDB.Converter.input(rekogData[0].Labels),
					        ":fd": options.AWS.DynamoDB.Converter.input(rekogData[1].FaceDetails),
					        ":fi": options.AWS.DynamoDB.Converter.input(rekogData[2])
					    },
					    ReturnValues:"UPDATED_NEW"
					}).promise().then(data=>{
						resolve(`Rekognition data successfully stored to ${options.table}.   ${rekogData[2].FaceRecords.length} faces detected.`)
					}).catch(err=>{reject(`Error writing to DynamoDB table ${options.table}\n\n${err}`);});
				});	
			}).catch(err=>{
				reject(err);
			});
		});
	},

	process : options=>{
		return new Promise((resolve,reject)=>{
			if (!cv.xmodules.face) {
				reject('exiting: opencv4nodejs compiled without face module');
			}
			const dynamodb = new options.AWS.DynamoDB({
				apiVersion: '2012-08-10'
			});
			const s3 = new options.AWS.S3({
				apiVersion: '2006-03-01'
			});
			const docClient = new options.AWS.DynamoDB.DocumentClient();
			module.exports.getItem(options).then(()=>{
				Promise.all([
					s3.getObject({ 
						Bucket : options.bucket, 
						Key : options.bucketKey 
					}).promise(),
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
				]).then(data=>{
					console.log(data);
					var faceIndex = data[1].Items[0].faceIndex;
					new Promise((resolve,reject)=>{
						var minSize = 10;
						const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

						cv.imdecodeAsync(data[0].Body, function(err, img){
							if(err){
								reject(err);
								return;
							}else{
								// face recognizer works with gray scale images
								var grayImg = img.bgrToGray();
								// detect and extract face
								const faceRects = classifier.detectMultiScale(grayImg).objects;
								//resolve(faceRects);
								//return;
								var rects = [];
								if(faceRects){
									rects = faceRects.filter(rect=>{
										return (rect.height>=minSize)?true:false;
									})
									.map(rect=>{
										return {
											x : rect.x,
											y : rect.y,
											width : rect.width,
											height : rect.height
										};
									});
									// .map(faceRect=>img.getRegion(faceRect));
								}
								// detect and extract face
								console.log(options.bucketKey + " - " + rects.length + " faces detected.");
								resolve(rects);
							}
						});
					}).then(rects=>{
						var ddb = new options.AWS.DynamoDB();
						ddb.updateItem({
						    TableName:options.table,
						    Key:{
						        "bucket": { S: options.bucket},
						        "image": { S: options.bucketKey}
						    },
						    UpdateExpression: "set cvData = :cv",
						    ExpressionAttributeValues:{
						        ":cv": options.AWS.DynamoDB.Converter.input(rects)
						    },
						    ReturnValues:"UPDATED_NEW"
						}).promise().then(data=>{
							resolve(rects);
						});
					})
					.catch(err=>{reject(`Error writing to DynamoDB table ${options.table}\n\n${err}`);});
				}).catch(err=>{
					reject(err.message);
				});
			})
		});
	}
}