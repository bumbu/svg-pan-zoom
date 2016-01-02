var Utils = require('./utilities')
  , SvgUtils = require('./svg-utilities')
  , ShadowViewport = require('./shadow-viewport')
  , SvgPanZoomEvent = require('./event')

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
SvgPanZoom.prototype.trigger = function(name, data, originalEvent) {
  var event

  // Only if there are listening events
  if (name in this.events && this.events[name].length) {
    // Create event
    event = SvgPanZoomEvent.create(data, originalEvent)


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
    var pluginApi = this.getPluginApi(name)

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
 */
SvgPanZoom.prototype.zoomAtPoint = function(zoomScale, point, zoomAbsolute) {
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
    this.viewport.setCTM(newCTM)
  }
}

/**
 * Zoom at center point
 *
 * @param  {Float} scale
 * @param  {Boolean} absolute Marks zoom scale as relative or absolute
 */
SvgPanZoom.prototype.zoom = function(scale, absolute) {
  this.zoomAtPoint(scale, SvgUtils.getSvgCenterPoint(this.svg, this.width, this.height), absolute)
}

/**
 * Zoom used by public instance
 *
 * @param  {Float} scale
 * @param  {Boolean} absolute Marks zoom scale as relative or absolute
 */
SvgPanZoom.prototype.publicZoom = function(scale, absolute) {
  if (absolute) {
    scale = this.computeFromRelativeZoom(scale)
  }

  this.zoom(scale, absolute)
}

/**
 * Zoom at point used by public instance
 *
 * @param  {Float} scale
 * @param  {SVGPoint|Object} point    An object that has x and y attributes
 * @param  {Boolean} absolute Marks zoom scale as relative or absolute
 */
SvgPanZoom.prototype.publicZoomAtPoint = function(scale, point, absolute) {
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

  this.zoomAtPoint(scale, point, absolute)
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
SvgPanZoom.prototype.resetZoom = function() {
  var originalState = this.viewport.getOriginalState()

  this.zoom(originalState.zoom, true);
}

/**
 * Set pan to initial state
 */
SvgPanZoom.prototype.resetPan = function() {
  this.pan(this.viewport.getOriginalState());
}

/**
 * Set pan and zoom to initial state
 */
SvgPanZoom.prototype.reset = function() {
  this.resetZoom()
  this.resetPan()
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
 */
SvgPanZoom.prototype.pan = function(point) {
  var viewportCTM = this.viewport.getCTM()
  viewportCTM.e = point.x
  viewportCTM.f = point.y
  this.viewport.setCTM(viewportCTM)
}

/**
 * Relatively pan the graph by a specified rendered position vector
 *
 * @param  {Object} point {x: 0, y: 0}
 */
SvgPanZoom.prototype.panBy = function(point) {
  var viewportCTM = this.viewport.getCTM()
  viewportCTM.e += point.x
  viewportCTM.f += point.y
  this.viewport.setCTM(viewportCTM)
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

  // Remove all plugins
  while (this.plugins.length) {
    this.removePlugin(this.plugins[0].name)
  }

  // Unbind eventListeners
  for (var event in this.eventListeners) {
    (this.options.eventsListenerElement || this.svg)
      .removeEventListener(event, this.eventListeners[event], false)
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

  // Destroy public instance and rewrite getPublicApi
  delete this.publicApi
  delete this.pi
  this.getPublicApi = function(){
    return null
  }
}

/**
 * Returns a public API object
 *
 * @return {Object} Public API object
 */
SvgPanZoom.prototype.getPublicApi = function() {
  var that = this

  // Create cache
  if (!this.publicApi) {
    this.publicApi = this.pi = {
      // Pan
      pan: function(point) {that.pan(point); return that.pi}
    , panBy: function(point) {that.panBy(point); return that.pi}
    , getPan: function() {return that.getPan()}
      // Zooming
    , zoom: function(scale) {that.publicZoom(scale, true); return that.pi}
    , zoomBy: function(scale) {that.publicZoom(scale, false); return that.pi}
    , zoomAtPoint: function(scale, point) {that.publicZoomAtPoint(scale, point, true); return that.pi}
    , zoomAtPointBy: function(scale, point) {that.publicZoomAtPoint(scale, point, false); return that.pi}
    , getZoom: function() {return that.getRelativeZoom()}
      // Reset
    , resetZoom: function() {that.resetZoom(); return that.pi}
    , resetPan: function() {that.resetPan(); return that.pi}
    , reset: function() {that.reset(); return that.pi}
      // Size and Resize
    , updateBBox: function() {that.updateBBox(); return that.pi}
    , resize: function() {that.resize(); return that.pi}
    , getSizes: function() {
        return {
          width: that.width
        , height: that.height
        , realZoom: that.getZoom()
        , viewBox: that.viewport.getViewBox()
        }
      }
      // Events handling
    , on: function(name, fn, ctx) {
        if (typeof ctx === 'undefined') ctx = that.pi // Automatically inject public context
        that.on(name, fn, ctx, '__user')
        return that.pi
      }
    , off: function(name, fn, ctx) {that.off(name, fn, ctx, '__user'); return that.pi}
    , trigger: function(name, data, oE) {return that.trigger(name, data, oE)}
      // Plugins
    , addPlugin: function(name) {that.addPlugin(name); return that.pi}
    , removePlugin: function(name) {that.removePlugin(name); return that.pi}
      // Destroy
    , destroy: function() {that.destroy(); return that.pi}
    }
  }

  return this.publicApi
}

/**
 * Creates similar to public API but namespaced to given plugin
 *
 * @param  {[type]} pluginName [description]
 * @return {[type]}            [description]
 */
SvgPanZoom.prototype.getPluginApi = function(pluginName) {
  var publicApi = this.getPublicApi()
    , that = this

  // Same API as for public use but with slight differences
  var pluginApi = Object.create(publicApi)

  pluginApi.on = function(name, fn, ctx) {
    if (typeof ctx === 'undefined') ctx = pluginApi // Automatically inject plugin context
    that.on(name, fn, ctx, pluginName)
    return pluginApi
  }
  pluginApi.off = function(name, fn, ctx) {that.off(name, fn, ctx, pluginName); return pluginApi}

  return pluginApi
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
