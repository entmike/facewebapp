var AWS = require('aws-sdk');
AWS.config.update({
	region: "us-west-2",
	credentials : new AWS.SharedIniFileCredentials({profile: 'personal-account'})
});
const appConfig = {
	AWS : AWS,
	bucketName : "com.entmike.miketest2",
	rekognitionCollection : "mike",
	table : "imageInfo"
};
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter(appConfig));
app.use('/showface/*', require('./routes/showface')(appConfig));
app.use('/showfaces/*', require('./routes/showfaces')(appConfig));
app.use('/original/*', require('./routes/original')(appConfig));
app.use('/process/*', require('./routes/process')(appConfig));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;