module.exports = appConfig=>{
	return {
		clear : (cacheName,key)=>{
			if(appConfig.context.cache[cacheName] && appConfig.context.cache[cacheName][key]){
				delete appConfig.context.cache[cacheName][key];
			}
		}
	};
}