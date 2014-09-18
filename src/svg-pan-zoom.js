var Mousewheel = require('./mousewheel')  // Keep it here so that mousewheel is initialised
, ControlIcons = require('./control-icons')
, Utils = require('./utilities')
, SvgUtils = require('./svg-utilities')
, ShadowViewport = require('./shadow-viewport')

var SvgPanZoom = function(svg, options) {
  this.init(svg, options)
}

var optionsDefaults = {
  panEnabled: true // enable or disable panning (default enabled)
, controlIconsEnabled: false // insert icons to give user an option in addition to mouse events to control pan/zoom (default disabled)
, zoomEnabled: true // enable or disable zooming (default enabled)
, dblClickZoomEnabled: true // enable or disable zooming by double clicking (default enabled)
, zoomScaleSensitivity: 0.2 // Zoom sensitivity
, minZoom: 0.5 // Minimum Zoom level
, maxZoom: 10 // Maximum Zoom level
, fit: true // enable or disable viewport fit in SVG (default true)
, center: true // enable or disable viewport centering in SVG (default true)
, beforeZoom: null
, onZoom: function(){}
, beforePan: null
, onPan: function(){}
, refreshRate: 60 // in hz
}

SvgPanZoom.prototype.init = function(svg, options) {
  this.xmlNS = 'http://www.w3.org/XML/1998/namespace';
  this.svgNS = 'http://www.w3.org/2000/svg';
  this.xmlnsNS = 'http://www.w3.org/2000/xmlns/';
  this.xlinkNS = 'http://www.w3.org/1999/xlink';
  this.evNS = 'http://www.w3.org/2001/xml-events';

  this.svg = svg
  this.defs = svg.querySelector('defs')

  // Add default attributes to SVG
  SvgUtils.setupSvgAttributes(this.svg)

  // Set options
  this.options = Utils.extend(Utils.extend({}, optionsDefaults), options)
  SvgUtils.refreshRate = this.options.refreshRate;

  // Set default state
  this.state = 'none'

  // Get dimensions
  var boundingClientRectNormalized = SvgUtils.getBoundingClientRectNormalized(svg)
  this.width = boundingClientRectNormalized.width
  this.height = boundingClientRectNormalized.height

  // Init shadow viewport
  this.viewport = ShadowViewport(SvgUtils.getOrCreateViewport(this.svg), {
    svg: this.svg
  , width: this.width
  , height: this.height
  , fit: this.options.fit
  })

  if (this.options.center) {
    this.center()
  }

  if (this.options.controlIconsEnabled) {
    ControlIcons.enable(this)
  }

  // Init events handlers
  this.setupHandlers()
}

/**
 * Register event handlers
 */
SvgPanZoom.prototype.setupHandlers = function() {
  var that = this
    , prevEvt = null // use for touchstart event to detect double tap
    ;

  // Mouse down group
  this.svg.addEventListener("mousedown", function(evt) {
    return that.handleMouseDown(evt, null);
  }, false);
  this.svg.addEventListener("touchstart", function(evt) {
    var result = that.handleMouseDown(evt, prevEvt);
    prevEvt = evt
    return result;
  }, false);

  // Mouse up group
  this.svg.addEventListener("mouseup", function(evt) {
    return that.handleMouseUp(evt);
  }, false);
  this.svg.addEventListener("touchend", function(evt) {
    return that.handleMouseUp(evt);
  }, false);

  // Mouse move group
  this.svg.addEventListener("mousemove", function(evt) {
    return that.handleMouseMove(evt);
  }, false);
  this.svg.addEventListener("touchmove", function(evt) {
    return that.handleMouseMove(evt);
  }, false);

  // Mouse leave group
  this.svg.addEventListener("mouseleave", function(evt) {
    return that.handleMouseUp(evt);
  }, false);
  this.svg.addEventListener("touchleave", function(evt) {
    return that.handleMouseUp(evt);
  }, false);
  this.svg.addEventListener("touchcancel", function(evt) {
    return that.handleMouseUp(evt);
  }, false);

  // Mouse wheel listener
  window.addWheelListener(this.svg, function(evt) {
    return that.handleMouseWheel(evt);
  })
}

/**
 * Handle mouse wheel event
 *
 * @param  {Event} evt
 */
SvgPanZoom.prototype.handleMouseWheel = function(evt) {
  if (!this.options.zoomEnabled) {
    return;
  }

  if (evt.preventDefault) {
    evt.preventDefault();
  } else {
    evt.returnValue = false;
  }

  var delta = 0

  if ('deltaMode' in evt && evt.deltaMode === 0) {
    // Make empirical adjustments for browsers that give deltaY in pixels (deltaMode=0)

    if (evt.wheelDelta) {
      // Normalizer for Chrome
      delta = evt.deltaY / Math.abs(evt.wheelDelta/3)
    } else {
      // Others. Possibly tablets? Use a value just in case
      delta = evt.deltaY / 120
    }
  } else if ('mozPressure' in evt) {
    // Normalizer for newer Firefox
    // NOTE: May need to change detection at some point if mozPressure disappears.
    delta = evt.deltaY / 3;
  } else {
    // Others should be reasonably normalized by the mousewheel code at the end of the file.
    delta = evt.deltaY;
  }

  var inversedScreenCTM = this.svg.getScreenCTM().inverse()
    , relativeMousePoint = SvgUtils.getEventPoint(evt, this.svg).matrixTransform(inversedScreenCTM)
    , zoom = Math.pow(1 + this.options.zoomScaleSensitivity, (-1) * delta); // multiplying by neg. 1 so as to make zoom in/out behavior match Google maps behavior

  this.zoomAtPoint(relativeMousePoint, zoom)
}

/**
 * Zoom in at an SVG point
 *
 * @param  {SVGPoint} point
 * @param  {Float} zoomScale    Number representing how much to zoom
 * @param  {Boolean} zoomAbsolute Default false. If true, zoomScale is treated as an absolute value.
 *                                Otherwise, zoomScale is treated as a multiplied (e.g. 1.10 would zoom in 10%)
 */
SvgPanZoom.prototype.zoomAtPoint = function(point, zoomScale, zoomAbsolute) {
  if (Utils.isFunction(this.options.beforeZoom)) {
    this.options.beforeZoom()
  }

  var originalState = this.viewport.getOriginalState()

  // Fit zoomScale in set bounds
  if (this.getZoom() * zoomScale < this.options.minZoom * originalState.zoom) {
    zoomScale = (this.options.minZoom * originalState.zoom) / this.getZoom()
  } else if (this.getZoom() * zoomScale > this.options.maxZoom * originalState.zoom) {
    zoomScale = (this.options.maxZoom * originalState.zoom) / this.getZoom()
  }

  var oldCTM = this.viewport.getCTM()
    , relativePoint = point.matrixTransform(oldCTM.inverse())
    , modifier = this.svg.createSVGMatrix().translate(relativePoint.x, relativePoint.y).scale(zoomScale).translate(-relativePoint.x, -relativePoint.y)
    , newCTM = oldCTM.multiply(modifier)

  if (zoomAbsolute) {
    newCTM.a = newCTM.d = zoomScale
  }

  if (newCTM.a !== oldCTM.a) {
    this.viewport.setCTM(newCTM)
  }

  if (this.options.onZoom) {
    this.options.onZoom(this.viewport.getZoom())
  }
}

/**
 * Zoom at point used by public instance
 *
 * @param  {Float} scale
 * @param  {SVGPoint|Object} point    An object that has x and y attributes
 * @param  {Boolean} absolute Marks zoom as relative or absolute
 */
SvgPanZoom.prototype.publicZoomAtPoint = function(scale, point, absolute) {
  // If not a SVGPoint but has x and y than create a SVGPoint
  if (Utils.getType(point) !== 'SVGPoint' && 'x' in point && 'y' in point) {
    point = SvgUtils.createSVGPoint(this.svg, point.x, point.y)
  } else {
    throw new Error('Given point is invalid')
    return
  }

  this.zoomAtPoint(point, scale, absolute)
}

/**
 * Get zoom scale/level
 *
 * @return {Float} zoom scale
 */
SvgPanZoom.prototype.getZoom = function() {
  return this.viewport.getZoom()
}

/**
 * Set zoom to initial state
 */
SvgPanZoom.prototype.resetZoom = function() {
  var publicInstance = this.getPublicInstance()
    , originalState = this.viewport.getOriginalState()

  publicInstance.zoom(originalState.zoom);

  if (this.options.center) {
    publicInstance.pan(originalState)
  }
}

/**
 * Handle double click event
 * See handleMouseDown() for alternate detection method
 *
 * @param {Event} evt
 */
SvgPanZoom.prototype.handleDblClick = function(evt) {
  if (evt.preventDefault) {
    evt.preventDefault()
  } else {
    evt.returnValue = false
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
  this.zoomAtPoint(point, zoomFactor)
}

/**
 * Handle click event
 *
 * @param {Event} evt
 */
SvgPanZoom.prototype.handleMouseDown = function(evt, prevEvt) {
  if (evt.preventDefault) {
    evt.preventDefault()
  } else {
    evt.returnValue = false
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
  if (evt.preventDefault) {
    evt.preventDefault()
  } else {
    evt.returnValue = false
  }

  if (this.state === 'pan' && this.options.panEnabled) {
    // Trigger beforePan
    if (Utils.isFunction(this.options.beforePan)) {
      this.options.beforePan()
    }

    // Pan mode
    var point = SvgUtils.getEventPoint(evt, this.svg).matrixTransform(this.firstEventCTM.inverse())
      , viewportCTM = this.firstEventCTM.translate(point.x - this.stateOrigin.x, point.y - this.stateOrigin.y)

    this.viewport.setCTM(viewportCTM)

    // Trigger onPan
    this.options.onPan(this.viewport.getState().x, this.viewport.getState().y)
  }
}

/**
 * Handle mouse button release event
 *
 * @param {Event} evt
 */
SvgPanZoom.prototype.handleMouseUp = function(evt) {
  if (evt.preventDefault) {
    evt.preventDefault()
  } else {
    evt.returnValue = false
  }

  if (this.state === 'pan') {
    // Quit pan mode
    this.state = 'none'
  }
}

/**
 * Adjust viewport size (only) so it will fit in SVG
 * Does not center image
 *
 * @param  {Boolean} dropCache drop viewBox cache and recalculate SVG's viewport sizes. Default false
 */
SvgPanZoom.prototype.fit = function(dropCache) {
  if (dropCache) {
    this.viewbox.recacheViewBox()
  }

  var viewBox = this.viewport.getViewBox()
    , newScale = Math.min(this.width/(viewBox.width - viewBox.x), this.height/(viewBox.height - viewBox.y))

  this.getPublicInstance().zoom(newScale)
}

/**
 * Adjust viewport pan (only) so it will be centered in SVG
 * Does not zoom/fit image
 *
 * @param  {Boolean} dropCache drop viewBox cache and recalculate SVG's viewport sizes. Default false
 */
SvgPanZoom.prototype.center = function(dropCache) {
  if (dropCache) {
    this.recacheViewBox()
  }

  var viewBox = this.viewport.getViewBox()
    , offsetX = (this.width - (viewBox.width + viewBox.x) * this.getZoom()) * 0.5
    , offsetY = (this.height - (viewBox.height + viewBox.y) * this.getZoom()) * 0.5

  this.getPublicInstance().pan({x: offsetX, y: offsetY})
}

/**
 * Pan to a rendered position
 *
 * @param  {Object} point {x: 0, y: 0}
 */
SvgPanZoom.prototype.pan = function(point) {
  // Trigger beforePan
  if (Utils.isFunction(this.options.beforePan)) {
    this.options.beforePan()
  }

  var viewportCTM = this.viewport.getCTM()
  viewportCTM.e = point.x
  viewportCTM.f = point.y
  this.viewport.setCTM(viewportCTM)

  // Trigger onPan
  this.options.onPan(this.viewport.getState().x, this.viewport.getState().y)
}

/**
 * Relatively pan the graph by a specified rendered position vector
 *
 * @param  {Object} point {x: 0, y: 0}
 */
SvgPanZoom.prototype.panBy = function(point) {
  // Trigger beforePan
  if (Utils.isFunction(this.options.beforePan)) {
    this.options.beforePan()
  }

  var viewportCTM = this.viewport.getCTM()
  viewportCTM.e += point.x
  viewportCTM.f += point.y
  this.viewport.setCTM(viewportCTM)

  // Trigger onPan
  this.options.onPan(this.viewport.getState().x, this.viewport.getState().y)
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
    this.getPublicInstance().disableControlIcons()
    this.getPublicInstance().enableControlIcons()
  }
}

/**
 * Returns a public instance object
 *
 * @return {Object} Public instance object
 */
SvgPanZoom.prototype.getPublicInstance = function() {
  var that = this

  // Create cache
  if (!this.publicInstance) {
    this.publicInstance = {
      // Pan
      enablePan: function() {that.options.panEnabled = true}
    , disablePan: function() {that.options.panEnabled = false}
    , isPanEnabled: function() {return !!that.options.panEnabled}
    , pan: function(point) {that.pan(point)}
    , panBy: function(point) {that.panBy(point)}
    , getPan: function() {return that.getPan()}
      // Pan event
    , setBeforePan: function(fn) {that.options.beforePan = Utils.proxy(fn, that.publicInstance)}
    , setOnPan: function(fn) {that.options.onPan = Utils.proxy(fn, that.publicInstance)}
      // Zoom and Control Icons
    , enableZoom: function() {
        that.options.zoomEnabled = true;
      }
    , disableZoom: function() {
        that.options.zoomEnabled = false;
      }
    , isZoomEnabled: function() {return !!that.options.zoomEnabled}
    , enableControlIcons: function() {
        if (!that.options.controlIconsEnabled) {
          that.options.controlIconsEnabled = true
          ControlIcons.enable(that)
        }
      }
    , disableControlIcons: function() {
        if (that.options.controlIconsEnabled) {
          that.options.controlIconsEnabled = false;
          ControlIcons.disable(that)
        }
      }
    , isControlIconsEnabled: function() {return !!that.options.controlIconsEnabled}
      // Double click zoom
    , enableDblClickZoom: function() {that.options.dblClickZoomEnabled = true}
    , disableDblClickZoom: function() {that.options.dblClickZoomEnabled = false}
      // Zoom scale and bounds
    , setZoomScaleSensitivity: function(scale) {that.options.zoomScaleSensitivity = scale}
    , setMinZoom: function(zoom) {that.options.minZoom = zoom}
    , setMaxZoom: function(zoom) {that.options.maxZoom = zoom}
      // Zoom event
    , setBeforeZoom: function(fn) {that.options.beforeZoom = Utils.proxy(fn, that.publicInstance)}
    , setOnZoom: function(fn) {that.options.onZoom = Utils.proxy(fn, that.publicInstance)}
      // Zooming
    , zoom: function(scale) {
        that.zoomAtPoint(SvgUtils.getSvgCenterPoint(that.svg), scale, true)
      }
    , zoomBy: function(scale) {
        that.zoomAtPoint(SvgUtils.getSvgCenterPoint(that.svg), scale, false)
      }
    , zoomAtPoint: function(scale, point) {
        that.publicZoomAtPoint(scale, point, true)
      }
    , zoomAtPointBy: function(scale, point) {
        that.publicZoomAtPoint(scale, point, false)
      }
    , zoomIn: function() {
        this.zoomBy(1 + that.options.zoomScaleSensitivity)
      }
    , zoomOut: function() {
        this.zoomBy(1 / (1 + that.options.zoomScaleSensitivity))
      }
    , resetZoom: function() {that.resetZoom()}
    , getZoom: function() {return that.getZoom()}
    , fit: function(dropCache) {return that.fit(dropCache)}
    , center: function(dropCache) {return that.center(dropCache)}
    , resize: function() {that.resize()}
    }
  }

  return this.publicInstance
}

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
        return instancesStore[i].instance.getPublicInstance()
      }
    }

    // If instance not found - create one
    instancesStore.push({
      svg: svg
    , instance: new SvgPanZoom(svg, options)
    })

    // Return just pushed instance
    return instancesStore[instancesStore.length - 1].instance.getPublicInstance()
  }
}

module.exports = svgPanZoom;
