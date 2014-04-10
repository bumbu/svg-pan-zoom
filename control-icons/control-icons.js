svgPanZoom.controlIcons = {
  add: function(svg) {
    console.log('svg');
    console.log(svg);
    //var svgPanZoom = this;
    console.log('this');
    console.log(this);
    var containerWidth = this.containerWidth;
    var containerHeight = this.containerHeight;

      //*
      // not all containers will have a width or height style attribute. this is now done using the same logic
      // but uses boundingClientRect() instead. the code is located in pathway-diagram.js
      var svgSelection = d3.select(svg);
      var viewport = svgSelection.select('#viewport');
      /*
      var svgElement = svgSelection[0][0];
      var container = svgElement.parentElement || svgElement.parentNode;
      var containerBoundingClientRect = container.getBoundingClientRect();
      var containerWidth = parseInt(containerBoundingClientRect.width);
      var containerHeight = parseInt(containerBoundingClientRect.height);
      //*/
      /*
      var containerWidth = parseInt(container.style("width")) - 40; //account for space for pan/zoom controls
      var containerHeight = parseInt(container.style("height")) -20; //account for space for search field
      //*/
      //*/
     //*
      var fitScreenScale;
      /*
      if (fitToContainer) {
        svgPanZoom.reset(viewport, containerWidth, containerHeight, data.image.width, data.image.height);
      }
      //*/

      var defs = svgSelection.select('defs');
      var style = defs.append('style').attr('type', "text/css")
      .text('.svg-pan-zoom-control:hover { cursor: pointer; fill: black; fill-opacity: 0.333; } .svg-pan-zoom-control:hover { fill-opacity: 0.75; }');

      var controlsSelection = svgSelection.append('g')
      .attr('id', 'svg-pan-zoom-controls')
      .attr('transform', 'translate(' + ( containerWidth - 70 ) + ' ' + ( containerHeight - 76 ) + ') scale(0.75)');

      // zoom in
      var zoomInControl = controlsSelection.append('g')
      .attr('id', 'svg-pan-zoom-zoom-in')
      .attr('transform', 'translate(30.5 5) scale(0.015)')
      .attr('class', 'svg-pan-zoom-control')
      .on("click", function(d,i){
        svgPanZoom.zoomIn();
      });

      zoomInControl.append('rect')
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '1536') // larger than expected because the whole group is transformed to scale down
      .attr('height', '1536')
      .attr('fill', 'transparent');

      zoomInControl.append('path')
      .attr('d', 'M1280 576v128q0 26 -19 45t-45 19h-320v320q0 26 -19 45t-45 19h-128q-26 0 -45 -19t-19 -45v-320h-320q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h320v-320q0 -26 19 -45t45 -19h128q26 0 45 19t19 45v320h320q26 0 45 19t19 45zM1536 1120v-960 q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5t84.5 -203.5z');


      // reset
      var resetPanZoomControl = controlsSelection.append('g')
      .attr('id', 'svg-pan-zoom-reset-pan-zoom')
      .attr('transform', 'translate(5 35) scale(0.4)')
      .attr('class', 'svg-pan-zoom-control')
      .on("click", function(d,i){
        //svgPanZoom.resetZoom();
        svgPanZoom.reset(viewport, containerWidth, containerHeight, data.image.width, data.image.height);
      });

      resetPanZoomControl.append('rect')
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '186') // larger than expected because the whole group is transformed to scale down
      .attr('height', '62')
      .attr('fill', 'transparent');

      resetPanZoomControl.append('path')
      .attr('d', 'M33.051,20.632c-0.742-0.406-1.854-0.609-3.338-0.609h-7.969v9.281h7.769c1.543,0,2.701-0.188,3.473-0.562c1.365-0.656,2.048-1.953,2.048-3.891C35.032,22.757,34.372,21.351,33.051,20.632z');

      resetPanZoomControl.append('path')
      .attr('d', 'M170.231,0.5H15.847C7.102,0.5,0.5,5.708,0.5,11.84v38.861C0.5,56.833,7.102,61.5,15.847,61.5h154.384c8.745,0,15.269-4.667,15.269-10.798V11.84C185.5,5.708,178.976,0.5,170.231,0.5z M42.837,48.569h-7.969c-0.219-0.766-0.375-1.383-0.469-1.852c-0.188-0.969-0.289-1.961-0.305-2.977l-0.047-3.211c-0.03-2.203-0.41-3.672-1.142-4.406c-0.732-0.734-2.103-1.102-4.113-1.102h-7.05v13.547h-7.055V14.022h16.524c2.361,0.047,4.178,0.344,5.45,0.891c1.272,0.547,2.351,1.352,3.234,2.414c0.731,0.875,1.31,1.844,1.737,2.906s0.64,2.273,0.64,3.633c0,1.641-0.414,3.254-1.242,4.84s-2.195,2.707-4.102,3.363c1.594,0.641,2.723,1.551,3.387,2.73s0.996,2.98,0.996,5.402v2.32c0,1.578,0.063,2.648,0.19,3.211c0.19,0.891,0.635,1.547,1.333,1.969V48.569z M75.579,48.569h-26.18V14.022h25.336v6.117H56.454v7.336h16.781v6H56.454v8.883h19.125V48.569z M104.497,46.331c-2.44,2.086-5.887,3.129-10.34,3.129c-4.548,0-8.125-1.027-10.731-3.082s-3.909-4.879-3.909-8.473h6.891c0.224,1.578,0.662,2.758,1.316,3.539c1.196,1.422,3.246,2.133,6.15,2.133c1.739,0,3.151-0.188,4.236-0.562c2.058-0.719,3.087-2.055,3.087-4.008c0-1.141-0.504-2.023-1.512-2.648c-1.008-0.609-2.607-1.148-4.796-1.617l-3.74-0.82c-3.676-0.812-6.201-1.695-7.576-2.648c-2.328-1.594-3.492-4.086-3.492-7.477c0-3.094,1.139-5.664,3.417-7.711s5.623-3.07,10.036-3.07c3.685,0,6.829,0.965,9.431,2.895c2.602,1.93,3.966,4.73,4.093,8.402h-6.938c-0.128-2.078-1.057-3.555-2.787-4.43c-1.154-0.578-2.587-0.867-4.301-0.867c-1.907,0-3.428,0.375-4.565,1.125c-1.138,0.75-1.706,1.797-1.706,3.141c0,1.234,0.561,2.156,1.682,2.766c0.721,0.406,2.25,0.883,4.589,1.43l6.063,1.43c2.657,0.625,4.648,1.461,5.975,2.508c2.059,1.625,3.089,3.977,3.089,7.055C108.157,41.624,106.937,44.245,104.497,46.331z M139.61,48.569h-26.18V14.022h25.336v6.117h-18.281v7.336h16.781v6h-16.781v8.883h19.125V48.569z M170.337,20.14h-10.336v28.43h-7.266V20.14h-10.383v-6.117h27.984V20.14z');

      // zoom out
      var zoomOutControl = controlsSelection.append('g')
      .attr('id', 'svg-pan-zoom-zoom-out')
      .attr('transform', 'translate(30.5 70) scale(0.015)')
      .attr('class', 'svg-pan-zoom-control')
      .on("click", function(d,i){
        svgPanZoom.zoomOut();
      });

      zoomOutControl.append('rect')
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '1536') // larger than expected because the whole group is transformed to scale down
      .attr('height', '1536')
      .attr('fill', 'transparent');

      zoomOutControl.append('path')
      .attr('d', 'M1280 576v128q0 26 -19 45t-45 19h-896q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h896q26 0 45 19t19 45zM1536 1120v-960q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5 t84.5 -203.5z');

      /*
      //TODO get large screen view working
      var fullscreen = d3.select('#full-screen-control')
      .on("click", function(d,i){
        var pvjs = document.getElementById("pathvisiojs-dev").innerHTML;
        var newwin = window.open('','','width=800,height=600');
        var doc = newwin.document;
        doc.open();
        doc.write(pvjs);
        doc.close();	
      });
      //*/





     /*
    <svg id="pan-zoom-control-shapes" version="1.1" baseProfile="full" xmlns="http://www.w3.org/1999/xlink" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events" preserveAspectRatio="xMidYMid" width="64" height="70" xlink="http://www.w3.org/1999/xlink" ev="http://www.w3.org/2001/xml-events" style="background:transparent;">
      <defs id="defs">
        <style type="text/css">
          .svg-pan-zoom-control:hover {
            fill-opacity: 0.75;
          }
        </style>
      </defs>

      <g id="svg-pan-zoom-controls" transform="scale(0.75)" style="cursor:pointer;" fill="black" fill-opacity="0.333">
        <g id="svg-pan-zoom-zoom-in" transform="translate(30.5 5) scale(0.015)" class="svg-pan-zoom-control">
          <rect x="0" y="0" width="1536" height="1536" fill="transparent" />
          <path d="M1280 576v128q0 26 -19 45t-45 19h-320v320q0 26 -19 45t-45 19h-128q-26 0 -45 -19t-19 -45v-320h-320q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h320v-320q0 -26 19 -45t45 -19h128q26 0 45 19t19 45v320h320q26 0 45 19t19 45zM1536 1120v-960 q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5t84.5 -203.5z" />
        </g>

        <g id="svg-pan-zoom-reset-pan-zoom" transform="translate(5 35) scale(0.4)" class="svg-pan-zoom-control">
          <rect x="0" y="0" width="186" height="62" fill="transparent" />
          <path d="M33.051,20.632c-0.742-0.406-1.854-0.609-3.338-0.609h-7.969v9.281h7.769c1.543,0,2.701-0.188,3.473-0.562
            c1.365-0.656,2.048-1.953,2.048-3.891C35.032,22.757,34.372,21.351,33.051,20.632z"/>
          <path d="M170.231,0.5H15.847C7.102,0.5,0.5,5.708,0.5,11.84v38.861C0.5,56.833,7.102,61.5,15.847,61.5h154.384
            c8.745,0,15.269-4.667,15.269-10.798V11.84C185.5,5.708,178.976,0.5,170.231,0.5z M42.837,48.569h-7.969
            c-0.219-0.766-0.375-1.383-0.469-1.852c-0.188-0.969-0.289-1.961-0.305-2.977l-0.047-3.211c-0.03-2.203-0.41-3.672-1.142-4.406
            c-0.732-0.734-2.103-1.102-4.113-1.102h-7.05v13.547h-7.055V14.022h16.524c2.361,0.047,4.178,0.344,5.45,0.891
            c1.272,0.547,2.351,1.352,3.234,2.414c0.731,0.875,1.31,1.844,1.737,2.906s0.64,2.273,0.64,3.633c0,1.641-0.414,3.254-1.242,4.84
            s-2.195,2.707-4.102,3.363c1.594,0.641,2.723,1.551,3.387,2.73s0.996,2.98,0.996,5.402v2.32c0,1.578,0.063,2.648,0.19,3.211
            c0.19,0.891,0.635,1.547,1.333,1.969V48.569z M75.579,48.569h-26.18V14.022h25.336v6.117H56.454v7.336h16.781v6H56.454v8.883
            h19.125V48.569z M104.497,46.331c-2.44,2.086-5.887,3.129-10.34,3.129c-4.548,0-8.125-1.027-10.731-3.082
            s-3.909-4.879-3.909-8.473h6.891c0.224,1.578,0.662,2.758,1.316,3.539c1.196,1.422,3.246,2.133,6.15,2.133
            c1.739,0,3.151-0.188,4.236-0.562c2.058-0.719,3.087-2.055,3.087-4.008c0-1.141-0.504-2.023-1.512-2.648
            c-1.008-0.609-2.607-1.148-4.796-1.617l-3.74-0.82c-3.676-0.812-6.201-1.695-7.576-2.648c-2.328-1.594-3.492-4.086-3.492-7.477
            c0-3.094,1.139-5.664,3.417-7.711s5.623-3.07,10.036-3.07c3.685,0,6.829,0.965,9.431,2.895c2.602,1.93,3.966,4.73,4.093,8.402
            h-6.938c-0.128-2.078-1.057-3.555-2.787-4.43c-1.154-0.578-2.587-0.867-4.301-0.867c-1.907,0-3.428,0.375-4.565,1.125
            c-1.138,0.75-1.706,1.797-1.706,3.141c0,1.234,0.561,2.156,1.682,2.766c0.721,0.406,2.25,0.883,4.589,1.43l6.063,1.43
            c2.657,0.625,4.648,1.461,5.975,2.508c2.059,1.625,3.089,3.977,3.089,7.055C108.157,41.624,106.937,44.245,104.497,46.331z
             M139.61,48.569h-26.18V14.022h25.336v6.117h-18.281v7.336h16.781v6h-16.781v8.883h19.125V48.569z M170.337,20.14h-10.336v28.43
            h-7.266V20.14h-10.383v-6.117h27.984V20.14z"/>
        </g>

        <g id="svg-pan-zoom-zoom-out" transform="translate(30.5 70) scale(0.015)" class="svg-pan-zoom-control">
          <rect x="0" y="0" width="1536" height="1536" fill="transparent" />
          <path d="M1280 576v128q0 26 -19 45t-45 19h-896q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h896q26 0 45 19t19 45zM1536 1120v-960q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5 t84.5 -203.5z" />
        </g>
      </g>
    </svg>
        //*/





  }

};
