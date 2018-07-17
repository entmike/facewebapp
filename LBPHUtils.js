const cv = require('opencv4nodejs');
module.exports = appConfig=>{
	const lbph = new cv.LBPHFaceRecognizer();
	return {
		train : (name,image)=>{
			return new Promise((resolve,reject)=>{
				new Promise((resolve,reject)=>{
					cv.imdecodeAsync(image, function(err, img){
						if(err){ reject(err); }else{ resolve(img); }
					});
				}).then(imgMat=>{
					lbph.load(appConfig.recognition.lbphFile);
					resolve(imgMat);
				});
			});
		}
	};
}