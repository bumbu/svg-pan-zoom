/**
 *  Modules
 */
var gulp   = require('gulp'),
watch      = require('gulp-watch'),
plumber    = require('gulp-plumber'),
uglify     = require('gulp-uglify');

var scripts = 'svg-pan-zoom.js';

/**
 *  Minify script
 */

gulp.task('scripts', function() {
  return gulp.src(scripts)
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

// Watch
gulp.task('watch', function () {
  gulp.watch(scripts, ['scripts']);
});

/**
 * Default task
 */
gulp.task('default', [
  'scripts',
  'watch'
]);

