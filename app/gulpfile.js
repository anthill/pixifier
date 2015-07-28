"use strict";

require('es6-shim');

var gulp = require('gulp');

var server = require('gulp-live-server'); 

gulp.task('init', function () {
	var initializer = server.new(['./src/init.js']);
    initializer.start();
});