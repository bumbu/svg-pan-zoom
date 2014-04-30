var Mousewheel = require('./mousewheel')  // Keep it here so that mousewheel is initialised
  , ControlIcons = require('./control-icons')
  , Utils = require('./utilities')
  , SvgUtils = require('./svg-utilities')

;(function(window, document){
  'use strict';

  var SvgPanZoom = function(svg, options) {
    this.init(svg, options)
  }

  var optionsDefaults = {
    panEnabled: true // enable or disable panning (default enabled)
  , dragEnabled: false // enable or disable dragging (default disabled)
  , controlIconsEnabled: false // insert icons to give user an option in addition to mouse events to control pan/zoom (default disabled)
  , zoomEnabled: true // enable or disable zooming (default enabled)
  , zoomScaleSensitivity: 0.2 // Zoom sensitivity
  , minZoom: 0.5 // Minimum Zoom level
  , maxZoom: 10 // Maximum Zoom level
  , onZoom: function(){}
  , onPan: function(){}
  }

  SvgPanZoom.prototype.init = function(svg, options) {
    this.svg = svg

    // Set options
    this.options = Utils.extend(Utils.extend({}, optionsDefaults), options)

    // Set default state
    this.state = 'none'

    // Get dimensions
    var dimensions = SvgUtils.getSvgDimensions(svg)
    this.width = dimensions.width
    this.height = dimensions.height

    // Get viewport
    this.viewport = SvgUtils.getOrCreateViewport(svg)

    // Create zoom and pan cache
    this._zoom = 1
    this._pan = {x: 0, y: 0}

    // Sets initialCTM
    this.processCTM()

    if (this.options.controlIconsEnabled && this.options.zoomEnabled) {
      ControlIcons.enable(this)
    }

    // Add default attributes to SVG
    SvgUtils.setupSvgAttributes(this.svg)

    // Init events handlers
    this.setupHandlers()

    // TODO what for do we need this?
    // It is replacing window.svgPanZoom constructor with this instance
    //
    // if (this.svg.ownerDocument.documentElement.tagName.toLowerCase() !== 'svg') {
    //   this.svg.ownerDocument.defaultView.svgPanZoom = this
    // }
  }

  /**
   * Get CTM and save it into initialCTM attribute
   * Parse viewBox and if any update initialCTM based on this values
   */
  SvgPanZoom.prototype.processCTM = function() {
    var svgViewBox = this.svg.getAttribute('viewBox')

    if (svgViewBox) {
      var boundingClientRect = this.svg.getBoundingClientRect()
        , viewBoxValues = svgViewBox.split(' ').map(parseFloat)
        , viewBoxWidth = viewBoxValues[2]
        , viewBoxHeight = viewBoxValues[3]

      this.svg.removeAttribute('viewBox');

      var newCTM = this.viewport.getCTM()
        , newScale = Math.min(this.width/viewBoxWidth, this.height/viewBoxHeight);

      newCTM.a = newCTM.a * newScale; //x-scale
      newCTM.d = newCTM.d * newScale; //y-scale
      newCTM.e = newCTM.e * newScale; //x-transform
      newCTM.f = newCTM.f * newScale; //y-transform
      this.initialCTM = newCTM;

      // Update viewport CTM
      SvgUtils.setCTM(this.viewport, this.initialCTM);
    }
    else {
      this.initialCTM = this.viewport.getCTM();
    }

    // Cache zoom level
    this._zoom = this.initialCTM.a

    // Cache pan level
    this._pan.x = this.initialCTM.e
    this._pan.y = this.initialCTM.f
  }

  /**
   * Register event handlers
   */
  SvgPanZoom.prototype.setupHandlers = function() {
    var that = this

    // Mouse down group
    this.svg.addEventListener("mousedown", function(evt) {
      return that.handleMouseDown(evt);
    }, false);
    this.svg.addEventListener("touchstart", function(evt) {
      return that.handleMouseDown(evt);
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
   * @param  {object} evt Event object
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

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement
      , relativeMousePoint = SvgUtils.getRelativeMousePoint(svg, evt)
      , zoom = Math.pow(1 + this.options.zoomScaleSensitivity, (-1) * delta); // multiplying by neg. 1 so as to make zoom in/out behavior match Google maps behavior

    this.zoomAtPoint(svg, relativeMousePoint, zoom)
  }

  /**
   * Zoom in at an SVG point
   *
   * @param  {object} svg          SVG Element
   * @param  {object} point        SVG Point
   * @param  {float} zoomScale    Number representing how much to zoom
   * @param  {bool} zoomAbsolute [description]
   * @return {[type]}              Default false. If true, zoomScale is treated as an absolute value.
   *                               Otherwise, zoomScale is treated as a multiplied (e.g. 1.10 would zoom in 10%)
   */
  SvgPanZoom.prototype.zoomAtPoint = function(svg, point, zoomScale, zoomAbsolute) {
    var viewportCTM = this.viewport.getCTM()

    point = point.matrixTransform(viewportCTM.inverse())

    var k = svg.createSVGMatrix().translate(point.x, point.y).scale(zoomScale).translate(-point.x, -point.y)
      , wasZoom = viewportCTM
      , setZoom = viewportCTM.multiply(k)

    if (zoomAbsolute) {
      setZoom.a = setZoom.d = zoomScale
    }

    if (setZoom.a < this.options.minZoom * this.initialCTM.a) {setZoom.a = setZoom.d = wasZoom.a}
    if (setZoom.a > this.options.maxZoom * this.initialCTM.a) {setZoom.a = setZoom.d = wasZoom.a}
    if (setZoom.a !== wasZoom.a) {
      SvgUtils.setCTM(this.viewport, setZoom)

      // Cache zoom level
      this._zoom = this.initialCTM.a
    }

    if (!this.stateTf) {
      this.stateTf = setZoom.inverse()
    }

    this.stateTf = this.stateTf.multiply(k.inverse())

    if (this.options.onZoom) {
      this.options.onZoom(setZoom.a)
    }
  }

  SvgPanZoom.prototype.publicZoomAtPoint = function(scale, point, absolute) {
    // If not a SVGPoint but has x and y than create new point
    if (Utils.getType(point) !== 'SVGPoint' && 'x' in point && 'y' in point) {
      var _point = this.svg.createSVGPoint()
      _point.x = point.x
      _point.y = point.y
      point = _point
    } else {
      throw new Error('Given point is invalid')
      return
    }

    this.zoomAtPoint(this.svg, point, scale, absolute)
  }

  /**
   * Get zoom scale/level
   *
   * @return {float} zoom scale
   */
  SvgPanZoom.prototype.getZoom = function() {
    return this._zoom
  }

  SvgPanZoom.prototype.resetZoom = function() {
    SvgUtils.setCTM(this.viewport, this.initialCTM)

    // Trigger onZoom
    this.options.onZoom(this.initialCTM.a)
    // Trigger onPan
    this.options.onPan(this._pan.x, this._pan.y)

    // Cache zoom level
    this._zoom = this.initialCTM.a

    // Cache pan level
    this._pan.x = this.initialCTM.e
    this._pan.y = this.initialCTM.f
  }

  /**
   * Handle mouse move event
   *
   * @param  {object} evt Event
   */
  SvgPanZoom.prototype.handleMouseMove = function(evt) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement

    var point;
    if (this.state === 'pan' && this.options.panEnabled) {
      // Pan mode
      point = SvgUtils.getEventPoint(evt).matrixTransform(this.stateTf)
      var viewportCTM = this.stateTf.inverse().translate(point.x - this.stateOrigin.x, point.y - this.stateOrigin.y)

      SvgUtils.setCTM(this.viewport, viewportCTM)

      // Cache pan level
      this._pan.x = viewportCTM.e
      this._pan.y = viewportCTM.f

      // Trigger onPan
      this.options.onPan(this._pan.x, this._pan.y)
    } else if (this.state === 'drag' && this.options.dragEnabled) {
      // Drag mode
      point = SvgUtils.getEventPoint(evt).matrixTransform(this.viewport.getCTM().inverse())

      SvgUtils.setCTM(this.stateTarget, svg.createSVGMatrix().translate(point.x - this.stateOrigin.x, point.y - this.stateOrigin.y).multiply(this.viewport.getCTM().inverse()).multiply(this.stateTarget.getCTM()))

      this.stateOrigin = point;
    }
  }

  /**
   * Handle double click event
   * See handleMouseDown() for alternate detection method
   *
   * @param {object} evt Event
   */
  SvgPanZoom.prototype.handleDblClick = function(evt) {
    var target = evt.target
      , svg = (target.tagName === 'svg' || target.tagName === 'SVG') ? target : target.ownerSVGElement || target.correspondingElement.ownerSVGElement

    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    // Check if target was a control button
    if (this.options.controlIconsEnabled) {
      var targetClass = target.getAttribute('class') || ''
      if (targetClass.indexOf('svg-pan-zoom-control') > -1) {
        return false
      }
    }

    var zoomFactor

    if (evt.shiftKey) {
      zoomFactor = 1/((1 + this.options.zoomScaleSensitivity) * 2) // zoom out when shift key pressed
    }
    else {
      zoomFactor = (1 + this.zoomScaleSensitivity) * 2
    }

    var point = SvgUtils.getRelativeMousePoint(svg, evt)
    this.zoomAtPoint(svg, point, zoomFactor)
  }

  /**
   * Handle click event
   *
   * @param {object} evt Event
   */
  SvgPanZoom.prototype.handleMouseDown = function(evt) {
    // Double click detection; more consistent than ondblclick
    if (evt.detail === 2){
      this.handleDblClick(evt)
    }

    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement

    if (evt.target.tagName === 'svg' || !this.options.dragEnabled) { // Pan anyway when drag is disabled and the user clicked on an element
      // Pan mode
      this.state = 'pan'
      this.stateTf = this.viewport.getCTM().inverse()
      this.stateOrigin = SvgUtils.getEventPoint(evt).matrixTransform(this.stateTf)
    } else {
      // Drag mode
      this.state = 'drag'
      this.stateTarget = evt.target
      this.stateTf = this.viewport.getCTM().inverse()
      this.stateOrigin = SvgUtils.getEventPoint(evt).matrixTransform(this.stateTf)
    }
  }

  /**
   * Handle mouse button release event
   *
   * @param {object} evt Event
   */
  SvgPanZoom.prototype.handleMouseUp = function(evt) {
    if (evt.preventDefault) {
      evt.preventDefault()
    } else {
      evt.returnValue = false
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement

    if (this.state === 'pan' || this.state === 'drag') {
      // Quit pan mode
      this.state = 'none'
    }
  }

  /**
   * Pan to a rendered position
   *
   * @param  {object} point {x: 0, y: 0}
   */
  SvgPanZoom.prototype.pan = function(point) {
    var viewportCTM = this.viewport.getCTM()
    viewportCTM.e = point.x
    viewportCTM.f = point.y
    SvgUtils.setCTM(this.viewport, viewportCTM)

    // Cache pan level
    this._pan.x = viewportCTM.e
    this._pan.y = viewportCTM.f

    // Trigger onPan
    this.options.onPan(this._pan.x, this._pan.y)
  }

  /**
   * Relatively pan the graph by a specified rendered position vector
   *
   * @param  {object} point {x: 0, y: 0}
   */
  SvgPanZoom.prototype.panBy = function(point) {
    var viewportCTM = this.viewport.getCTM()
    viewportCTM.e += point.x
    viewportCTM.f += point.y
    SvgUtils.setCTM(this.viewport, viewportCTM)

    // Cache pan level
    this._pan.x = viewportCTM.e
    this._pan.y = viewportCTM.f

    // Trigger onPan
    this.options.onPan(this._pan.x, this._pan.y)
  }

  /**
   * Get pan vector
   *
   * @return {object} {x: 0, y: 0}
   */
  SvgPanZoom.prototype.getPan = function() {
    // Do not return object directly because it will be possible to modify it using the reference
    return {x: this._pan.x, y: this._pan.y}
  }

  /**
   * Returns a public instance object
   * @return {object} Public instance object
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
      , setOnPan: function(fn) {that.options.onPan = Utils.proxy(fn, that.publicInstance)}
        // Drag
      , enableDrag: function() {that.options.dragEnabled = true}
      , disableDrag: function() {that.options.dragEnabled = false}
      , isDragEnabled: function() {return !!that.options.dragEnabled}
        // Zoom and Control Icons
      , enableZoom: function() {
          if (that.options.controlIconsEnabled && !that.options.zoomEnabled) {
            ControlIcons.enable(that)
          }
          that.options.zoomEnabled = true;
        }
      , disableZoom: function() {
          if (that.options.controlIconsEnabled && that.options.zoomEnabled) {
            ControlIcons.disable(that)
          }
          that.options.zoomEnabled = false;
        }
      , isZoomEnabled: function() {return !!that.options.zoomEnabled}
      , enableControlIcons: function() {
          if (that.options.zoomEnabled && !that.options.controlIconsEnabled) {
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
        // Zoom scale and bounds
      , setZoomScaleSensitivity: function(scale) {that.options.zoomScaleSensitivity = scale}
      , setMinZoom: function(zoom) {that.options.minZoom = zoom}
      , setMaxZoom: function(zoom) {that.options.maxZoom = zoom}
        // Zoom event
      , setOnZoom: function(fn) {that.options.onZoom = Utils.proxy(fn, that.publicInstance)}
        // Zooming
      , zoom: function(scale) {
          that.zoomAtPoint(that.svg, SvgUtils.getSvgCenterPoint(that.svg), scale, true)
        }
      , zoomBy: function(scale) {
          that.zoomAtPoint(that.svg, SvgUtils.getSvgCenterPoint(that.svg), scale, false)
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
      }
    }

    return this.publicInstance
  }

  /**
   * Stores pairs of instances of SvgPanZoom and SVG
   * Each pair is represented by an object {svg: SVG, instance: SvgPanZoom}
   *
   * @type {Array}
   */
  var instancesStore = []

  window.svgPanZoom = function(elementOrSelector, options){
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
})(window, document)
