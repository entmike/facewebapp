module.exports = appConfig=>{
	const AWS = appConfig.AWS;
	const dynamodb = new AWS.DynamoDB({
		apiVersion: '2012-08-10'
	});
	const s3 = new AWS.S3({
		apiVersion: '2006-03-01'
	});
	const docClient = new AWS.DynamoDB.DocumentClient();
	const sharp = require('sharp');
	const formatDate = date=>{
		var d = new Date(date),
			month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear();

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		return [year, month, day].join('-');
	};
	var requestCache = appConfig.context.cache.requestCache;
	var faceCache = appConfig.context.cache.faceCache;
	var computeCoords = (box, metadata)=>{
		var coords = {
			left : parseInt(box.Left * metadata.width),
			top : parseInt(box.Top * metadata.height),
			width : parseInt(box.Width * metadata.width),
			height : parseInt(box.Height * metadata.height),
		};
		// Bounding box width/height can go beyond image dimensions in cases where face is on edge.
		if(coords.left<0){
			coords.width = coords.width - coords.left;
			coords.left = 0;
		}
		if(coords.top<0){
			coords.height = coords.height - coords.top;
			coords.top = 0;
		}
		if(coords.left + coords.width > metadata.width) coords.width = metadata.width - coords.left;
		if(coords.top + coords.height > metadata.height) coords.height = metadata.height - coords.top;
		return coords;
	}
	var metadataPromises = options=>{
		return [
			s3.getObject({ Bucket : options.bucket, Key : options.bucketKey }).promise(),
			docClient.query({
				TableName: "imageInfo",
				ProjectionExpression:"faceIndex, cvData",
				KeyConditionExpression: "#bucket = :bucket and image = :image",
				ExpressionAttributeNames:{
					"#bucket": "bucket"
				},
				ExpressionAttributeValues: {
					":bucket" : options.bucket,
					":image" : options.bucketKey
				}
			}).promise()
		];
	}
	return {
		showFaceCV : options=>{
			return new Promise((resolve, reject)=>{
				var bucketKey = options.bucketKey;
				var bucket = options.bucket;
				var cacheKey = options.bucketKey+"-cv-"+options.face;
				faceCache[cacheKey] = faceCache[cacheKey] || {};
				var cache = faceCache[cacheKey];
				if(cache.data){
					resolve(cache);
				}else{
					Promise.all(metadataPromises({
						bucket : options.bucket,
						bucketKey : options.bucketKey
					})).then(promiseData=>{
						if(promiseData[0].Body && promiseData[1].Items && promiseData[1].Items[0].cvData){
							var file = new Buffer(promiseData[0].Body);
							var dbData = promiseData[1];
							var item = promiseData[1].Items[0];
							var originalImage = sharp(file);
							var foundFace = null;
							if(!item.cvData[options.face]){
								reject("Invalid face ID");
							}else{
								foundFace = item.cvData[options.face];
								console.log(foundFace);
								var originalImage = sharp(file);
								originalImage.metadata().then((metadata)=>{
									var coords = computeCoords({
										Left : foundFace.x / metadata.width,
										Top : foundFace.y / metadata.height,
										Width : foundFace.width / metadata.width,
										Height : foundFace.height / metadata.height
									}, metadata);
									originalImage.clone().extract(coords).toBuffer().then(faceFile=>{
										cache.data = {
											s3Object : promiseData[0],
											dynamoObject : dbData,
											formats : {
												original : file,
												cvface : faceFile
											},
											gzip : {}
										};
										resolve(cache);
									})
								});
							}
						}else{
							reject("Sad face");
						}
					});
				}
			});
		},
		showFace : options=>{
			return new Promise((resolve, reject)=>{
				var bucketKey = options.bucketKey;
				var bucket = options.bucket;
				var cacheKey = options.bucketKey+"-"+options.face;
				faceCache[cacheKey] = faceCache[cacheKey] || {};
				var cache = faceCache[cacheKey];
				if(cache.data){
					resolve(cache);
				}else{
					Promise.all(metadataPromises({
						bucket : options.bucket,
						bucketKey : options.bucketKey
					})).then(promiseData=>{
						if(promiseData[0].Body && promiseData[1].Items && promiseData[1].Items[0].faceIndex){
							var file = new Buffer(promiseData[0].Body);
							var item = promiseData[1].Items[0];
							var originalImage = sharp(file);
							var foundFace = null;
							for(record of item.faceIndex.FaceRecords){
								var id = record.Face.FaceId;
								if(id==options.face){
									foundFace = record;
								}
							}
							if(!foundFace) {
								reject("Invalid face ID");
							}else{
								var originalImage = sharp(file);
								originalImage.metadata().then((metadata)=>{
									var coords = computeCoords(foundFace.Face.BoundingBox,metadata);
									originalImage.clone().extract(coords).toBuffer().then(faceFile=>{
										cache.data = {
											s3Object : promiseData[0],
											dynamoObject : promiseData[1].Items[0],
											formats : {
												original : file,
												face : faceFile
											},
											gzip : {}
										};
										resolve(cache);
									})
								});
							}
						}else{
							reject("Sad face");
						}
					});
				}
			});
		},
		showFaces : (options)=>{
			return new Promise((resolve, reject)=>{
				var bucketKey = options.bucketKey;
				var bucket = options.bucket;
				requestCache[bucketKey] = requestCache[bucketKey] || {};
				var cache = requestCache[bucketKey];
				if(!cache.data){
					Promise.all([
						s3.getObject({ Bucket : bucket, Key : bucketKey }).promise()/*.catch(err=>{reject(err)})*/,
						docClient.query({
							TableName: "imageInfo",
							ProjectionExpression:"faceIndex, cvData",
							KeyConditionExpression: "#bucket = :bucket and image = :image",
							ExpressionAttributeNames:{
								"#bucket": "bucket"
							},
							ExpressionAttributeValues: {
								":bucket" : bucket,
								":image" : bucketKey
							}
						}).promise()/*.catch(err=>{reject(err)})*/
							
					])
					.then((promiseData)=>{
						cache.data = {
							formats : {},
							gzip : {}
						};
						if(promiseData[0] && promiseData[0].Body){
							cache.data.s3Object = promiseData[0];
							cache.data.formats.original = cache.data.s3Object.Body;
						}
						var file = new Buffer(promiseData[0].Body);
						var originalImage = sharp(file);
						var dbData = promiseData[1];
						cache.data.dynamoObject = promiseData[1]
						var cvFaces = [];
						var faces = [];
						originalImage.metadata().then((metadata)=>{
							if(dbData && 
								dbData.Items && 
								dbData.Items[0] && 
								dbData.Items[0].faceIndex){
								for(face of dbData.Items[0].faceIndex.FaceRecords){
									faces.push({coords : computeCoords(face.Face.BoundingBox, metadata) });
								}
							}
							if(dbData && 
								dbData.Items && 
								dbData.Items[0] && 
								dbData.Items[0].cvData){
								for(face of dbData.Items[0].cvData){
									cvFaces.push({coords : computeCoords({
										Left : face.x / metadata.width,
										Top : face.y / metadata.height,
										Width : face.width / metadata.width,
										Height : face.height / metadata.height
									},metadata) });
								}
							}
							return{
								showfaces : faces,
								cvFaces : cvFaces
							};
						}).then(data=>{
							for(faceType in data){
								for(face of data[faceType]){
									face.img = originalImage.clone().extract(face.coords);
								}
							}
							return data;
						}).then(facedata=>{
							console.log(facedata);
							var allPromises = [];
							for(faceType in facedata){
								allPromises.push(new Promise((typeResolve,typeReject)=>{
								var ft = faceType;
								var originalImage = sharp(file);
								var faces = facedata[faceType];
								originalImage.grayscale().blur(5);
								var promises = [];
								for(var face of faces){
									promises.push(face.img.toBuffer());
								}
								Promise.all(promises)
									.catch(err=>{
										throw(err);
									})
									.then(buffers=>{
										for(var i=0;i<buffers.length;i++){
											console.log(i);
											faces[i].buffer = buffers[i];
										}
										console.log(ft);
										var workaround = faces.reduce(function(input,overlay){
											return input.then( function(data) {
												return sharp(data).overlayWith(overlay.buffer, { 
													left : overlay.coords.left, 
													top : overlay.coords.top
												}).toBuffer().catch(err=>{throw(err);});
											});
										}, originalImage.toBuffer().catch(err=>{throw(err);}));
										workaround
											.catch(err=>{
												throw(err);
											})
											.then(data=>{
												cache.data.formats[ft] = data;
												typeResolve(cache);
											});
									});
								}));
							}
							console.log("Running all promises");
							Promise.all(allPromises).then(data=>{
								console.log(data);
								resolve(cache);
							});
						});
					})
					.catch(err=>{
						reject(err);
					});
				}else{
					resolve(cache)
				}
			});
		}
	};
}
