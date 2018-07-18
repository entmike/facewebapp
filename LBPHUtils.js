const cv = require('opencv4nodejs');
module.exports = appConfig=>{
	const lbph = new cv.LBPHFaceRecognizer();
	const self =  {
		init : ()=>{
			lbph.save(appConfig.context.recognition.lbphFile);
		},
		save : ()=>{
			lbph.save(appConfig.context.recognition.lbphFile);
		},
		train : (name,image)=>{
			console.log(name);
			return new Promise((resolve,reject)=>{
				new Promise((resolve,reject)=>{
					cv.imdecodeAsync(image, function(err, img){
						if(err){ reject(err); }else{ resolve(img); }
					});
				}).then(imgMat=>{
					var grayResize = imgMat.bgrToGray().resize(80, 80);
					console.log("Initializing model file...");
					// self.init();
					lbph.load(appConfig.context.recognition.lbphFile);
					// Does not work
					// lbph.update([grayResize],[1]);
					self.save();
					resolve("imgMat");
				});
			});
		}
	};
	return self;
}