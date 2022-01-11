///<reference path="../typings/global.d.ts">
/*:: declare var RED: Object */

// Isolate this code
(function () {
  'use strict'
  
  // @ts-ignore
  const RED = window.RED

  /** Module name must match this nodes html file @constant {string} moduleName */
  const moduleName = 'wiser'
  /** Node's label @constant {string} paletteCategory */
  const nodeLabel = moduleName
  /** Node's palette category @constant {string} paletteCategory */
  const paletteCategory = 'home automation'
  /** Node's background color @constant {string} paletteColor */
  const paletteColor = '#F6E0F8' // '#E6E0F8'

  /** Prep for edit
   * @param {*} node A node instance as seen from the Node-RED Editor
   */
  function onEditPrepare (node) {

  } // ----- end of onEditPrepare() ----- //

  RED.nodes.registerType(moduleName, {
    category: paletteCategory,
    color: paletteColor,
    defaults: {
      name: { value: ''},
    },
    credentials: {
      host: { type:'text' },  // text or password
      secret: { type:'text' },  // text or password
    },
    // align:'right',
    inputs: 1,
    inputLabels: 'Msg to cache or cache control msg',
    outputs: 1,
    outputLabels: ['Through msg or msg from cache'],
    icon: 'parser-json.svg',
    paletteLabel: nodeLabel,
    label: function () { 
      return this.name || nodeLabel
    },

    oneditprepare: function () { onEditPrepare(this) },
        
  }) // ---- End of registerType() ---- //

}())
