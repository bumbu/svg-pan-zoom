var Utils = require('./utilities')
  , SvgUtils = require('./svg-utilities')
  , ShadowViewport = require('./shadow-viewport')
  , SvgPanZoomEvent = require('./event')
  , Api = require('./api')

var SvgPanZoom = function(svg, options) {
  this.init(svg, options)
}

var optionsDefaults = {
  viewportSelector: '.svg-pan-zoom_viewport' // Viewport selector. Can be querySelector string or SVGElement
, refreshRate: 'auto' // Maximum number of frames per second (altering SVG's viewport)
, plugins: null
}

SvgPanZoom.prototype.init = function(svg, options) {
  this.svg = svg
  this.defs = svg.querySelector('defs')

  // Add default attributes to SVG
  SvgUtils.setupSvgAttributes(this.svg)

  // Set options
  this.options = Utils.extend(Utils.extend({}, optionsDefaults), options)

  // Init events
  this.events = {}

  // Init plugins
  this.loadPlugins()

  // Get dimensions
  var boundingClientRectNormalized = SvgUtils.getBoundingClientRectNormalized(svg)
  this.width = boundingClientRectNormalized.width
  this.height = boundingClientRectNormalized.height

  // Init shadow viewport
  this.viewport = ShadowViewport(SvgUtils.getOrCreateViewport(this.svg, this.options.viewportSelector), {
    svg: this.svg
  , width: this.width
  , height: this.height
  , refreshRate: this.options.refreshRate
  , trigger: Utils.proxy(this.trigger, this)
  })
}

/**
 * Add an event listener
 *
 * @param  {String}   name         Events name
 * @param  {Function} fn           Event callback
 * @param  {Object}   [ctx]        Callback context
 * @param  {String}   [pluginName] Plugin name
 */
SvgPanZoom.prototype.on = function(name, fn, ctx, pluginName) {
  // Create events list if it doesn't exist
  if (!(name in this.events)) {
    this.events[name] = []
  }

  this.events[name].push({
    fn: fn
  , ctx: ctx
  , pluginName: pluginName
  })
}

/**
 * Remove event listener
 * Specifying only the name will remove all event listeners
 * Users and plugins can only remove events defined by them
 *
 * @param  {String}   name         Event name
 * @param  {Function} [fn]         Event callback
 * @param  {Oblect}   [ctx]        Callback context
 * @param  {String}   [pluginName] Plugin name
 */
SvgPanZoom.prototype.off = function(name, fn, ctx, pluginName) {
  var i, sameFn, sameCtx, samePlugin

  if (name in this.events) {
    for (i = this.events[name].length - 1; i >= 0; i--) {
      sameFn = fn == null || fn === this.events[name][i].fn
      sameCtx = ctx == null || ctx === this.events[name][i].ctx
      samePlugin = pluginName == null || pluginName === this.events[name][i].pluginName

      if (sameFn && sameCtx && samePlugin) {
        this.events[name].splice(i, 1)
      }
    }
  }
}

/**
 * Trigger an event. All the arguments except first will be passed to event listeners
 *
 * @param  {String} name Event name. Plugins should namespace their events as pluginName:eventName
 * @return {Boolean} True if default event action should be done
 */
SvgPanZoom.prototype.trigger = function(name, data, namespace, originalEvent) {
  var event

  // Only if there are listening events
  if (name in this.events && this.events[name].length) {
    // Create event
    event = SvgPanZoomEvent.create(data, namespace, originalEvent)


    for (var i = 0; i < this.events[name].length; i++) {
      this.events[name][i].fn.call(this.events[name][i].ctx, event)

      // Leave the loop if stopPropagation or passThrough were called
      if (!event.isPropagating) break;
    }

    return !event.isPrevented
  } else {
    return true
  }
}

/**
 * Init plugins
 */
SvgPanZoom.prototype.loadPlugins = function() {
  this.plugins = []

  if (Utils.isArray(this.options.plugins)) {
    for (var i = 0; i < this.options.plugins.length; i++) {
      this.addPlugin(this.options.plugins[i])
    }
  } else {
    // Load all plugins
    for (var key in this.pluginsStore) {
      this.addPlugin(key)
    }
  }
}

/**
 * Add a plugin by name
 *
 * @param {String} name Plugin name
 */
SvgPanZoom.prototype.addPlugin = function(name) {
  if (name in this.pluginsStore) {
    var pluginApi = Api.createApi(this, name)

    this.plugins.push({
      name: name
    , plugin: this.pluginsStore[name](pluginApi)
    , api: pluginApi
    })
  } else {
    throw new Error('Following plugin is not available: ' + name)
  }
}

/**
 * Remove a plugin by name
 * Will remove multiple plugins that were loaded with given name
 *
 * @param {String} name Plugin name
 */
SvgPanZoom.prototype.removePlugin = function(name) {
  var i, event

  this.trigger('before:plugin:remove', {name: name})

  // Remove all events of this plugin
  for (event in this.events) {
    this.off(event, null, null, name)
  }

  for (i = this.plugins.length - 1; i >= 0; i--) {
    if (this.plugins[i].name === name) {
      this.plugins.splice(i, 1)
    }
  }

  this.trigger('after:plugin:remove', {name: name})
}

/**
 * Zoom in at a SVG point
 *
 * @param  {SVGPoint} point
 * @param  {Float} zoomScale    Number representing how much to zoom
 * @param  {Boolean} zoomAbsolute Default false. If true, zoomScale is treated as an absolute value.
 *                                Otherwise, zoomScale is treated as a multiplied (e.g. 1.10 would zoom in 10%)
 * @param  {String} namespace Method namespace
 */
SvgPanZoom.prototype.zoomAtPoint = function(zoomScale, point, zoomAbsolute, namespace) {
  var originalState = this.viewport.getOriginalState()

  if (zoomAbsolute) {
    // Find relative scale to achieve desired scale
    zoomScale = zoomScale/this.getZoom()
  }

  var oldCTM = this.viewport.getCTM()
    , relativePoint = point.matrixTransform(oldCTM.inverse())
    , modifier = this.svg.createSVGMatrix().translate(relativePoint.x, relativePoint.y).scale(zoomScale).translate(-relativePoint.x, -relativePoint.y)
    , newCTM = oldCTM.multiply(modifier)

  if (newCTM.a !== oldCTM.a) {
    this.viewport.setCTM(newCTM, namespace)
  }
}

/**
 * Zoom at center point
 *
 * @param  {Float} scale
 * @param  {Boolean} absolute Marks zoom scale as relative or absolute
 * @param  {String} namespace Method namespace
 */
SvgPanZoom.prototype.zoom = function(scale, absolute, namespace) {
  this.zoomAtPoint(scale, SvgUtils.getSvgCenterPoint(this.svg, this.width, this.height), absolute, namespace)
}

/**
 * Zoom used by public instance
 *
 * @param  {Float} scale
 * @param  {Boolean} absolute Marks zoom scale as relative or absolute
 * @param  {string} namespace Method namespace
 */
SvgPanZoom.prototype.pluginZoom = function(scale, absolute, namespace) {
  if (absolute) {
    scale = this.computeFromRelativeZoom(scale)
  }

  this.zoom(scale, absolute, namespace)
}

/**
 * Zoom at point used by public instance
 *
 * @param  {Float} scale
 * @param  {SVGPoint|Object} point    An object that has x and y attributes
 * @param  {Boolean} absolute Marks zoom scale as relative or absolute
 * @param  {String} namespace Method namespace
 */
SvgPanZoom.prototype.pluginZoomAtPoint = function(scale, point, absolute, namespace) {
  if (absolute) {
    // Transform zoom into a relative value
    scale = this.computeFromRelativeZoom(scale)
  }

  // If not a SVGPoint but has x and y then create a SVGPoint
  if (Utils.getType(point) !== 'SVGPoint') {
    if('x' in point && 'y' in point) {
      point = SvgUtils.createSVGPoint(this.svg, point.x, point.y)
    } else {
      throw new Error('Given point is invalid')
    }
  }

  this.zoomAtPoint(scale, point, absolute, namespace)
}

/**
 * Get zoom scale
 *
 * @return {Float} zoom scale
 */
SvgPanZoom.prototype.getZoom = function() {
  return this.viewport.getZoom()
}

/**
 * Get zoom scale for public usage
 *
 * @return {Float} zoom scale
 */
SvgPanZoom.prototype.getRelativeZoom = function() {
  return this.viewport.getRelativeZoom()
}

/**
 * Compute actual zoom from public zoom
 *
 * @param  {Float} zoom
 * @return {Float} zoom scale
 */
SvgPanZoom.prototype.computeFromRelativeZoom = function(zoom) {
  return zoom * this.viewport.getOriginalState().zoom
}

/**
 * Set zoom to initial state
 */
SvgPanZoom.prototype.resetZoom = function(namespace) {
  var originalState = this.viewport.getOriginalState()

  this.zoom(originalState.zoom, true, namespace);
}

/**
 * Set pan to initial state
 */
SvgPanZoom.prototype.resetPan = function(namespace) {
  this.pan(this.viewport.getOriginalState(), namespace);
}

/**
 * Set pan and zoom to initial state
 */
SvgPanZoom.prototype.reset = function(namespace) {
  this.resetZoom(namespace)
  this.resetPan(namespace)
}

/**
 * Update content cached BorderBox
 * Use when viewport contents change
 */
SvgPanZoom.prototype.updateBBox = function() {
  this.viewport.recacheViewBox()
}

/**
 * Pan to a rendered position
 *
 * @param  {Object} point {x: 0, y: 0}
 * @param  {String} namespace Method namespace
 */
SvgPanZoom.prototype.pan = function(point, namespace) {
  var viewportCTM = this.viewport.getCTM()
  viewportCTM.e = point.x
  viewportCTM.f = point.y
  this.viewport.setCTM(viewportCTM, namespace)
}

/**
 * Relatively pan the graph by a specified rendered position vector
 *
 * @param  {Object} point {x: 0, y: 0}
 * @param  {String} namespace Method namespace
 */
SvgPanZoom.prototype.panBy = function(point, namespace) {
  var viewportCTM = this.viewport.getCTM()
  viewportCTM.e += point.x
  viewportCTM.f += point.y
  this.viewport.setCTM(viewportCTM, namespace)
}

/**
 * Get pan vector
 *
 * @return {Object} {x: 0, y: 0}
 */
SvgPanZoom.prototype.getPan = function() {
  var state = this.viewport.getState()

  return {x: state.x, y: state.y}
}

/**
 * Recalculates cached svg dimensions and controls position
 */
SvgPanZoom.prototype.resize = function() {
  // Get dimensions
  var boundingClientRectNormalized = SvgUtils.getBoundingClientRectNormalized(this.svg)
  this.width = boundingClientRectNormalized.width
  this.height = boundingClientRectNormalized.height
}

/**
 * Unbind mouse events, free callbacks and destroy public instance
 */
SvgPanZoom.prototype.destroy = function() {
  var that = this

  this.trigger('before:destroy', null)

  // Remove all plugins
  while (this.plugins.length) {
    this.removePlugin(this.plugins[0].name)
  }

  // Reset zoom and pan
  this.reset()

  // Remove all events
  this.events = {}

  // Remove instance from instancesStore
  instancesStore = instancesStore.filter(function(instance){
    return instance.svg !== that.svg
  })

  // Delete options and its contents
  delete this.options

  // Destroy public instance and getPublicApi method
  delete this.publicApi
  delete this.getPublicApi
}

/**
 * Returns a public API object
 *
 * @return {Object} Public API object
 */
SvgPanZoom.prototype.getPublicApi = function() {
  // Cache
  if (!this.publicApi) {
    this.publicApi = Api.createApi(this, '__user')
  }

  return this.publicApi
}

/**
 * Keeps all plugins
 *
 * @type {Object}
 */
SvgPanZoom.prototype.pluginsStore = {}

/**
 * Stores pairs of instances of SvgPanZoom and SVG
 * Each pair is represented by an object {svg: SVGSVGElement, instance: SvgPanZoom}
 *
 * @type {Array}
 */
var instancesStore = []

var svgPanZoom = function(elementOrSelector, options){
  var svg = Utils.getSvg(elementOrSelector)

  if (svg === null) {
    return null
  } else {
    // Look for existent instance
    for(var i = instancesStore.length - 1; i >= 0; i--) {
      if (instancesStore[i].svg === svg) {
        return instancesStore[i].instance.getPublicApi()
      }
    }

    // If instance not found - create one
    instancesStore.push({
      svg: svg
    , instance: new SvgPanZoom(svg, options)
    })

    // Return just pushed instance
    return instancesStore[instancesStore.length - 1].instance.getPublicApi()
  }
}

/**
 * Register a plugin
 *
 * @param  {String}   name Plugin name
 * @param  {Function} fn   Plugin function that returns plugin instance
 */
svgPanZoom.register = function(name, fn) {
  if (name.indexOf('__') === 0) {
    throw new Error('Plugin name can\'t start with __')
  } else {
    SvgPanZoom.prototype.pluginsStore[name] = fn
  }
}

/**
 * Deregister a plugin
 *
 * @param  {String} name Plugin name
 */
svgPanZoom.deregister = function(name) {
  if (name in SvgPanZoom.prototype.pluginsStore) {
    // Go through each instance and remove this pugin
    for (var i in instancesStore) {
      instancesStore[i].instance.removePlugin(name)
    }

    delete SvgPanZoom.prototype.pluginsStore[name]
  }
}

module.exports = svgPanZoom;
