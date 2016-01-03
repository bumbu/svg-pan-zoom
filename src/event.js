var Utils = require('./utilities')
  ;

var SvgPanZoomEvent = {
  /**
   * Original event
   *
   * @type {Event|Object|null}
   */
  originalEvent: null

  /**
   * Event data
   *
   * @type {Object|null}
   */
, data: null

  /**
   * Event namespace
   * Default is `__system`
   * Public API uses `__user`
   * Plugins use `pluginName`
   *
   * @type {String}
   */
, namespace: '__system'

  /**
   * Event propagation allowance through middlewares
   *
   * @type {Boolean}
   * @default true
   */
, isPropagating: true

  /**
   * Should the event be prevented from default (core) action
   *
   * @type {Boolean}
   * @default false
   */
, isPrevented: false

  /**
   * Stops event propagation
   */
, stopPropagation: function() {
    this.isPropagating = false
    this.isPrevented = true
  }

  /**
   * Prevents default (core) action
   */
, preventDefault: function() {
    this.isPrevented = true
  }

  /**
   * Stops event propagation but doesn't prevent default (core) action
   */
, passThrough: function() {
    this.isPropagating = false
  }
}

module.exports = {
  create: function(data, namespace, originalEvent) {
    var event = Object.create(SvgPanZoomEvent)

    // Add data attributes
    data != null && (event.data = data)
    namespace != null && (event.namespace = namespace)
    originalEvent != null && (event.originalEvent = originalEvent)

    return event
  }
}
