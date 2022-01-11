/** Monitor and control a Drayton Wiser smart home heating system.
 * 
 * Copyright (c) 2022 Julian Knight (Totally Information)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict'

/** --- Type Defs ---
 * @typedef {import('../typedefs.js').runtimeRED} runtimeRED
 * @typedef {import('../typedefs.js').runtimeNodeConfig} runtimeNodeConfig
 * @typedef {import('../typedefs.js').runtimeNode} runtimeNode
 * @typedef {import('../typedefs.js').wiserNode1} wiserNodeExt
 * @typedef {runtimeNode & wiserNodeExt} wiserNode
 * @typedef {import('../typedefs.js').wiserModVar1} wiserModVar
 */

//#region ------ Require packages ------ //
const wiser = require('./libs/wiser-class.js')
//#endregion ----- Require packages ----- //

//#region ----- Module level variables ---- //

/** Main (module) variables - acts as a configuration object
 *  that can easily be passed around.
 */
const mod = {
    /** @type {runtimeRED} Reference to the master RED instance */
    RED: undefined,
    /** @type {string} Custom Node Name - has to match with html file and package.json `red` section */
    nodeName: 'wiser',
}

//#endregion ----- Module level variables ---- //

//#region ----- Module-level support functions ----- //

/** 1a) All of the initialisation of the Node
 * This is only run once no matter how many uib node instances are added to a flow
 */
function runtimeSetup() {

    /** Pass module-level config var to the wiser class instance */
    wiser.setup(mod)

} // --- end of runtimeSetup --- //

/** 3) Run whenever a node instance receives a new input msg
 * NOTE: `this` context is still the parent (nodeInstance).
 * See https://nodered.org/blog/2019/09/20/node-done 
 * @param {object} msg The msg object received.
 * @param {Function} send Per msg send function, node-red v1+
 * @param {Function} done Per msg finish function, node-red v1+
 * @this {wiserNode}
 */
function inputMsgHandler(msg, send, done) { // eslint-disable-line no-unused-vars
    // As a module-level named function, it will inherit `mod` and other module-level variables

    // If you need it - or just use mod.RED if you prefer:
    //const RED = mod.RED

    switch (msg.request) {

        case 'battery': {
            msg.payload = wiser.getBatteryLevels(msg.requestDetail)
            this.send(msg)            
            break
        }
    
        case 'temp':
        case 'temps':
        case 'temperatures':
        case 'temperature': {
            msg.payload = wiser.getRoomTemps(msg.requestDetail)
            this.send(msg)            
            break
        }
    
        case 'offline-devices': {
            msg.payload = wiser.getOfflineDevices()
            this.send(msg)            
            break
        }

        case 'isOnline':
        case 'is-online':
        case 'is_online':
        case 'isonline': {
            msg.payload = wiser.lastConnectionSuccessful
            this.send(msg)            
            break
        }
    
        case 'latest': {
            msg.payload = wiser.latest
            this.send(msg)            
            break
        }

        case 'system-state': {
            msg.payload = wiser.getSystemState()
            this.send(msg)            
            break
        }

        case 'request-names': {
            msg.payload = {
                'battery': 'Output battery levels for all devices. Optional requestDetail=[1 or more battery levels]. Eg ["Dead"`, "Low"]', 
                'temps': 'Output temperatures for every room. Optional requestDetail=["<", degC] or [">", degC]. e.g. ["<",18]',
                'offline-devices': 'Lists any devices (TRV\'s, Roomstats, etc) that are currently not connected to the controller over the Zigbee network',
                'isonline': 'Is the controller currently online?',
                'system-state': 'Data about the current state of the overall system',
                'latest': 'Output the current full list of properties',
                'event-names': 'Output a list of all event names with explanations', 
                'request-names': 'Output a list of all requests with explanations (this list)',
            }
            this.send(msg)            
            break
        }
    
        case 'event-names': {
            msg.payload = {
                'wiser/monitor-interval-created': 'When the monitor is create. Data is a reference to the monitor\'s interval object.',
                'wiser/monitor-interval-removed': 'When the monitor is removed',
                'wiser/monitor-intervalmonitor-interval': 'Every time the monitor gets a full update from the controller',
                'wiser/cloudConnection': 'When the status of the controller to Wiser Cloud connection changes',
                'wiser/changes': 'Value difference between previous and current calls to the controller. Data is an object detailing the change.',
                'wiser/online': 'When the online status of the controller changes. Data is `true` if the controller can be contacted.', 
                'wiser/debug': 'All debug messages. May include extra data.',
                'wiser/battery-levels': 'When getBatteryLevels completes. Data is all devices having batteries.',
                'wiser/error/get-battery-levels': 'When getBatteryLevels errors.',
                'wiser/room-temperatures': 'When getRoomTemps completes. Data is all devices having batteries.',
                'wiser/error/get-room-temperatures': 'When getRoomTemps returns an error',
                'wiser/offline-devices': 'When getOfflineDevices completes. Data is all devices currently offline because of no battery or some other reason.',
                'wiser/error/get-offline-devices': 'When getOfflineDevices fails to complete.',
                'wiser/system-state': 'When getSystemState completes. Data is the main system and heating channel states',
                'wiser/success/get-all': 'If a call to the controller for all data succeeds',
                'wiser/error/get-all': 'If a call to the controller for all data fails. Reason given in the data',
                'wiser/success/room-map': 'If the device->room map successfully updated.',
                'wiser/error/room-map': 'If the device->room map failed to update.',
                'wiser/error/gateway-unreachable': 'When the server\'s default gateway is inaccessible (e.g. the network is unavailable). Output on each call to the controller.',
                'wiser/error/controller-unreachable': 'When the controller cannot be reached over the network but the gateway is OK. Output on each call to the controller.',
                'wiser/error/*': 'Subscribes to all error events. Data contains details.',
                'wiser/success/*': 'Subscribes to all successe events.',
                'wiser/**': 'Subscribes to all events.',
            }
            this.send(msg)            
            break
        }
    
        default: {
            break
        }
    }

    // We are done
    //done()

} // ----- end of inputMsgHandler ----- //

/** 2) This is run when an actual instance of our node is committed to a flow
 * type {function(this:runtimeNode&senderNode, runtimeNodeConfig & senderNode):void}
 * @param {runtimeNodeConfig & wiserNode} config The Node-RED node instance config object
 * @this {wiserNode}
 */
function nodeInstance(config) {
    // As a module-level named function, it will inherit `mod` and other module-level variables

    // If you need it - which you will here - or just use mod.RED if you prefer:
    const RED = mod.RED

    // Create the node instance - `this` can only be referenced AFTER here
    RED.nodes.createNode(this, config)

    /** Transfer config items from the Editor panel to the runtime */
    this.name = config.name
    this.host = this.credentials.host
    this.secret = this.credentials.secret

    // Get ref to this node's context store
    //  const context = this.context()
    //  this.getC = context.get
    //  this.setC = context.set

    // We can't do anything without these 2, don't even try
    if ( this.host === undefined || this.host === '' ) return
    if ( this.secret === undefined || this.secret === '' ) return

    wiser.instanceSetup(this)
        .then((connectSuccessful) => {
            //console.log(`>> connect success? >>`, connectSuccessful)        
        }).catch((err) => {
            RED.log.error(`[wiser:nodeInstance:instanceSetup] Instance Setup FAILED. ${err}`)
        })
    
    // Create a monitor that runs every 60s (wiser.defaults.MONITOR_LOOP_INTERVAL changes the interval)
    this.monitor = wiser.createMonitor()

    /** Handle incoming msg's - note that the handler fn inherits `this` */
    this.on('input', inputMsgHandler)


    /** Put things here if you need to do anything when a node instance is removed
     * Or if Node-RED is shutting down.
     * Note the use of an arrow function, ensures that the function keeps the
     * same `this` context and so has access to all of the node instance properties.
     */
    this.on('close', (removed, done) => { 
        //console.log('>>>=[IN 4]=>>> [nodeInstance:close] Closing. Removed?: ', removed)

        wiser.destroyMonitor(this.monitor)

        done()
    })

    /** Properties of `this`
     * Methods: updateWires(wires), context(), on(event,callback), emit(event,...args), removeListener(name,listener), removeAllListeners(name), close(removed)
     *          send(msg), receive(msg), log(msg), warn(msg), error(logMessage,msg), debug(msg), trace(msg), metric(eventname, msg, metricValue), status(status)
     * Other: credentials, id, type, z, wires, x, y
     * + any props added manually from config, typically at least name and topic
     */
} // ----- end of nodeInstance ----- //

//#endregion ----- Module-level support functions ----- //

/** 1) Complete module definition for our Node. This is where things actually start.
 * @param {runtimeRED} RED The Node-RED runtime object
 */
function UibWiser(RED) {
    // As a module-level named function, it will inherit `mod` and other module-level variables

    // Save a reference to the RED runtime for convenience
    mod.RED = RED

    runtimeSetup() // (1a)

    /** Register a new instance of the specified node type (2)
     * 
     */
    RED.nodes.registerType(mod.nodeName, nodeInstance, {
        credentials: {
            host: {type: 'text'},
            secret: {type: 'text'},
        }
    })
}

// Export the module definition (1), this is consumed by Node-RED on startup.
module.exports = UibWiser

//EOF
 