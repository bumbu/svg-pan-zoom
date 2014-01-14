svg-pan-zoom library 1.3.3
==========================

JavaScript for panning and zooming an SVG image from the mouse and programmatically.

 The [SVGPan](https://code.google.com/p/svgpan/) library is intended for use inside
 an SVG by manually adding an xlink:href script tag.

 The svg-pan-zoom library builds on the SVGPan library, but it is intended for use also with SVG images that
 are included in an HTML page, whether as in-line images with HTML object or embed elements. It adds the ability to control panning and zooming of
 these SVG images included in an HTML document, without needing 
 to manually add a script element to the SVG.

 svg-pan-zoom features the following capabilities:
  * Panning based on mouse events and via JavaScript
  * Zooming based on mouse events (using the wheel) and via JavaScript
  * Object dragging based on mouse events

  Note that the SVG should have a top-level 'g' element
  with the id 'viewport' to enable zooming for the entire SVG. 
  If the specified SVG does not have this element, it will
  use the first 'g' element.

Demo
----
 See a [github pages demo](http://ariutta.github.io/svg-pan-zoom/).

How To Use
----------

To use, reference the svg-pan-zoom.js file in your page and call the init method, optionally with arguments:

```js
svgPanZoom.init({
  'selector': '#my-svg', // optional selector. If left blank, svg-pan-zoom will look for the first SVG document in your HTML document.
  'panEnabled': true, // optional. values must be true or false. default is true.
  'zoomEnabled': true, // optional. values must be true or false. default is true.
  'dragEnabled': false, // optional. values must be true or false. default is false.
  'zoomScaleSensitivity': 0.2, // optional. values must be scalar. default is 0.2.
  'onZoom': function(scale) { ... }  // optional. Callback function when zoom changes.
});
```

To programmatically control pan and zoom:

```js
svgPanZoom.pan([selector], direction); // selector is optional. direction must be one of up, right, left or down.

svgPanZoom.zoom({
  'selector': '#my-svg', // optional selector. If left blank, svg-pan-zoom will look for the first SVG document in your HTML document.
  'scale': 2 // required. values must be scalar.
});

svgPanZoom.zoomIn([selector]); // selector is optional. control zoom increment with "setZoomScaleSensitivity" method.

svgPanZoom.zoomOut([selector]); // selector is optional. control zoom increment with "setZoomScaleSensitivity" method.

svgPanZoom.resetZoom([selector]); // selector is optional.
```

To programmatically enable/disable pan, zoom or drag:

```js
svgPanZoom.enablePan();
svgPanZoom.disablePan();

svgPanZoom.enableZoom();
svgPanZoom.disableZoom();

svgPanZoom.enableDrag();
svgPanZoom.disableDrag();
```

 You can configure the default enabled/disabled state of pan/zoom/drag
 with the variables listed in the CONFIGURATION section of the file.

Known issues
------------

  * Zooming (while panning) on Safari has still some issues

Releases before Github
----------------------

 1.3.2), Thu Dec 5 2013, Anders Riutta
  * Addressed issue of overwriting existing viewport transform
  * Added capability to handle SVG documents in object elements.


 1.3.1), Mon Nov 19 2013, Anders Riutta
	* Added programmatic control for pan and zoom 
	* Changed certain terms to make them more intuitive

 1.3.0), Mon Nov 18 2013, Anders Riutta
	* Added programmatic control for zoom/pan enabled/disabled

 1.2.2), Tue Aug 30 17:21:56 CEST 2011, Andrea Leofreddi
	* Fixed viewBox on svg tag (#7)
	* Improved zoom speed (#2)

 1.2.1), Mon Jul  4 00:33:18 CEST 2011, Andrea Leofreddi
	* Fixed a regression with mouse wheel (now working on Firefox 5)
	* Working with viewBox attribute (#4)
	* Added 'use strict;' and fixed resulting warnings (#5)
	* Added configuration variables, dragging is disabled by default (#3)

 1.2), Sat Mar 20 08:42:50 GMT 2010, Zeng Xiaohui
	Fixed a bug with browser mouse handler interaction

 1.1), Wed Feb  3 17:39:33 GMT 2010, Zeng Xiaohui
	Updated the zoom code to support the mouse wheel on Safari/Chrome

 1.0), Andrea Leofreddi
	First release

License
-------
 This code is licensed under the following BSD license:

 ```
 Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com>. All rights reserved.
 
 Redistribution and use in source and binary forms, with or without modification, are
 permitted provided that the following conditions are met:
 
    1. Redistributions of source code must retain the above copyright notice, this list of
       conditions and the following disclaimer.
 
    2. Redistributions in binary form must reproduce the above copyright notice, this list
       of conditions and the following disclaimer in the documentation and/or other materials
       provided with the distribution.
 
 THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi "AS IS" AND ANY EXPRESS OR IMPLIED
 WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 
  * The views and conclusions contained in the software and documentation are those of the
  authors and should not be interpreted as representing official policies, either expressed
  or implied, of Andrea Leofreddi.
```
