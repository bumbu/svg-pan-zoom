/**
 *  Modules
 */
var gulp       = require('gulp')
  , gulpWatch  = require('gulp-watch')
  , uglify     = require('gulp-uglify')
  , browserify = require('browserify')
  , source     = require('vinyl-source-stream')
  , rename     = require('gulp-rename')
  , qunit      = require('gulp-qunit')
  , eslint     = require('gulp-eslint')
  , gulpIf     = require('gulp-if')
  , header     = require('gulp-header')
  , buffer     = require('vinyl-buffer')
  , pkg        = require('./package.json')
  , banner     = '// svg-pan-zoom v<%= pkg.version %>' + '\n' + '// https://github.com/ariutta/svg-pan-zoom' + '\n'
  

function isFixed(file) {
  return file.eslint !== null && file.eslint.fixed
}

/**
 *  Build script
 */
function compile() {
  return browserify({entries:'./src/stand-alone.js'})
    .bundle()
    .on('error', function (err) {
      console.log(err.toString())
      this.emit('end')
    })
    .pipe(source('svg-pan-zoom.js'))
    .pipe(buffer())
    .pipe(header(banner, {pkg: pkg}))
    .pipe(gulp.dest('./dist/'))
    .pipe(rename('svg-pan-zoom.min.js'))
    .pipe(uglify())
    .pipe(header(banner, {pkg: pkg}))
    .pipe(gulp.dest('./dist/'))
}

/**
 * Watch script
 */
function watch() {
  return gulp.watch('./src/**/*.js', [ compile ])
}

/**
 * Test task
 */
function test() {
  return gulp.src('./tests/index.html')
    .pipe(qunit())
}

/**
 * Check
 */
function check() {
  return gulp
    .src([
      './**/*.js'
    , '!./dist/**/*.js'
    , '!./demo/**/*.js'
    , '!./tests/assets/**/*.js'
    , '!./src/uniwheel.js' // Ignore uniwheel
    ])
    .pipe(eslint({
      configFile: './.eslintrc.json'
      , fix: true
    }))
    .pipe(eslint.format())
    .pipe(gulpIf(isFixed, gulp.dest('./')))
    // uncomment to stop on error
    //.pipe(eslint.failAfterError())
}

exports.compile = compile
exports.watch = watch
exports.test = test
exports.check = check

/**
 * Build
 */
exports.build = gulp.series([test, check, compile])

/**
 * Default task
 */
exports.default = gulp.series([compile, watch])
