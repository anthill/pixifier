"use strict";

require('es6-shim');

var gulp = require('gulp');

var server = require('gulp-live-server'); 

var binder = server.new(['./src/compute.js']);
var initializer = server.new(['./src/init.js']);

gulp.task('init', function () {
    initializer.start();
});

gulp.task('compute', function() {
    binder.start();
})
