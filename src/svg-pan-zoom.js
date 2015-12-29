var Wheel = require('./uniwheel')
, ControlIcons = require('./control-icons')
, Utils = require('./utilities')
, SvgUtils = require('./svg-utilities')
, ShadowViewport = require('./shadow-viewport')

var SvgPanZoom = function(svg, options) {
  this.init(svg, options)
}

var optionsDefaults = {
  viewportSelector: '.svg-pan-zoom_viewport' // Viewport selector. Can be querySelector string or SVGElement
, panEnabled: true // enable or disable panning (default enabled)
, controlIconsEnabled: false // insert icons to give user an option in addition to mouse events to control pan/zoom (default disabled)
, zoomEnabled: true // enable or disable zooming (default enabled)
, dblClickZoomEnabled: true // enable or disable zooming by double clicking (default enabled)
, mouseWheelZoomEnabled: true // enable or disable zooming by mouse wheel (default enabled)
, preventMouseEventsDefault: true // enable or disable preventDefault for mouse events
, zoomScaleSensitivity: 0.1 // Zoom sensitivity
, minZoom: 0.5 // Minimum Zoom level
, maxZoom: 10 // Maximum Zoom level
, fit: true // enable or disable viewport fit in SVG (default true)
, contain: false // enable or disable viewport contain the svg (default false)
, center: true // enable or disable viewport centering in SVG (default true)
, refreshRate: 'auto' // Maximum number of frames per second (altering SVG's viewport)
, customEventsHandler: null
, eventsListenerElement: null
, plugins: null
}

SvgPanZoom.prototype.init = function(svg, options) {
  var that = this

  this.svg = svg
  this.defs = svg.querySelector('defs')

  // Add default attributes to SVG
  SvgUtils.setupSvgAttributes(this.svg)

  // Set options
  this.options = Utils.extend(Utils.extend({}, optionsDefaults), options)

  // Init events
  this.initEvents()

  // Init plugins
  this.initPlugins()

  // Set default state
  this.state = 'none'

  // Get dimensions
  var boundingClientRectNormalized = SvgUtils.getBoundingClientRectNormalized(svg)
  this.width = boundingClientRectNormalized.width
  this.height = boundingClientRectNormalized.height

  // Init shadow viewport
  this.viewport = ShadowViewport(SvgUtils.getOrCreateViewport(this.svg, this.options.viewportSelector), {
    svg: this.svg
  , width: this.width
  , height: this.height
  , fit: this.options.fit
  , contain: this.options.contain
  , center: this.options.center
  , refreshRate: this.options.refreshRate
  , trigger: Utils.proxy(this.trigger, this)
  })

  if (this.options.controlIconsEnabled) {
    ControlIcons.enable(this)
  }

  // Init events handlers
  this.lastMouseWheelEventTime = Date.now()
  this.setupHandlers()
}

/**
 * Init events and middlewares
 */
SvgPanZoom.prototype.initEvents = function() {
  this.events = {}
  this.middlewares = {}
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
 */
SvgPanZoom.prototype.trigger = function(name) {
  // console.log('event:', name)
  var arg = Array.prototype.slice.call(arguments, 1)

  if (name in this.events) {
    for (var i = 0; i < this.events[name].length; i++) {
      this.events[name][i].fn.apply(this.events[name][i].ctx, arg)
    }
  }
}

SvgPanZoom.prototype.use = function(name, fn, ctx, pluginName) {

}

SvgPanZoom.prototype.unuse = function(name, fn, ctx, pluginName) {

}

SvgPanZoom.prototype.through = function(name, evt, cb) {

}

/**
 * Init plugins
 */
SvgPanZoom.prototype.initPlugins = function() {
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
 * Add plugin
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
 * Remove all plugins with a given name
 *
 * @param {String} name Plugin name
 */
SvgPanZoom.prototype.removePlugin = function(name) {
  var i, event

  this.trigger('before:plugin:remove', name)

  // Remove all events of this plugin
  for (event in this.events) {
    this.off(event, null, null, name)
  }

  // TODO Remove middlewares

  for (i = this.plugins.length - 1; i >= 0; i--) {
    if (this.plugins[i].name === name) {
      this.plugins.splice(i, 1)
    }
  }

  this.trigger('plugin:remove', name)
}

/**
 * Register event handlers
 */
SvgPanZoom.prototype.setupHandlers = function() {
  var that = this
    , prevEvt = null // use for touchstart event to detect double tap
    ;

  this.eventListeners = {
    // Mouse down group
    mousedown: function(evt) {
      return that.handleMouseDown(evt, null);
    }
  , touchstart: function(evt) {
      var result = that.handleMouseDown(evt, prevEvt);
      prevEvt = evt
      return result;
    }

    // Mouse up group
  , mouseup: function(evt) {
      return that.handleMouseUp(evt);
    }
  , touchend: function(evt) {
      return that.handleMouseUp(evt);
    }

    // Mouse move group
  , mousemove: function(evt) {
      return that.handleMouseMove(evt);
    }
  , touchmove: function(evt) {
      return that.handleMouseMove(evt);
    }

    // Mouse leave group
  , mouseleave: function(evt) {
      return that.handleMouseUp(evt);
    }
  , touchleave: function(evt) {
      return that.handleMouseUp(evt);
    }
  , touchcancel: function(evt) {
      return that.handleMouseUp(evt);
    }
  }

  // Init custom events handler if available
  if (this.options.customEventsHandler != null) { // jshint ignore:line
    this.options.customEventsHandler.init({
      svgElement: this.svg
    , eventsListenerElement: this.options.eventsListenerElement
    , instance: this.getPublicApi()
    })

    // Custom event handler may halt builtin listeners
    var haltEventListeners = this.options.customEventsHandler.haltEventListeners
    if (haltEventListeners && haltEventListeners.length) {
      for (var i = haltEventListeners.length - 1; i >= 0; i--) {
        if (this.eventListeners.hasOwnProperty(haltEventListeners[i])) {
          delete this.eventListeners[haltEventListeners[i]]
        }
      }
    }
  }

  // Bind eventListeners
  for (var event in this.eventListeners) {
    // Attach event to eventsListenerElement or SVG if not available
    (this.options.eventsListenerElement || this.svg)
      .addEventListener(event, this.eventListeners[event], false)
  }

  // Zoom using mouse wheel
  if (this.options.mouseWheelZoomEnabled) {
    this.options.mouseWheelZoomEnabled = false // set to false as enable will set it back to true
    this.enableMouseWheelZoom()
  }
}

/**
 * Enable ability to zoom using mouse wheel
 */
SvgPanZoom.prototype.enableMouseWheelZoom = function() {
  if (!this.options.mouseWheelZoomEnabled) {
    var that = this

    // Mouse wheel listener
    this.wheelListener = function(evt) {
      return that.handleMouseWheel(evt);
    }

    // Bind wheelListener
    Wheel.on(this.options.eventsListenerElement || this.svg, this.wheelListener, false)

    this.options.mouseWheelZoomEnabled = true
  }
}

/**
 * Disable ability to zoom using mouse wheel
 */
SvgPanZoom.prototype.disableMouseWheelZoom = function() {
  if (this.options.mouseWheelZoomEnabled) {
    Wheel.off(this.options.eventsListenerElement || this.svg, this.wheelListener, false)
    this.options.mouseWheelZoomEnabled = false
  }
}

/**
 * Handle mouse wheel event
 *
 * @param  {Event} evt
 */
SvgPanZoom.prototype.handleMouseWheel = function(evt) {
  if (!this.options.zoomEnabled || this.state !== 'none') {
    return;
  }

  if (this.options.preventMouseEventsDefault){
    if (evt.preventDefault) {
      evt.preventDefault();
    } else {
      evt.returnValue = false;
    }
  }

  // Default delta in case that deltaY is not available
  var delta = evt.deltaY || 1
    , timeDelta = Date.now() - this.lastMouseWheelEventTime
    , divider = 3 + Math.max(0, 30 - timeDelta)

  // Update cache
  this.lastMouseWheelEventTime = Date.now()

  // Make empirical adjustments for browsers that give deltaY in pixels (deltaMode=0)
  if ('deltaMode' in evt && evt.deltaMode === 0 && evt.wheelDelta) {
    delta = evt.deltaY === 0 ? 0 :  Math.abs(evt.wheelDelta) / evt.deltaY
  }

  delta = -0.3 < delta && delta < 0.3 ? delta : (delta > 0 ? 1 : -1) * Math.log(Math.abs(delta) + 10) / divider

  var inversedScreenCTM = this.svg.getScreenCTM().inverse()
    , relativeMousePoint = SvgUtils.getEventPoint(evt, this.svg).matrixTransform(inversedScreenCTM)
    , zoom = Math.pow(1 + this.options.zoomScaleSensitivity, (-1) * delta); // multiplying by neg. 1 so as to make zoom in/out behavior match Google maps behavior

  this.zoomAtPoint(zoom, relativeMousePoint)
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

  if (!zoomAbsolute) {
    // Fit zoomScale in set bounds
    if (this.getZoom() * zoomScale < this.options.minZoom * originalState.zoom) {
      zoomScale = (this.options.minZoom * originalState.zoom) / this.getZoom()
    } else if (this.getZoom() * zoomScale > this.options.maxZoom * originalState.zoom) {
      zoomScale = (this.options.maxZoom * originalState.zoom) / this.getZoom()
    }
  } else {
    // Fit zoomScale in set bounds
    zoomScale = Math.max(this.options.minZoom * originalState.zoom, Math.min(this.options.maxZoom * originalState.zoom, zoomScale))
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
 * Handle double click event
 * See handleMouseDown() for alternate detection method
 *
 * @param {Event} evt
 */
SvgPanZoom.prototype.handleDblClick = function(evt) {
  if (this.options.preventMouseEventsDefault) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }
  }

  // Check if target was a control button
  if (this.options.controlIconsEnabled) {
    var targetClass = evt.target.getAttribute('class') || ''
    if (targetClass.indexOf('svg-pan-zoom-control') > -1) {
      return false
    }
  }

  var zoomFactor

  if (evt.shiftKey) {
    zoomFactor = 1/((1 + this.options.zoomScaleSensitivity) * 2) // zoom out when shift key pressed
  } else {
    zoomFactor = (1 + this.options.zoomScaleSensitivity) * 2
  }

  var point = SvgUtils.getEventPoint(evt, this.svg).matrixTransform(this.svg.getScreenCTM().inverse())
  this.zoomAtPoint(zoomFactor, point)
}

/**
 * Handle click event
 *
 * @param {Event} evt
 */
SvgPanZoom.prototype.handleMouseDown = function(evt, prevEvt) {
  if (this.options.preventMouseEventsDefault) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }
  }

  Utils.mouseAndTouchNormalize(evt, this.svg)

  // Double click detection; more consistent than ondblclick
  if (this.options.dblClickZoomEnabled && Utils.isDblClick(evt, prevEvt)){
    this.handleDblClick(evt)
  } else {
    // Pan mode
    this.state = 'pan'
    this.firstEventCTM = this.viewport.getCTM()
    this.stateOrigin = SvgUtils.getEventPoint(evt, this.svg).matrixTransform(this.firstEventCTM.inverse())
  }
}

/**
 * Handle mouse move event
 *
 * @param  {Event} evt
 */
SvgPanZoom.prototype.handleMouseMove = function(evt) {
  if (this.options.preventMouseEventsDefault) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }
  }

  if (this.state === 'pan' && this.options.panEnabled) {
    // Pan mode
    var point = SvgUtils.getEventPoint(evt, this.svg).matrixTransform(this.firstEventCTM.inverse())
      , viewportCTM = this.firstEventCTM.translate(point.x - this.stateOrigin.x, point.y - this.stateOrigin.y)

    this.viewport.setCTM(viewportCTM)
  }
}

/**
 * Handle mouse button release event
 *
 * @param {Event} evt
 */
SvgPanZoom.prototype.handleMouseUp = function(evt) {
  if (this.options.preventMouseEventsDefault) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }
  }

  if (this.state === 'pan') {
    // Quit pan mode
    this.state = 'none'
  }
}

/**
 * Adjust viewport size (only) so it will fit in SVG
 * Does not center image
 */
SvgPanZoom.prototype.fit = function() {
  var viewBox = this.viewport.getViewBox()
    , newScale = Math.min(this.width/viewBox.width, this.height/viewBox.height)

  this.zoom(newScale, true)
}

/**
 * Adjust viewport size (only) so it will contain the SVG
 * Does not center image
 */
SvgPanZoom.prototype.contain = function() {
  var viewBox = this.viewport.getViewBox()
    , newScale = Math.max(this.width/viewBox.width, this.height/viewBox.height)

  this.zoom(newScale, true)
}

/**
 * Adjust viewport pan (only) so it will be centered in SVG
 * Does not zoom/fit/contain image
 */
SvgPanZoom.prototype.center = function() {
  var viewBox = this.viewport.getViewBox()
    , offsetX = (this.width - (viewBox.width + viewBox.x * 2) * this.getZoom()) * 0.5
    , offsetY = (this.height - (viewBox.height + viewBox.y * 2) * this.getZoom()) * 0.5

  this.getPublicApi().pan({x: offsetX, y: offsetY})
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

  // Reposition control icons by re-enabling them
  if (this.options.controlIconsEnabled) {
    this.getPublicApi().disableControlIcons()
    this.getPublicApi().enableControlIcons()
  }
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

  // Destroy custom event handlers
  if (this.options.customEventsHandler != null) { // jshint ignore:line
    this.options.customEventsHandler.destroy({
      svgElement: this.svg
    , eventsListenerElement: this.options.eventsListenerElement
    , instance: this.getPublicApi()
    })
  }

  // Unbind eventListeners
  for (var event in this.eventListeners) {
    (this.options.eventsListenerElement || this.svg)
      .removeEventListener(event, this.eventListeners[event], false)
  }

  // Unbind wheelListener
  this.disableMouseWheelZoom()

  // Remove control icons
  this.getPublicApi().disableControlIcons()

  // Reset zoom and pan
  this.reset()

  // Remove all events
  this.events = {}

  // TODO unhook middlewares

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
      enablePan: function() {that.options.panEnabled = true; return that.pi}
    , disablePan: function() {that.options.panEnabled = false; return that.pi}
    , isPanEnabled: function() {return !!that.options.panEnabled}
    , pan: function(point) {that.pan(point); return that.pi}
    , panBy: function(point) {that.panBy(point); return that.pi}
    , getPan: function() {return that.getPan()}
      // Zoom and Control Icons
    , enableZoom: function() {that.options.zoomEnabled = true; return that.pi}
    , disableZoom: function() {that.options.zoomEnabled = false; return that.pi}
    , isZoomEnabled: function() {return !!that.options.zoomEnabled}
    , enableControlIcons: function() {
        if (!that.options.controlIconsEnabled) {
          that.options.controlIconsEnabled = true
          ControlIcons.enable(that)
        }
        return that.pi
      }
    , disableControlIcons: function() {
        if (that.options.controlIconsEnabled) {
          that.options.controlIconsEnabled = false;
          ControlIcons.disable(that)
        }
        return that.pi
      }
    , isControlIconsEnabled: function() {return !!that.options.controlIconsEnabled}
      // Double click zoom
    , enableDblClickZoom: function() {that.options.dblClickZoomEnabled = true; return that.pi}
    , disableDblClickZoom: function() {that.options.dblClickZoomEnabled = false; return that.pi}
    , isDblClickZoomEnabled: function() {return !!that.options.dblClickZoomEnabled}
      // Mouse wheel zoom
    , enableMouseWheelZoom: function() {that.enableMouseWheelZoom(); return that.pi}
    , disableMouseWheelZoom: function() {that.disableMouseWheelZoom(); return that.pi}
    , isMouseWheelZoomEnabled: function() {return !!that.options.mouseWheelZoomEnabled}
      // Zoom scale and bounds
    , setZoomScaleSensitivity: function(scale) {that.options.zoomScaleSensitivity = scale; return that.pi}
    , setMinZoom: function(zoom) {that.options.minZoom = zoom; return that.pi}
    , setMaxZoom: function(zoom) {that.options.maxZoom = zoom; return that.pi}
      // Zooming
    , zoom: function(scale) {that.publicZoom(scale, true); return that.pi}
    , zoomBy: function(scale) {that.publicZoom(scale, false); return that.pi}
    , zoomAtPoint: function(scale, point) {that.publicZoomAtPoint(scale, point, true); return that.pi}
    , zoomAtPointBy: function(scale, point) {that.publicZoomAtPoint(scale, point, false); return that.pi}
    , zoomIn: function() {this.zoomBy(1 + that.options.zoomScaleSensitivity); return that.pi}
    , zoomOut: function() {this.zoomBy(1 / (1 + that.options.zoomScaleSensitivity)); return that.pi}
    , getZoom: function() {return that.getRelativeZoom()}
      // Reset
    , resetZoom: function() {that.resetZoom(); return that.pi}
    , resetPan: function() {that.resetPan(); return that.pi}
    , reset: function() {that.reset(); return that.pi}
      // Fit, Contain and Center
    , fit: function() {that.fit(); return that.pi}
    , contain: function() {that.contain(); return that.pi}
    , center: function() {that.center(); return that.pi}
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
      // Plugins
    , addPlugin: function(name) {that.addPlugin(name); return that.pi}
    , removePlugin: function(name) {that.removePlugin(name); return that.pi}
      // Destroy
    , destroy: function() {that.destroy(); return that.pi}
      // Events handling
    , on: function(name, fn, ctx) {
        if (typeof ctx === 'undefined') ctx = that.pi // Automatically inject public context
        that.on(name, fn, ctx, '__user')
        return that.pi
      }
    , off: function(name, fn, ctx) {that.off(name, fn, ctx, '__user'); return that.pi}
    , use: function(name, fn, ctx) {that.use(name, fn, ctx, '__user'); return that.pi}
    , unuse: function(name, fn, ctx) {that.unuse(name, fn, ctx, '__user'); return that.pi}
    }
  }

  return this.publicApi
}

SvgPanZoom.prototype.getPluginApi = function(pluginName) {
  var publicApi = this.getPublicApi()
    , that = this

  // Same API as for public use but with slight differences
  var pluginApi = Object.create(publicApi)
  pluginApi.on = function(name, fn, ctx) {
    if (typeof ctx === 'undefined') ctx = publicApi // Automatically inject plugin context
    that.on(name, fn, ctx, pluginName)
    return pluginApi
  }
  pluginApi.off = function(name, fn, ctx) {that.off(name, fn, ctx, pluginName); return pluginApi}
  pluginApi.use = function(name, fn, ctx) {that.use(name, fn, ctx, pluginName); return pluginApi}
  pluginApi.unuse = function(name, fn, ctx) {that.unuse(name, fn, ctx, pluginName); return pluginApi}

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
