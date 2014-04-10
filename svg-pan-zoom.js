window.svgPanZoom = (function(document) {

  'use strict';

  var state = 'none', stateTarget, stateOrigin, stateTf;

  /// CONFIGURATION
  /// ====>

  var panEnabled = true; // true or false: enable or disable panning (default enabled)
  var zoomEnabled = true; // true or false: enable or disable zooming (default enabled)
  var zoomControlIconsEnabled = true; // true or false: insert icons to give user an option in addition to mouse events to control zoom (default enabled)
  var dragEnabled = false; // true or false: enable or disable dragging (default disabled)
  var zoomScaleSensitivity = 0.2; // Zoom sensitivity
  var minZoom = 0.5; // Minimum Zoom
  var maxZoom = 10; // Maximum Zoom
  var onZoom = null; // Zoom callback
  var containerWidth, containerHeight;

  /// <====
  /// END OF CONFIGURATION

  /**
   * Enable svgPanZoom
   */
  function init(args) {
    args = args || {};
    svgPanZoom.controlIcons = svgPanZoom.controlIcons || {};
    getSvg(args.selector, function(err, svg) {
      var container = svg.parentElement || svgElement.parentNode;
      var containerBoundingClientRect = container.getBoundingClientRect();
      containerWidth = parseInt(containerBoundingClientRect.width);
      containerHeight = parseInt(containerBoundingClientRect.height);
      svgPanZoom.controlIcons.containerWidth = containerWidth; // is there a better way to do this?
      svgPanZoom.controlIcons.containerHeight = containerHeight;

      var viewport = getViewport(svg);
      var svgViewBox = svg.getAttribute('viewBox');
      if (svgViewBox) {
        var bBox = svg.getBBox();
        var boundingClientRect = svg.getBoundingClientRect();
        var viewBoxValues = svgViewBox.split(' ').map(function(viewBoxValue) {
          return parseFloat(viewBoxValue);
        });
        var viewBoxWidth = viewBoxValues[2];
        var viewBoxHeight = viewBoxValues[3];
        //svg.__viewportElement.setAttribute('viewBox', svgViewBox); // does this do anything? It didn't appear to, at least in Chrome.

        svg.removeAttribute('viewBox');
        var oldCTM, newCTM;
        oldCTM = newCTM = svg.__viewportElement.getCTM();
        var newScale = Math.min(containerWidth/viewBoxWidth, containerHeight/viewBoxHeight);
        //var newScale = Math.min(boundingClientRect.width/bBox.width, boundingClientRect.height/bBox.height);
        newCTM.a = newScale * oldCTM.a; //x-scale
        newCTM.d = newScale * oldCTM.d; //y-scale
        newCTM.e = oldCTM.e * newScale; //x-transform
        newCTM.f = oldCTM.f * newScale; //y-transform
        setCTM(svg.__viewportElement, newCTM);
      }
      

      if (args.hasOwnProperty('panEnabled')) {
        panEnabled = args.panEnabled;
      }
      if (args.hasOwnProperty('zoomEnabled')) {
        zoomEnabled = args.zoomEnabled;
        if (zoomEnabled && args.hasOwnProperty('zoomControlIconsEnabled')) {
          zoomControlIconsEnabled = args.zoomControlIconsEnabled;
        }
      }
      if (zoomEnabled && zoomControlIconsEnabled) {
        svgPanZoom.controlIcons.add(svg);
      }

      if (args.hasOwnProperty('dragEnabled')) {
        dragEnabled = args.dragEnabled;
      }
      if (args.hasOwnProperty('zoomScaleSensitivity')) {
        zoomScaleSensitivity = args.zoomScaleSensitivity;
      }
      if (args.hasOwnProperty('onZoom')) {
        onZoom = args.onZoom;
      }
      if (args.hasOwnProperty('minZoom')) {
        minZoom = args.minZoom;
      }
      if (args.hasOwnProperty('maxZoom')) {
        maxZoom = args.maxZoom;
      }
      setupHandlers(svg);
      if (!!svg.ownerDocument.documentElement.tagName.toLowerCase() !== 'svg') {
        svg.ownerDocument.defaultView.svgPanZoom = svgPanZoom;
      }
    });
  }

  /**
   * Change settings
   */
  function setZoomScaleSensitivity(newZoomScaleSensitivity) {
    zoomScaleSensitivity = newZoomScaleSensitivity;
  }

  function enablePan() {
    panEnabled = true;
  }

  function disablePan() {
    panEnabled = false;
  }

  function enableZoom() {
    zoomEnabled = true;
  }

  function disableZoom() {
    zoomEnabled = false;
  }

  function enableDrag() {
    dragEnabled = true;
  }

  function disableDrag() {
    dragEnabled = false;
  }

  /**
   * Register handlers
   */
  function setupHandlers(svg){
    setAttributes(svg, {
      'onmouseup': 'svgPanZoom.handleMouseUp(evt)',
      'onmousedown': 'svgPanZoom.handleMouseDown(evt)',
      'onmousemove': 'svgPanZoom.handleMouseMove(evt)',

      // Decomment this to stop the pan functionality when dragging out of the SVG element;
      // Note that 'onmouseleave' works over parent svg and all children.
      'onmouseleave' : 'svgPanZoom.handleMouseUp(evt)',
    });

    svg.setAttribute('xmlns', 'http://www.w3.org/1999/xlink');
    svg.setAttributeNS('xmlns', 'xlink', 'http://www.w3.org/1999/xlink');
    svg.setAttributeNS('xmlns', 'ev', 'http://www.w3.org/2001/xml-events');

    //Needed for Internet Explorer, otherwise the viewport overflows.
    if (svg.parentNode !== null) {
      svg.setAttribute('style', 'overflow: hidden');
    }

    window.addWheelListener(svg, handleMouseWheel);
  }

  /**
   * Retrieves the svg element for SVG manipulation.
   */
  function getViewport(svg) {
    // CTM refers to the current transformation matrix.
    // Its values can be represented as (a, c, b, d, tx, ty), where
    // a: x scale
    // d: y scale
    // c and b: skew
    // tx: translate x
    // ty: translate y
    //
    // getBBox() gives dimensions of content at current zoom level (the content bounds)
    // getBoundingClientRect() gives dimensions of svg element (the container size).
    var initialViewportCTM;
    if (!svg.__viewportElement) {
      svg.__viewportElement = svg.getElementById('viewport');
      if (!svg.__viewportElement) {

        // If no g container with id 'viewport' exists, as last resort, use first g element.

        svg.__viewportElement = svg.getElementsByTagName('g')[0];
      }

      if (!svg.__viewportElement) {

        // TODO could automatically move all elements from SVG into a newly created viewport g element.

        throw new Error('No g element containers in SVG document to use for viewport.');
      }
    }

    return svg.__viewportElement;
  }

  /**
   * Time-based cache for svg.getScreenCTM().
   * Needed because getScreenCTM() is very slow on Firefox (FF 28 at time of writing).
   * The cache expires every 300ms... this is a pretty safe time because it's only called
   * when we're zooming, when the screenCTM is unlikely/impossible to change.
   */
  var getScreenCTMCached = (function() {
    var svgs = {};
    return function(svg) {
      var cur = Date.now();
      if (svgs.hasOwnProperty(svg)) {
        var cached = svgs[svg];
        if (cur - cached.time > 300) {
          //Cache expired
          cached.time = cur;
          cached.ctm = svg.getScreenCTM();
        }
        return cached.ctm;
      } else {
        var ctm = svg.getScreenCTM();
        svgs[svg] = {time: cur, ctm: ctm};
        return ctm;
      }
    };
  })();

  /**
   * Get an SVGPoint of the mouse co-ordinates of the event, relative to the SVG element.
   */
  function getRelativeMousePoint(svg, evt) {
    var point = svg.createSVGPoint();
    point.x = evt.clientX;
    point.y = evt.clientY;
    point = point.matrixTransform(getScreenCTMCached(svg).inverse());
    return point;
  }

  function getSvgCenterPoint(svg) {
	var width = svg.width.baseVal.valueInSpecifiedUnits;
	var height = svg.height.baseVal.valueInSpecifiedUnits;
	var point = svg.createSVGPoint();
	point.x = width/2;
	point.y = height/2;
	return point;
  }

  /**
   * Instance an SVGPoint object with given event coordinates.
   */

  function getEventPoint(evt) {
    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    var p = svg.createSVGPoint();

    p.x = evt.clientX;
    p.y = evt.clientY;

    return p;
  }

  /**
   * Sets the current transform matrix of an element.
   */
  function setCTM(element, matrix) {
    var s = 'matrix(' + matrix.a + ',' + matrix.b + ',' + matrix.c + ',' + matrix.d + ',' + matrix.e + ',' + matrix.f + ')';
    element.setAttribute('transform', s);
  }

  /**
   * Dumps a matrix to a string (useful for debug).
   */
  function dumpMatrix(matrix) {
    var s = '[ ' + matrix.a + ', ' + matrix.c + ', ' + matrix.e + '\n  ' + matrix.b + ', ' + matrix.d + ', ' + matrix.f + '\n  0, 0, 1 ]';
    return s;
  }

  /**
   * Sets attributes of an element.
   */
  function setAttributes(element, attributes){
    for (var i in attributes)
      element.setAttributeNS(null, i, attributes[i]);
  }

  function findFirstSvg(callback) {
    var i, candidateSvg, foundSvg;
    var candidateSvg = document.querySelector('svg');
    if (!!candidateSvg) {
      foundSvg = candidateSvg;
      callback(foundSvg);
    }

    var candidateObjectElements = document.querySelectorAll('object');
    i = 0;
    do {
      i += 1;
      getSvg('object:nth-of-type(' + i + ')', function(err, candidateSvg) {
        if (!!candidateSvg) {
          foundSvg = candidateSvg;
          callback(foundSvg);
        }
      });
    } while (i < candidateObjectElements.length);

    var candidateEmbedElements = document.querySelectorAll('embed');
    i = 0;
    do {
      i += 1;
      getSvg('embed:nth-of-type(' + i + ')', function(err, candidateSvg) {
        if (!!candidateSvg) {
          foundSvg = candidateSvg;
          callback(foundSvg);
        }
      });
    } while (i < candidateEmbedElements.length);

    // TODO add a timeout
  }

  function getSvg(selector, callback) {
    var target, err, svg;
    if (!selector) {
      if(typeof console !== "undefined") {
        console.warn('No selector specified for getSvg(). Using first svg element found.');
      }
      target = findFirstSvg(function(svg) {
        if (!svg) {
          err = new Error('No SVG found in this document.');
        }
        if (!!callback) {
          callback(err, svg);
        }
        else {
          if (!svg) {
            throw err;
          }
          return svg;
        }
      });
    }
    else {
      target = document.querySelector(selector);
      if (!!target) {
        if (target.tagName.toLowerCase() === 'svg') {
          svg = target;
        }
        else {
          if (target.tagName.toLowerCase() === 'object') {
            svg = target.contentDocument.documentElement;
          }
          else {
            if (target.tagName.toLowerCase() === 'embed') {
              svg = target.getSVGDocument().documentElement;
            }
            else {
              if (target.tagName.toLowerCase() === 'img') {
                throw new Error('Cannot script an SVG in an "img" element. Please use an "object" element or an in-line SVG.');
              }
              else {
                throw new Error('Cannot get SVG.');
              }
            }
          }
        }
      }
      if (!svg) {
        err = new Error('No SVG found in this document.');
      }

      if (!!callback) {
        callback(err, svg);
      }
      else {
        if (!svg) {
          throw err;
        }
        return svg;
      }
    }
  }

  function pan(selector, direction) {
    if (!direction) {
      throw new Error('No direction specified for direction of panning. Please enter a string value of up, right, down or left.');
    }
    var tx, ty;
    var panIncrement = 0.1;
    var directionToXYMapping = {
      'top':{
        'x': 0,
        'y': -1
      },
      't':{
        'x': 0,
        'y': -1
      },
      'up':{
        'x': 0,
        'y': -1
      },
      'u':{
        'x': 0,
        'y': -1
      },
      'right':{
        'x': 1,
        'y': 0
      },
      'r':{
        'x': 1,
        'y': 0
      },
      'bottom':{
        'x': 0,
        'y': 1
      },
      'b':{
        'x': 0,
        'y': 1
      },
      'down':{
        'x': 0,
        'y': 1
      },
      'd':{
        'x': 0,
        'y': 1
      },
      'left':{
        'x': -1,
        'y': 0
      },
      'l':{
        'x': -1,
        'y': 0
      }
    };

    var directionXY = directionToXYMapping[direction];

    if (!directionXY) {
      throw new Error('Direction specified was not understood. Please enter a string value of up, right, down or left.');
    }

    getSvg(selector, function(err, svg) {
      var viewport = getViewport(svg);
      tx = svg.getBBox().width * panIncrement * directionXY.x;
      ty = svg.getBBox().height * panIncrement * directionXY.y;
      var viewportCTM = viewport.getCTM();
      viewportCTM.e += tx;
      viewportCTM.f += ty;
      setCTM(viewport, viewportCTM);
    });
  }

  function zoom(args) {
    if (!args.scale) {
      throw new Error('No scale specified for zoom. Please enter a number.');
    }
    getSvg(args.selector, function(err, svg) {
      var p = getSvgCenterPoint(svg);
      zoomAtPoint(svg, p, args.scale, true);
    });
  }

  function zoomIn(selector) {
    getSvg(selector, function(err, svg) {
      var p = getSvgCenterPoint(svg);
      zoomAtPoint(svg, p, 1 + zoomScaleSensitivity);
    });
  }

  function zoomOut(selector) {
    getSvg(selector, function(err, svg) {
      var p = getSvgCenterPoint(svg);
      zoomAtPoint(svg, p, 1/(1 + zoomScaleSensitivity));
    });
  }

  function resetZoom(selector) {
    var oldCTM, newCTM;
    getSvg(selector, function(err, svg) {
      var viewport = getViewport(svg);

      var bBox = svg.getBBox();
      var boundingClientRect = svg.getBoundingClientRect();
      oldCTM = newCTM = viewport.getCTM();
      var newScale = Math.min(boundingClientRect.width/bBox.width, boundingClientRect.height/bBox.height);
      newCTM.a = newScale * oldCTM.a; //x-scale
      newCTM.d = newScale * oldCTM.d; //y-scale
      newCTM.e = oldCTM.e * newScale + (boundingClientRect.width - bBox.width * newScale)/2 - bBox.x * newScale; //x-transform
      newCTM.f = oldCTM.f * newScale + (boundingClientRect.height - bBox.height * newScale)/2 - bBox.y * newScale; //y-transform
      setCTM(viewport, newCTM);
      if (onZoom) { onZoom(newCTM.a); }
    });
  }

  /**
   * Handle mouse wheel event.
   */
  function handleMouseWheel(evt) {
    if(!zoomEnabled) {
      return;
    }

    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    var delta;

    if ('deltaMode' in evt && evt.deltaMode === 0) {
      //Make empirical adjustments for browsers that give deltaY in 
      //pixels (deltaMode=0).

      if (evt.wheelDelta) {
        //Normalizer for Chrome
        delta = evt.deltaY / Math.abs(evt.wheelDelta/3) 
      } else {
        //Others. Possibly tablets? Use a value just in case
        delta = evt.deltaY / 120;
      }
    } else if ('mozPressure' in evt) {
      //Normalizer for newer Firefox
      //NOTE: May need to change detection at some point if mozPressure disappears.
      delta = evt.deltaY / 3;
    }
    else {
      //Others should be reasonably normalized by the mousewheel code at the end of the file.
      delta = evt.deltaY;
    }

    var p = getRelativeMousePoint(svg, evt);
    var zoom = Math.pow(1 + zoomScaleSensitivity, delta);
    zoomAtPoint(svg, p, zoom);
  }

  /**
   * Zoom in at an SVG point.
   * @param svg The SVG element
   * @param point The SVG point at which the zoom should happen (where 0,0 is top left corner)
   * @param zoomScale Number representing how much to zoom.
   * @param zoomAbsolute Default false. If true, zoomScale is treated as an absolute value.
   *					 Otherwise, zoomScale is treated as a multiplied (e.g. 1.10 would zoom in 10%)
   */
  function zoomAtPoint(svg, point, zoomScale, zoomAbsolute) {
    var viewport = getViewport(svg);
    var viewportCTM = viewport.getCTM();
    point = point.matrixTransform(viewportCTM.inverse());

    var k = svg.createSVGMatrix().translate(point.x, point.y).scale(zoomScale).translate(-point.x, -point.y);
    var wasZoom = viewportCTM;
    var setZoom = viewportCTM.multiply(k);

    if (zoomAbsolute) {
      setZoom.a = setZoom.d = zoomScale;
    }

    if ( setZoom.a < minZoom ) { setZoom.a = setZoom.d = wasZoom.a; }
    if ( setZoom.a > maxZoom ) { setZoom.a = setZoom.d = wasZoom.a; }
    if ( setZoom.a != wasZoom.a ) { setCTM(viewport, setZoom); }

    if(typeof(stateTf) == 'undefined')
      stateTf = setZoom.inverse();

    stateTf = stateTf.multiply(k.inverse());
    if (onZoom) { onZoom(setZoom.a); }
  }
  
  /**
   * Handle mouse move event.
   */
  function handleMouseMove(evt) {
    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    var g = getViewport(svg);

    if(state == 'pan' && panEnabled) {
      // Pan mode
      var p = getEventPoint(evt).matrixTransform(stateTf);

      setCTM(g, stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y));
    } else if(state == 'drag' && dragEnabled) {
      // Drag mode
      var p = getEventPoint(evt).matrixTransform(g.getCTM().inverse());

      setCTM(stateTarget, svg.createSVGMatrix().translate(p.x - stateOrigin.x, p.y - stateOrigin.y).multiply(g.getCTM().inverse()).multiply(stateTarget.getCTM()));

      stateOrigin = p;
    }
  }

  /**
   * Handle double click event.
   * See handleMouseDown() for alternate detection method.
   */
  function handleDblClick(evt) {
    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target
      .correspondingElement.ownerSVGElement;

    var zoomFactor;
    if(evt.shiftKey){
      zoomFactor = 1/((1 + zoomScaleSensitivity) * 2); // zoom out when shift key pressed
    }
    else {
      zoomFactor = (1 + zoomScaleSensitivity) * 2;
    }

    var p = getRelativeMousePoint(svg, evt);
    zoomAtPoint(svg, p, zoomFactor );
  }

  /**
   * Handle click event.
   */
  function handleMouseDown(evt) {
    // Double click detection; more consistent than ondblclick
    if(evt.detail==2){
        handleDblClick(evt);
    }

    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    var g = getViewport(svg);

    if(
      evt.target.tagName == 'svg' || !dragEnabled // Pan anyway when drag is disabled and the user clicked on an element
    ) {
      // Pan mode
      state = 'pan';

      stateTf = g.getCTM().inverse();

      stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
    } else {
      // Drag mode
      state = 'drag';

      stateTarget = evt.target;

      stateTf = g.getCTM().inverse();

      stateOrigin = getEventPoint(evt).matrixTransform(stateTf);
    }
  }

  /**
   * Handle mouse button release event.
   */
  function handleMouseUp(evt) {
    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = (evt.target.tagName === 'svg' || evt.target.tagName === 'SVG') ? evt.target : evt.target.ownerSVGElement || evt.target.correspondingElement.ownerSVGElement;

    if(state == 'pan' || state == 'drag') {
      // Quit pan mode
      state = '';
    }
  }

  return{
    init:init,
    handleMouseUp:handleMouseUp,
    handleMouseDown:handleMouseDown,
    handleMouseMove:handleMouseMove,
    handleDblClick:handleDblClick,
    pan:pan,
    zoom:zoom,
    zoomIn:zoomIn,
    zoomOut:zoomOut,
    resetZoom:resetZoom,
    setZoomScaleSensitivity:setZoomScaleSensitivity,
    enablePan:enablePan,
    disablePan:disablePan,
    enableZoom:enableZoom,
    disableZoom:disableZoom,
    enableDrag:enableDrag,
    disableDrag:disableDrag
  };
})(document);

//Cross-browser wheel event, from: https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel
if (!window.hasOwnProperty('addWheelListener')) {
	// creates a global "addWheelListener" method
	// example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );
	(function(window,document) {

		var prefix = "", _addEventListener, onwheel, support;

		// detect event model
		if ( window.addEventListener ) {
			_addEventListener = "addEventListener";
		} else {
			_addEventListener = "attachEvent";
			prefix = "on";
		}

		// detect available wheel event
		support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
      document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
      "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

        window.addWheelListener = function( elem, callback, useCapture ) {
			_addWheelListener( elem, support, callback, useCapture );

			// handle MozMousePixelScroll in older Firefox
			if( support == "DOMMouseScroll" ) {
				_addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
			}
		};

		function _addWheelListener( elem, eventName, callback, useCapture ) {
			elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
				!originalEvent && ( originalEvent = window.event );

				// create a normalized event object
				var event = {
					// keep a ref to the original event object
					originalEvent: originalEvent,
					// NOTE: clientX and clientY are not in Mozilla example, but are needed for svg-pan-zoom
					clientX: originalEvent.clientX,
					clientY: originalEvent.clientY,
					target: originalEvent.target || originalEvent.srcElement,
					type: "wheel",
					deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
					deltaX: 0,
					deltaZ: 0,
					preventDefault: function() {
						originalEvent.preventDefault ?
							originalEvent.preventDefault() :
							originalEvent.returnValue = false;
					}
				};

				// calculate deltaY (and deltaX) according to the event
				if ( support == "mousewheel" ) {
					event.deltaY = - 1/40 * originalEvent.wheelDelta;
					// Webkit also support wheelDeltaX
					originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
				} else {
					event.deltaY = originalEvent.detail;
				}

				// it's time to fire the callback
				return callback( event );

			}, useCapture || false );
		}

	})(window,document);
}
