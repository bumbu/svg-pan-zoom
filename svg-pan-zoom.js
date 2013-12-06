svgPanZoom = function(){

  /** 
   * This code is licensed under the following BSD license:
   *
   * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com>. All rights reserved.
   * 
   * Redistribution and use in source and binary forms, with or without modification, are
   * permitted provided that the following conditions are met:
   * 
   *    1. Redistributions of source code must retain the above copyright notice, this list of
   *       conditions and the following disclaimer.
   * 
   *    2. Redistributions in binary form must reproduce the above copyright notice, this list
   *       of conditions and the following disclaimer in the documentation and/or other materials
   *       provided with the distribution.
   * 
   * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
   * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
   * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
   * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
   * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
   * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   * 
  * The views and conclusions contained in the software and documentation are those of the
    * authors and should not be interpreted as representing official policies, either expressed
    * or implied, of Andrea Leofreddi.
    */

  'use strict';

  var svg, state = 'none', viewportCTM, stateTarget, stateOrigin, stateTf;

  /// CONFIGURATION 
  /// ====>

  var panEnabled = true; // true or false: enable or disable panning (default enabled)
  var zoomEnabled = true; // true or false: enable or disable zooming (default enabled)
  var dragEnabled = false; // true or false: enable or disable dragging (default disabled)
  var zoomScaleSensitivity = 0.2; // Zoom sensitivity

  /// <====
  /// END OF CONFIGURATION 

  /**
   * Enable svgPanZoom 
   */

  function init(args) {
    args = args || {};
    svg = getSvg(args.selector, function(err, result) {
      if (args.hasOwnProperty('panEnabled')) {
        panEnabled = args.panEnabled;
      }
      if (args.hasOwnProperty('zoomEnabled')) {
        zoomEnabled = args.zoomEnabled;
      }
      if (args.hasOwnProperty('dragEnabled')) {
        dragEnabled = args.dragEnabled;
      }
      if (args.hasOwnProperty('zoomScaleSensitivity')) {
        zoomScaleSensitivity = args.zoomScaleSensitivity;
      }
      setupHandlers(result);
      svg.ownerDocument.defaultView.svgPanZoom = svgPanZoom;
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
      'onmousemove': 'svgPanZoom.handleMouseMove(evt)'
      //'onmouseout' : 'svgPanZoom.handleMouseUp(evt)', // Decomment this to stop the pan functionality when dragging out of the SVG element
    });

    svg.setAttribute('xmlns', 'http://www.w3.org/1999/xlink')
    svg.setAttributeNS('xmlns', 'xlink', 'http://www.w3.org/1999/xlink')
    svg.setAttributeNS('xmlns', 'ev', 'http://www.w3.org/2001/xml-events')

    var svgWindow = svg.ownerDocument.defaultView;
    if(navigator.userAgent.toLowerCase().indexOf('webkit') >= 0) {
      svgWindow.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
    }
    else {
      svgWindow.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
    }
  }

  /**
   * Retrieves the svg element for SVG manipulation. The element is then cached into the viewport global variable.
   */

  function getViewport(svg) {
    var initialViewportCTM, svgViewBox;
    var svgWindow = svg.ownerDocument.defaultView;
    if (!svgWindow.viewport) {
      svgWindow.viewport = svg.getElementById('viewport');
      if (!svgWindow.viewport) {

        // If no g container with id 'viewport' exists, as last resort, use first g element.

        svgWindow.viewport = svg.getElementsByTagName('g')[0]
      }

      if (!svgWindow.viewport) {

        // TODO could automatically move all elements from SVG into a newly created viewport g element.

        throw new Error('No g element containers in SVG document to use for viewport.');
      }

      svgViewBox = svg.getAttribute('viewBox');
      if (svgViewBox) {
        svgWindow.viewport.setAttribute('viewBox', svgViewBox);
        svg.removeAttribute('viewBox');
      }
    }

    viewportCTM = svgWindow.viewport.getCTM();
    return svgWindow.viewport;
  }

  /**
   * Instance an SVGPoint object with given event coordinates.
   */

  function getEventPoint(evt) {
    svg = evt.target.ownerDocument.documentElement;
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
    if (candidateSvg) {
      foundSvg = candidateSvg;
      callback(foundSvg);
    }

    var candidateObjectElements = document.querySelectorAll('object');
    i = 0;
    do {
      i += 1;
      candidateSvg = getSvg('object:nth-of-type(' + i + ')', function(err, candidateSvg) {
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
      candidateSvg = getSvg('embed:nth-of-type(' + i + ')', function(err, candidateSvg) {
        if (!!candidateSvg) {
          foundSvg = candidateSvg;
          callback(foundSvg);
        }
      });
    } while (i < candidateEmbedElements.length);

    // TODO add a timeout
  }

  function getSvg(selector, callback) {
    var target, err;
    if (!selector) {
      console.warn('No selector specified for getSvg(). Using first svg element found.');
      target = findFirstSvg(function(result) {
        if (!result) {
          err = new Error('No SVG found in this document.');
        }
        if (!!callback) {
          callback(err, result);
        }
        else {
          if (!svg) {
            throw err;
          }
          return result;
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
      else {
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
      var viewport = getViewport(svg);
      viewportCTM.a = viewportCTM.d = args.scale;
      setCTM(viewport, viewportCTM);
    });
  }

  function zoomIn(selector) {

    // TODO zoom origin isn't center of screen

    getSvg(selector, function(err, svg) {
      var viewport = getViewport(svg);
      viewportCTM.a = viewportCTM.d = (1 + zoomScaleSensitivity) * viewportCTM.a;
      setCTM(viewport, viewportCTM);
    });
  }

  function zoomOut(selector) {

    // TODO zoom origin isn't center of screen

    getSvg(selector, function(err, svg) {
      var viewport = getViewport(svg);
      viewportCTM.a = viewportCTM.d = (1 - zoomScaleSensitivity) * viewportCTM.a;
      setCTM(viewport, viewportCTM);
    });
  }

  function resetZoom(selector) {
    var oldCTM, newCTM;
    getSvg(selector, function(err, svg) {
      var viewport = getViewport(svg);

      var bBox = svg.getBBox();
      var boundingClientRect = svg.getBoundingClientRect();
      oldCTM = newCTM = viewportCTM;
      var newScale = Math.min(boundingClientRect.width/bBox.width, boundingClientRect.height/bBox.height);
      newCTM.a = newScale * oldCTM.a; //x-scale
      newCTM.d = newScale * oldCTM.d; //y-scale
      newCTM.e = oldCTM.e * newScale - (boundingClientRect.width - bBox.width * newScale)/2 - bBox.x * newScale; //x-transform
      newCTM.f = oldCTM.f * newScale - (boundingClientRect.height - bBox.height * newScale)/2 - bBox.y * newScale; //y-transform
      setCTM(viewport, newCTM);
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

    var svg = evt.target.ownerDocument.documentElement;

    var delta;

    if(evt.wheelDelta)
      delta = evt.wheelDelta / 360; // Chrome/Safari
    else
      delta = evt.detail / -9; // Mozilla

    var z = Math.pow(1 + zoomScaleSensitivity, delta);

    var g = getViewport(svg);

    var p = getEventPoint(evt);

    p = p.matrixTransform(g.getCTM().inverse());

    // Compute new scale matrix in current mouse position
    var k = svg.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);

    setCTM(g, g.getCTM().multiply(k));

    if(typeof(stateTf) == 'undefined')
      stateTf = g.getCTM().inverse();

    stateTf = stateTf.multiply(k.inverse());
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

    var svg = evt.target.ownerDocument.documentElement;

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
   * Handle click event.
   */

  function handleMouseDown(evt) {
    if(evt.preventDefault) {
      evt.preventDefault();
    }
    else {
      evt.returnValue = false;
    }

    var svg = evt.target.ownerDocument.documentElement;

    var g = getViewport(svg);

    if(
      evt.target.tagName == 'svg' 
        || !dragEnabled // Pan anyway when drag is disabled and the user clicked on an element 
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

    var svg = evt.target.ownerDocument.documentElement;

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
}();
