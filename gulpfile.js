/**
 *  Modules
 */
var gulp   = require('gulp'),
    watch      = require('gulp-watch'),
    plumber    = require('gulp-plumber'),
    uglify     = require('gulp-uglify'),
    concat     = require('gulp-concat');

var scripts = ['svg-pan-zoom.js', 'control-icons.js'];

/**
 *  Minify script
 */

gulp.task('build', function() {
  return gulp.src(scripts)
    .pipe(concat('svg-pan-zoom.js'))
    .pipe(gulp.dest('dist'))
    .pipe(concat('svg-pan-zoom.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

// Watch
gulp.task('watch', function () {
  gulp.watch(scripts, ['build']);
});

/**
 * Default task
 */
gulp.task('default', [
  'build',
  'watch'
]);

