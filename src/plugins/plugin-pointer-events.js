;(function(){
  // States
  var IDLE = 0
    , PANNING = 1

  var defaultOptions = {
    eventsListenerElement: null
  }

  function PluginPointerEvents(api, options) {
    this.api = api
    this.options = api.getUtils().extend(api.getUtils().extend({}, defaultOptions), options)
    this.lastPoint = {
      clientX: 0
    , clientY: 0
    }
    this.state = IDLE

    this.initHooks();
  }

  PluginPointerEvents.prototype.initHooks = function() {
    var target = this.options.eventsListenerElement || this.api.getSvg()
      , that = this

    this.start = this.api.getUtils().bind(this._start, this)
    this.move = this.api.getUtils().bind(this._move, this)
    this.end = this.api.getUtils().bind(this._end, this)

    // Hook events
    for (var event in this.events) {
      target.addEventListener(event, this[this.events[event]], false)
    }

    // Unhook events on plugin destruction
    this.api.on('before:plugin:remove', function(ev) {
      if (ev.data.name === 'pointer-events') {
        for (var event in that.events) {
          target.removeEventListener(event, that[that.events[event]], false)
        }
      }
    })
  }

  PluginPointerEvents.prototype.events = {
    'mousedown': 'start'
  , 'touchstart': 'start'
  , 'mousemove': 'move'
  , 'touchmove': 'move'
  , 'mouseup': 'end'
  , 'touchend': 'end'
  , 'mouseleave': 'end'
  , 'touchleave': 'end'
  , 'touchcancel': 'end'
  }

  PluginPointerEvents.prototype._start = function(ev) {
    this.api.getUtils().mouseAndTouchNormalize(ev, this.api.getSvg())

    // Cache
    this.lastPoint.clientX = ev.clientX
    this.lastPoint.clientY = ev.clientY

    console.log(ev, this.lastPoint)

    if (this.api.trigger('pointer:start', this.lastPoint, ev)) {
      this.state = PANNING
    }
  }

  PluginPointerEvents.prototype._move = function(ev) {
    this.api.getUtils().mouseAndTouchNormalize(ev, this.api.getSvg())

    var point = {
      clientX: ev.clientX
    , clientY: ev.clientY
    }

    if (this.api.trigger('pointer:move', point, ev)) {
      if (this.state === PANNING) {
        this.api.panBy({
          x: point.clientX - this.lastPoint.clientX
        , y: point.clientY - this.lastPoint.clientY
        })
      }

      // Update cache
      this.lastPoint.clientX = point.clientX
      this.lastPoint.clientY = point.clientY
    }
  }

  PluginPointerEvents.prototype._end = function(ev) {
    var point = {
      clientX: ev.clientX
    , clientY: ev.clientY
    }

    if (this.api.trigger('pointer:end', point, ev)) {
      this.state = IDLE

      // Update cache
      this.lastPoint.clientX = point.clientX
      this.lastPoint.clientY = point.clientY
    }
  }

  // Plugin entry point
  // ==================

  function pluginPointerEvents(api, options) {
    return new PluginPointerEvents(api, options)
  }

  svgPanZoom.register('pointer-events', pluginPointerEvents)
})();
