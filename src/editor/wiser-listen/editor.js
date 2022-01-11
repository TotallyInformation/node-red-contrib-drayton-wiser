/* eslint-disable strict */

// Isolate this code
(function () {
    'use strict'

    const nodeLabel = 'wiser-listen'

    RED.nodes.registerType(nodeLabel, {
        category: 'home automation',
        color: '#F6E0F8', //'#E6E0F8',
        defaults: {
            name: { value: '' },
            eventname: { value: '', required: true },
        },
        inputs: 0,
        //inputLabels: 'Msg with topic property',
        outputs: 1,
        outputLabels: ['Data from event'],
        icon: 'ui_template.png',
        paletteLabel: nodeLabel,
        label: function () { return this.name || `wiser/${this.eventname}` || nodeLabel },
        
    }) // ---- End of registerType() ---- //

}())
