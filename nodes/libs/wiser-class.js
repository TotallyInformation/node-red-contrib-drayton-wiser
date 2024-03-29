/* eslint-disable class-methods-use-this */
/** Monitor and Manage Drayton Wiser smart home heating.
 * 
 * Copyright (c) 2022 Julian Knight (Totally Information)
 * https://it.knightnet.org.uk, https://github.com/TotallyInformation/node-red-contrib-drayton-wiser
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 'use strict'

/** --- Type Defs ---
  * @typedef {import('../../typedefs.js').runtimeRED} runtimeRED
  * @typedef {import('../../typedefs.js').runtimeNode} runtimeNode
  * @typedef {import('../../typedefs.js').wiserNode1} wiserNodeExt
  * @typedef {runtimeNode & wiserNodeExt} wiserNode
  * @typedef {import('../../typedefs.js').wiserModVar1} wiserModVar
  */
 
//const path = require('path')
const util = require('util')
//const fs = require('fs-extra')
const tiEvents = require('@totallyinformation/ti-common-event-handler')
const http = require('http')
const axios = require('axios').default /** see https://github.com/axios/axios */
//const { diff, addedDiff, deletedDiff, detailedDiff, updatedDiff } = require('deep-object-diff')
const { updatedDiff } = require('deep-object-diff') /** see https://www.npmjs.com/package/deep-object-diff#updateddiff */
//const { cp } = require('fs')

// tiEvents.onAny(function(event, value) {
//     console.log('TI EVENT: ', event, value);
// })

/** ES6 Simple method of sorting the top-level keys of an object
 * @param {*} out the object to sort
 * @returns {*} out with top-level keys sorted
 */
function simpleObjectSort(out) {
    Object.keys(out).sort().reduce(
        (obj, key) => { 
            obj[key] = out[key]; 
            return obj;
        }, 
        {}
    )
} // ---- End of simpleObjectSort ---- //

class WiserClass {
    // TODO: Replace _XXX with #XXX once node.js v14 is the minimum supported version
    /** Flag to indicate whether setup() has been run
     * @type {boolean}
     * @protected 
     */
    //_isConfigured

    constructor() {
        // setup() has not yet been run
        this._isConfigured = false

        //#region ---- References to core Node-RED & uibuilder objects ---- //

        /** @type {runtimeRED} */
        this.RED = undefined
        /** @type {wiserModVar} Reference link to the node's module level configuration object */
        this.modConf = undefined
        /** @type {Console|RED.log} Reference to uibuilder's global log functions */
        this.log = console

        //#endregion ---- References to core Node-RED & uibuilder objects ---- //

        /** Defaults */
        this.defaults = {
            /** Minimum allowed setpoint temperature (°C) 
             * @type {number}
             */
            TEMP_MINIMUM: 5,
            /** Maximum allowed setpoint temperature (°C) 
             * @type {number}
             */
            TEMP_MAXIMUM: 30,
            /** Wiser "off" setpoint temperature (°C) 
             * @type {number}
             */
            TEMP_OFF: -20,
            /** Default setpoint temperature for room boost override (°C) 
             * @type {number}
             */
            BOOST_DEFAULT_TEMP: 20,
            /** Default duration for room boost override (minutes)
             * @type {number}
             */
            BOOST_DEFAULT_DURATION: 30,
            /** Default monitor loop interval (seconds)
             * @type {number}
             */
            MONITOR_LOOP_INTERVAL: 60,
        }

        /** URL paths to specific controller data */
        this._servicePathsV1 = {
            baseUrl: 'http://{}/',

            network: '/data/network/', // Controller's network info including curr/max/min WiFi signal strength
            wifiRSSI: '/data/network/Station/RSSI/',

            full: '/data/domain/',  // System, Cloud, HeatingChannel, Room, Device, Zigbee, UpgradeInfo, SmartValve, RoomStat, DeviceCapabilityMatrix, Schedule

            brandName: '/data/domain/System/BrandName/', // Used for quick check of valid connection, always returns 'WiserHeat'
            devices: '/data/domain/Device/',
            heating: '/data/domain/HeatingChannel/',
            rooms: '/data/domain/Room/',
            roomStats: '/data/domain/RoomStat/',
            schedules: '/data/domain/Schedule',
            system: '/data/domain/System/',
            trvs: '/data/domain/SmartValve/',
        }
        this._servicePaths = {
            baseUrl: 'http://{}/data/v2/',

            network: 'network/', // Controller's network info including curr/max/min WiFi signal strength
            wifiRSSI: 'network/Station/RSSI/',

            schedules: 'schedules/',

            full:      'domain/',              // System, Cloud, HeatingChannel, Room, Device, Zigbee, UpgradeInfo, SmartValve, RoomStat, DeviceCapabilityMatrix, Schedule
            devices:   'domain/Device/',       // append device id to get to a single device
            heating:   'domain/HeatingChannel/',
            rooms:     'domain/Room/',        // append room id to get to a single device
            roomStats: 'domain/RoomStat/',    // append device id to get to a single device
            system:    'domain/System/',
            brandName: 'domain/System/BrandName/', // Used for quick check of valid connection, always returns 'WiserHeat'
            trvs:      'domain/SmartValve/',  // append device id to get to a single device
        }
        /*
            WISERDEVICE = "Device/{}"
            WISERHOTWATER = "HotWater/{}"
            WISERSMARTPLUG = "SmartPlug/{}"
            WISERHEATINGACTUATOR = "HeatingActuator/{}"
            WISERSHUTTER = "Shutter/{}"
            WISERLIGHT = "Light/{}"
         */

        /** Default configuration for Axios promised-based http request handler
        * @see https://github.com/axios/axios#request-config
        * @type {import('axios').AxiosRequestConfig}
        */
        this._axiosConfig = {
            //url: undefined,
            //baseURL: undefined,
            //method: undefined,
            headers: {
                'SECRET': undefined,
                'Content-Type': 'application/json;charset=UTF-8',
            },
            httpAgent: new http.Agent({ keepAlive: true }),
        }

        /** @type {Date | undefined} Timestamp of last successful connection to the controller */
        this.lastConnection = undefined
        /** @type {boolean} Was the last connection to the controller successful? */
        this.lastConnectionSuccessful = false
        /** @type {object | undefined} The full controller data from last successful getAll */
        this.latest = undefined
        /** @type {object | undefined} The previous successful getAll data (used for deep diff) */
        this.prev = undefined
        /** @type {object | undefined} Changes in this.latest from this.prev */
        this.changes = {}
        /** @type {object | undefined} Map device id's to rooms. Rebuilt on every this.getAll() */
        this.deviceRoomMap = undefined
        /** @type {NodeJS.Timer | undefined} Reference to monitor interval timer */
        this.monitor = undefined
        /** @type {object} Timestamp each device last seen active (battery not dead and signal strength Poor or above). Key'd by device ID */
        this.deviceLastSeen = {}

    } // ---- End of constructor ---- //

    /** Output debug info if required
     * @param {string} fnName Function name to include at start of debug output
     * @param {string} [msg] The debug output string. Defaults to '>>>>' if not provided
     * @param {*} [obj] Optional object to output
     */
    debug(fnName, msg = '>>>>', obj = undefined) {
        let log = this.log.info

        let o
        if ( obj === undefined) o = ''

        try {
            //o = JSON.stringify(obj, null, 2)
            o = util.inspect(obj, {
                depth:2,
                colors: true,
                showProxy: true,
                compact: false, // default 3
            })
        } catch (e) {
            o = obj.toString()
        }

        log(`[wiser:wiser-class.js:${fnName}] ${msg}${obj === undefined ? '' : ` ::\n${o}`}`)

        tiEvents.emit('wiser/debug', {
            module: 'libs/wiser.js',
            fnName: fnName,
            msg: msg,
            obj: obj,
        })

    } // ---- End of debug ---- //
        
    /** Configure this class with uibuilder module specifics
     * @param {wiserModVar} modConf Module-level configuration object
     */
    setup( modConf ) {
        // Prevent setup from being called more than once
        if ( this._isConfigured === true ) {
            modConf.RED.log.warn('[uibuilder:UibPackages:setup] Setup has already been called, it cannot be called again.')
            return
        }

        if ( ! modConf ) {
            throw new Error('[wiser:wiser-class.js:setup] Called without required module config var parameter')
        }

        this.RED = modConf.RED
        this.modConf = modConf
        this.log = modConf.RED.log

        // At this point we have the refs to uib and RED
        this._isConfigured = true

        this.debug('setup', 'Setup fn complete') //, this)

    } // ---- End of setup ---- //

    /** Return the latest entry for a specified room from either the id or the name
     * @returns {any|undefined} Only returns a single entry from latest.Room (or undefined)
     */
    returnRoom(roomIdOrName) {
            // Allow for either room id or name to be used            
            let room, roomName, roomId

            if ( typeof roomIdOrName === 'number' ) {
                roomId = roomIdOrName
                room = this.latest.Room.filter( rm => { return rm.id === roomId })
                roomName = room[0].Name || 'Undefined'
            } else {
                roomName = roomIdOrName
                room = this.latest.Room.filter( rm => { return rm.Name.toLowerCase() === roomName.toLowerCase() })
                roomId = room[0].id || 'Undefined'
            }

            return room[0]
    }

    //#region ===== Data processing functions ===== //

    //#region = = = = Remote Get (axios) = = = = //

    /** Test whether we can successfully connect to the controller
     * @returns {Promise<boolean>} True if connection to controller is successful else false
     */
    async testConnection() {
        if (!this._axiosConfig.baseURL || !this._axiosConfig.headers.SECRET) {
            throw Error ('[wiser:wiser-class.js:testConnection] both IP and SECRET must be provided before testing the connection, call instanceSetup() first')
        }

        this.debug('testConnection', 'Trying Test Connection') //, this._axiosConfig)

        // Make a request
        let res
        try {
            // Should return res.data = 'WiserHeat'
            res = await axios.get(this._servicePaths.brandName, this._axiosConfig)
            tiEvents.emit('wiser/success/test-connection', res )
            this.debug('testConnection', 'Test Connection successful') //, res.data)
            return true
        } catch (e) {
            tiEvents.emit('wiser/error/test-connection', e )
            this.debug('testConnection', 'Test Connection FAILED', e.message)
            return false
        }
    } // ---- End of testConnection ---- //

    /** Get all data from controller */
    async apiGetAll() {

        if (!this._axiosConfig.baseURL || !this._axiosConfig.headers.SECRET) {
            throw Error ('[wiser:wiser-class.js:apiGetAll] both IP and SECRET must be provided before testing the connection, call instanceSetup() first')
        } 

        //this.debug('getAll', 'API get all from controller') //, this._axiosConfig)

        // Make a request for all data from the controller using axios
        let res
        try {
            res = await axios.get(this._servicePaths.full, this._axiosConfig)
        } catch (e) {
            // Only report change of status
            if ( this.lastConnectionSuccessful === true ) {
                tiEvents.emit('wiser/online', false )
                //this.debug('apiGetAll', 'Controller now OFFLINE')
                this.log.warn(`[wiser:wiser-class.js:apiGetAll] Controller CANNOT BE REACHED. Is it online?`)
            }
            this.lastConnectionSuccessful = false

            // If controller cant be reached, check if the network is up as well
            if ( e.code === 'EHOSTUNREACH' || e.code === 'ETIMEDOUT' ) {
                if ( ! await this.checkGateway() ) {
                    e = {code: 'EGATEWAYUNREACH', message: 'Netowrk down. Default gateway is unreachable'}
                    tiEvents.emit('wiser/error/gateway-unreachable', e )
                } else {
                    e = {code: 'ECONTROLLERUNREACH', message: `Wiser controller is unreachable at ${e.address}`}
                    tiEvents.emit('wiser/error/controller-unreachable', e )
                }
            }

            tiEvents.emit('wiser/error/get-all', e )
            //this.debug('apiGetAll', 'API get All FAILED', e.message)
            this.log.warn(`[wiser:wiser-class.js:apiGetAll] API get All FAILED ${e.message}`)
            //throw new Error(`[wiser:wiser-class.js:getAll] Call to controller failed. ${e.message}`)

            return false
        } 

        // Update this.latest. Enrich data
        this.updateLatest(res.data)

        // Do these AFTER updateLatest
        this.doDeviceRoomMap()
        this.enrichDeviceData() // must be after doDeviceRoomMap

        // Do these last
        this.diffAll() // also updates this.prev from this.latest
        this.checkCloudConnection()

        // Only report change of status
        if ( this.lastConnectionSuccessful !== true ) {
            tiEvents.emit('wiser/online', true )
            //this.debug('apiGetAll', 'Controller now online')
            this.log.info(`[wiser:wiser-class.js:apiGetAll] Controller REACHABLE`)
        }
        this.lastConnectionSuccessful = true
        this.lastConnection = new Date()    

        tiEvents.emit('wiser/success/get-all', res.data )
        //this.debug('apiGetAll', 'API get All successful') //, res.data)
        this.log.trace(`[wiser:wiser-class.js:apiGetAll] API get All successful`)

        return true

    } // ---- End of apiGetAll ---- //

    /** Get network data from controller
     * @returns {*} Either an error object or the data returned from the API call
     */
    async apiGetNetwork() {

        if (!this._axiosConfig.baseURL || !this._axiosConfig.headers.SECRET) {
            throw Error ('[wiser:wiser-class.js:apiGetNetwork] both IP and SECRET must be provided before testing the connection, call instanceSetup() first')
        } 

        this.debug('apiGetNetwork', 'API Get network details from controller') //, this._axiosConfig)

        // Make a request for all data from the controller using axios
        let res
        try {
            res = await axios.get(this._servicePaths.network, this._axiosConfig)

            tiEvents.emit('wiser/success/get-api-network', res.data )
            this.debug('apiGetNetwork', 'API get network successful') //, res.data)
    
            return res.data
        } catch (e) {
            tiEvents.emit('wiser/error/get-api-network', e )
            this.debug('apiGetNetwork', 'API get network FAILED', e.message)

            return e
        }

    } // ---- End of getAll ---- //

    /** Get schedule data from controller
     * @param {number} schedId Schedule ID to list
     * @returns {*} Either an error object or the data returned from the API call
     */
     async apiGetSchedule(schedId) {

        if (!this._axiosConfig.baseURL || !this._axiosConfig.headers.SECRET) {
            throw Error ('[wiser:wiser-class.js:apiGetSchedule] both IP and SECRET must be provided before testing the connection, call instanceSetup() first')
        } 

        this.debug('apiGetSchedule', 'API Get schedule details from controller') //, this._axiosConfig)

        let uri = schedId ? `${this._servicePaths.schedules}${schedId}/` : this._servicePaths.schedules

        // Make a request for all data from the controller using axios
        let res
        try {
            res = await axios.get(uri, this._axiosConfig)

            tiEvents.emit('wiser/success/get-api-schedule', res.data )
            this.debug('apiGetSchedule', 'API get schedule successful') //, res.data)
    
            return res.data
        } catch (e) {
            tiEvents.emit('wiser/error/get-api-schedule', e )
            this.debug('apiGetSchedule', 'API get schedule FAILED', e.message)

            return e
        }

    } // ---- End of apiGetSchedule ---- //

    /** Mark whether the last connection to the controller was successful
     * - called where getAll is called - instanceSetup() and monitor()
     * @param {boolean} success True if connection was successful, else false
     */
    updateLastConnection(success) {

        this.lastConnectionSuccessful = success
        if ( success === true ) this.lastConnection = new Date()

    } // ---- End of updateLastConnection ---- //

    /** Update latest data from getAll
     * @param {object} data Full data from controller
     */
    updateLatest(data) {
        /** We are not interested in the controllers timestamp changes */
        delete data.System.UnixTime
        delete data.System.LocalDateAndTime

        this.latest = data
        this.latest.updated = new Date()
    } // ---- End of updateLatest ---- //

    /** Run a deep diff on new getAll data to record changes & then update this.prev from this.latest */
    diffAll() {

        // No point in diff'ing if there is no previous value
        if (this.prev === undefined) {
            this.prev = this.latest
            return
        }

        /** What has changed? see https://www.npmjs.com/package/deep-object-diff#updateddiff */
        let dataDiff = updatedDiff(this.prev, this.latest)

        /** Deconstruct the differences and emit as individual events */
        Object.keys(dataDiff).forEach( type => {

            let item = dataDiff[type]

            Object.keys(item).forEach( i => {

                let data = item[i]

                // We don't want these bits as they change too much or aren't interesting
                delete data.ReceptionOfController
                delete data.ReceptionOfDevice
                delete data.PendingZigbeeMessageMask

                // If we actually have some changes
                if (Object.values(data).length > 0 ) {

                    /** Data for wiserChange event.
                     * @type {object}
                     * @property {Date} updated - JavaScript timestamp of the detection of the change
                     * @property {string} type - The type of change (e.g. Device, Room, etc)
                     * @property {string|number} idx - The index of the thing that has changed in the type array
                     * @property {string|number} id - The ID of the thing that has changed
                     * @property {Object} changes - The changed settings:values
                     * @property {Object} prev - The previous settings:values
                     * @property {string} [room] - Room name (only for Room changes or devices where the room is known)
                     */
                    let changes = this.changes = {
                        'updated': new Date(), 
                        'type': type, 
                        'idx': i,
                        'id': this.latest[type][i].id, 
                        'changes': data,
                    }

                    /** Add in the previous matching settings */
                    let prevData = {}
                    Object.keys(data).forEach( chgProp => {
                        prevData[chgProp] = this.prev[type][i][chgProp]
                    })
                    changes.prev = prevData

                    /** Add in room name if available */
                    if (type === 'Room') changes.room = this.latest[type][i].Name
                    else if ( this.deviceRoomMap[ this.latest[type][i].id ] ) changes.room = this.deviceRoomMap[ this.latest[type][i].id ].roomName

                    /** wiser/changes event. Emitted after getting a full update from the controller when something has changed from the previous update.
                     * @event wiser-class#wiser/changes
                     * @type {object}
                     * @property {Date} updated - JavaScript timestamp of the detection of the change
                     * @property {string} type - The type of change (e.g. Device, Room, etc)
                     * @property {string|number} idx - The index of the thing that has changed in the type array
                     * @property {string|number} id - The ID of the thing that has changed
                     * @property {Object} changes - The changed settings:values
                     * @property {Object} prev - The previous settings:values
                     * @property {string} [room] - Room name (only for Room changes or devices where the room is known)
                     */
                        tiEvents.emit('wiser/changes', changes )

                } // - End of if length>0 - //

            }) // -- End of item.forEach -- //

        }) // -- End of dataDiff.forEach -- //

        /** Save the data */
        this.prev = this.latest
            
    } // ---- End of diffAll ---- //

    /** Check whether the server's default network gateway is accessible
     * @returns {Promise<boolean>}
     */
    async checkGateway() {
        const os = require('os')
        let ping, defaultGateway
        try {
            ping = require('ping')
        } catch (e) {
            this.log.warn('[wiser:wiser-class.js:checkGateway] Cannot require ping module - ensure it is installed')
            return false
        }
        try {
            defaultGateway = require('default-gateway')
        } catch (e) {
            this.log.warn('[wiser:wiser-class.js:checkGateway] Cannot require default-gateway module - ensure it is installed')
            return false
        }

        const nifs = os.networkInterfaces()

        let gw
        try {
            // https://www.npmjs.com/package/default-gateway
            gw = await defaultGateway.v4()
        } catch (e) {
            this.log.warn('[wiser:wiser-class.js:checkGateway] Cannot identify default gateway IP. Requirements: Linux - `ip` cmd, Win - `wmic`')
            return false
        }

        let gwAlive
        try {
            // https://www.npmjs.com/package/ping
            gwAlive = /** @type {unknown} */ (await ping.promise.probe(gw.gateway))
            this.debug('checkGateway', gwAlive ? 'Default gateway is reachable' : 'Default gateway is NOT reachable')
        } catch (e) {
            this.log.warn('[wiser:wiser-class.js:checkGateway] Cannot ping default gateway IP')
            return false
        }

        let defaultIFv4
        try {
            defaultIFv4 = nifs[gw.interface].filter( ipv => ipv.family === 'IPv4')[0]
        } catch (e) {}
        this.debug('checkGateway', `Gateway IP: ${gw.gateway}, External IP: ${defaultIFv4.address}`)

        return /** @type {boolean} */ (gwAlive)

    } // ---- End of checkGateway ---- //

    /** Check whether the controller can access the Wiser Cloud Gateway - only report if status changes
     * @returns {boolean} True if latest.System.CloudConnectionStatus = 'Connected', else false
     */
    checkCloudConnection() {
        const cloudConnection = this.latest.System.CloudConnectionStatus === 'Connected'

        // Only report on change
        if ( this.latest.System.CloudConnectionStatus !== this.prev.System.CloudConnectionStatus ) {
            tiEvents.emit('wiser/cloudConnection', cloudConnection )
            this.debug('checkCloudConnection', this.latest.System.CloudConnectionStatus)    
        }
        
        return cloudConnection
    } // ---- End of checkCloudConnection ---- //
    
    /** Add extra metadata to Devices prop of this.latest. Must run AFTER deviceRoomMap() */
    enrichDeviceData() {

        // For each device
        const devices = this.latest.Device
        devices.forEach( device => {
            // Ignore the controller device
            //if (device.id === 0) return

            // Add room name
            if ( this.deviceRoomMap[device.id] ) device.Room = this.deviceRoomMap[device.id].roomName
            else device.Room = 'Undefined'

            // For battery operated devices only, if the battery is dead, manually add missing data
            if ( (device.ProductType === 'RoomStat' || device.ProductType === 'iTRV') && ! device.BatteryVoltage ) {
                device.BatteryVoltage = 0
                device.BatteryLevel = 'Dead'
                device.DisplayedSignalStrength = 'Offline'
            }

            // Update last seen record if signal strength is good and battery not dead & update device.Online
            if ( device.BatteryVoltage !== 0 && device.DisplayedSignalStrength !== 'NoSignal' ) {
                this.deviceLastSeen[device.id] = new Date()
                device.Online = true
            } else {
                device.Online = false
            }
            // DisplayedSignalStrength: VeryGood, Good, Poor, NoSignal, Offline (if battery dead)

        }) // -- End of devices.forEach -- //

    } // ---- End of enrichDeviceData ---- //

    /** Rebuild the roommap (device id => room) */
    doDeviceRoomMap() {
        this.deviceRoomMap = {}

        this.latest.Room.forEach( room => {

            // SmartValves
            if ( room.SmartValveIds ) {
                room.SmartValveIds.forEach( trvId => {
                    this.deviceRoomMap[trvId] = {'roomId': room.id, 'roomName': room.Name, 'type': 'SmartValve'}
                })
            }
            // RoomStats
            if ( room.RoomStatId ) {
                this.deviceRoomMap[room.RoomStatId] = {'roomId': room.id, 'roomName': room.Name, 'type': 'RoomStat'}
            }
            // plugs
            // I don't have any - so this is guesswork - let me know whether it is right or wrong
            if ( room.SmartPlugIds ) {
                room.SmartPlugIds.forEach( plugId => {
                    this.deviceRoomMap[plugId] = {'roomId': room.id, 'roomName': room.Name, 'type': 'SmartPlug'}
                })
            }
        })

        this.deviceRoomMap.updated = new Date()

        tiEvents.emit('wiser/success/room-map', this.deviceRoomMap )

        //console.log('roomMap: ', roomMap)
    } 
    
    //#endregion = = = = Remote Get (axios) = = = = //

    //#region = = = = Monitors = = = = //

    /** Create the monitor interval timer - runs getAll every _defaults.MONITOR_LOOP_INTERVAL seconds
     * @returns {boolean} True if monitor timer created, false if monitor timer already exists.
     */
    createMonitor() {
        if ( this.monitor !== undefined ) {
            this.debug('createMonitor', 'Attempt to re-create monitor - ignored - destroy before recreating')
            return false
        }

        //this.debug('createMonitor', 'Monitor starting.')
        this.log.info(`[wiser:wiser-class.js:createMonitor] Interval=${this.defaults.MONITOR_LOOP_INTERVAL}s`)

        this.monitor = setInterval(async () => {

            tiEvents.emit('wiser/monitor-interval', {timestamp: new Date(), interval: this.defaults.MONITOR_LOOP_INTERVAL} )
            this.log.trace(`[wiser:wiser-class.js:createMonitor] Monitor loop. Interval=${this.defaults.MONITOR_LOOP_INTERVAL}s`)

            await this.apiGetAll()

        }, this.defaults.MONITOR_LOOP_INTERVAL * 1000 ) // --- End of setInterval --- //

        tiEvents.emit('wiser/monitor-interval-created', this.monitor )

        return true
    } // ---- End of createMonitor ---- //

    /** Destroy the monitor interval timer
     * @param {NodeJS.Timer} monitorIntervalRef Reference to monitor interval timer
     * @returns {boolean} True if monitor timer created, false if monitor timer already exists.
     */
    destroyMonitor(monitorIntervalRef) {
        if ( this.monitor === undefined ) {
            this.log.debug('[wiser:wiser-class.js:destroyMonitor] Attempt to destroy non-existent monitor - ignored')
            return false
        }

        this.log.trace('[wiser:wiser-class.js:destroyMonitor] Monitor ending')

        clearInterval(monitorIntervalRef)
        this.monitor = undefined
        
        tiEvents.emit('wiser/monitor-interval-removed' )
        this.log.trace('[wiser:wiser-class.js:destroyMonitor] Monitor interval timer removed')

        return true
    } // ---- End of destroyMonitor ---- //

    //#endregion = = = = Monitors = = = = //

    //#region = = = = return specific data = = = = //

    /** Returns all battery devices (with optional battery level filter)
     * @param {string|[string]} level One or an array of battery level names
     * @returns {*} Null or object containing data key'd on device id, plus "updated" property
     */
    getBatteryLevels(level) {

        if ( typeof level === 'string' ) level = [level]

        let out = {}

        //if ( Object.keys(this.latest).length < 1 ) node.warn('flow.wiserData is empty!')

        if ( ! this.latest.Device || this.latest.Device.length <1 ) {
            tiEvents.emit('wiser/error/get-battery-levels', 'No Devices in latest data' )
            this.debug('getBatteryLevels', 'No Devices in latest data', Object.keys(this.latest))
            return undefined
        }
        
        this.latest.Device.forEach( device => {

            // Ignore mains-powered devices
            if ( device.ProductType === 'Controller' ) return

            // Ignore if level provided and it doesn't match the device's battery level
            if (level !== undefined && ! level.includes(device.BatteryLevel) ) return
        
            const davId = `${device.Room.replace(' ','_')}-${device.ProductType}-${device.id}`

            out[davId] = {
                'Room': device.Room,
                'BatteryVoltage': device.BatteryVoltage / 10,
                'BatteryLevel': device.BatteryLevel,
                'SignalStrength': device.DisplayedSignalStrength,
                'DeviceType': device.ProductType,
                'DeviceId': device.id,
            }

            if ( this.deviceLastSeen[device.id] ) out.lastSeen = this.deviceLastSeen[device.id]
            
        }) // -- End of Device.forEach -- //

        out.updated = this.latest.updated

        // @ts-ignore Sort the output object
        //out = this.simpleObjectSort(out)
        out = Object.keys(out).sort().reduce(
            (obj, key) => { 
                obj[key] = out[key]; 
                return obj;
            }, 
            {}
        )

        tiEvents.emit('wiser/battery-levels', out )
        this.debug('getBatteryLevels', 'Data returned')

        return out

    } // ---- End of getBatteryLevels ---- //

    /** Return all room temperatures (with optional < or > limit)
     * @param {[string,number]} [compare] 2 element array such as `["<", 18]` or `[">", 18]`
     * @returns {*} Null or object containing data key'd on room name, plus "updated" property
     */
    getRoomTemps(compare) {

        // Don't do anything if the compare parameter is invalid
        if ( compare !== undefined && !Array.isArray(compare) && (compare[0] !== '<' || compare[0] !== '>') ) return

        let out = {}

        if ( ! this.latest.Room || this.latest.Room.length <1 ) {
            tiEvents.emit('wiser/error/get-room-temperatures', 'No Rooms in latest data' )
            this.debug('getRoomTemps', 'No Rooms in latest data', Object.keys(this.latest))
            return undefined
        }

        if ( compare !== undefined ) compare[1] = compare[1] * 10

        this.latest.Room.forEach( room => {

            // Ignore rooms with no temperature and no TRV
            if ( room.SetpointOrigin === 'FromNoControl' && room.CalculatedTemperature === -32768 ) return
            // Ignore if compare not true
            if ( compare !== undefined ) {
                if ( compare[0] === '<' && room.CalculatedTemperature > compare[1] ) return
                else if ( compare[0] === '>' && room.CalculatedTemperature < compare[1] ) return
            }

            out[room.Name] = {
                'Room': room.Name,
                'Temperature': room.CalculatedTemperature/10,
                'SetPoint': room.CurrentSetPoint/10,
                'Mode': room.Mode,
                'PercentageDemand': room.PercentageDemand,
                'ControlOutputState': room.ControlOutputState,
                'SetpointOrigin': room.SetpointOrigin,
                'ScheduleId': room.ScheduleId,
                'ScheduledSetPoint': room.ScheduledSetPoint/10,
                'WindowState': room.WindowDetectionActive === true ? room.WindowState : 'N/A',
            }
            
        }) // -- End of Device.forEach -- //

        out.updated = this.latest.updated

        // @ts-ignore Sort the output object
        out = Object.keys(out).sort().reduce(
            (obj, key) => { 
                obj[key] = out[key]; 
                return obj;
            }, 
            {}
        )

        tiEvents.emit('wiser/room-temperatures', out )
        this.debug('getRoomTemps', 'Data returned')

        return out

    } // ---- End of getRoomTemps ---- //

    /** Return all devices (TRV's, Roomstats, etc) that are offline to the controller over Zigbee */
    getOfflineDevices() {

        let out = {}

        if ( ! this.latest.Device || this.latest.Device.length <1 ) {
            tiEvents.emit('wiser/error/get-offline-devices', 'No Devices in latest data' )
            this.debug('getOfflineDevices', 'No Devices in latest data', Object.keys(this.latest))
            return undefined
        }

        this.latest.Device.forEach( device => {

            // Ignore if device is online
            if (device.Online !== undefined && device.Online === true ) return
        
            const davId = `${device.Room.replace(' ','_')}-${device.ProductType}-${device.id}`

            out[davId] = device
        
            if ( this.deviceLastSeen[device.id] ) out.lastSeen = this.deviceLastSeen[device.id]

        }) // -- End of Device.forEach -- //

        out.updated = this.latest.updated

        // @ts-ignore Sort the output object
        out = Object.keys(out).sort().reduce(
            (obj, key) => { 
                obj[key] = out[key]; 
                return obj;
            }, 
            {}
        )

        tiEvents.emit('wiser/offline-devices', out )
        this.debug('getOfflineDevices', 'Data returned')

        return out

    } // ---- End of getRoomTemps ---- //

    /** Return the state of the overal system */
    getSystemState() {

        let out = {
            HeatingButtonOverrideState: this.latest.System.HeatingButtonOverrideState,
            UserOverridesActive: this.latest.System.UserOverridesActive,
            HotWaterButtonOverrideState: this.latest.System.HotWaterButtonOverrideState,
        }

        if ( this.latest.HeatingChannel.length = 1 ) {
            out.PercentageDemand = this.latest.HeatingChannel[0].PercentageDemand
            out.DemandOnOffOutput = this.latest.HeatingChannel[0].DemandOnOffOutput
            out.HeatingRelayState = this.latest.HeatingChannel[0].HeatingRelayState
            out.IsSmartValvePreventingDemand = this.latest.HeatingChannel[0].IsSmartValvePreventingDemand
        } else {
            this.latest.HeatingChannel.forEach( channel => {
                out.HeatingChannel = []
                out.HeatingChannel.push({
                    PercentageDemand: channel.PercentageDemand,
                    DemandOnOffOutput: channel.DemandOnOffOutput,
                    HeatingRelayState: channel.HeatingRelayState,
                    IsSmartValvePreventingDemand: channel.IsSmartValvePreventingDemand,
                })
            })
        }

        out.updated = this.latest.updated

        tiEvents.emit('wiser/system-state', out )
        this.debug('getSystemState', 'Data returned')

        return out

    } // ---- End of getSystemState ---- //

    /** Return a list of all event names with brief description */
    getEventNames() {

        return {
            // Monitor outputs
            'wiser/cloudConnection': 
                'When the status of the controller to Wiser Cloud connection changes',
            'wiser/changes': 
                'Value difference between previous and current calls to the controller. Data is an object detailing the change.',
            'wiser/online': 
                'When the online status of the controller changes. Data is `true` if the controller can be contacted.',
            
            // Specific get events (responses to requests)
            'wiser/battery-levels': 
                'When getBatteryLevels completes. Data is all devices having batteries.',
            'wiser/error/get-battery-levels': 
                'When getBatteryLevels errors.',
            'wiser/room-temperatures': 
                'When getRoomTemps completes. Data is all devices having batteries.',
            'wiser/error/get-room-temperatures': 
                'When getRoomTemps returns an error',
            'wiser/offline-devices': 
                'When getOfflineDevices completes. Data is all devices currently offline because of no battery or some other reason.',
            'wiser/error/get-offline-devices': 
                'When getOfflineDevices fails to complete.',
            'wiser/system-state': 
                'When getSystemState completes. Data is the main system and heating channel states',
            'wiser/success/get-api-network': 
                '',
            'wiser/error/get-api-network': 
                '',
            'wiser/success/get-api-schedule': 
                '',
            'wiser/error/get-api-schedule': 
                '',

            // Specific set events (responses to requests)
            'wiser/set/room-temperature': 
                '',
            'wiser/error/set/room-temperature': 
                '',
            '': 
                '',

            // System or node information
            'wiser/monitor-interval-created': 
                'When the monitor is create. Data is a reference to the monitor\'s interval object.',
            'wiser/monitor-interval-removed': 
                'When the monitor is removed',
            'wiser/monitor-intervalmonitor-interval': 
                'Every time the monitor gets a full update from the controller',
            'wiser/debug': 
                'All debug messages. May include extra data.',

            // System or node errors
            'wiser/success/get-all': 
                'If a call to the controller for all data succeeds',
            'wiser/error/get-all': 
                'If a call to the controller for all data fails. Reason given in the data',
            'wiser/success/room-map': 
                'If the device->room map successfully updated.',
            'wiser/error/room-map': 
                'If the device->room map failed to update.',
            'wiser/error/gateway-unreachable': 
                'When the server\'s default gateway is inaccessible (e.g. the network is unavailable). Output on each call to the controller.',
            'wiser/error/controller-unreachable': 
                'When the controller cannot be reached over the network but the gateway is OK. Output on each call to the controller.',

            // Wildcards
            'wiser/error/**': 
                'Subscribes to all error events. Data contains details.',
            'wiser/set/**': 
                'Subscribes to all successful set events. Data contains details.',
            'wiser/success/**': 
                'Subscribes to all success events. When a function completes successfully and doesn\'t return a more specific event.',
            'wiser/**': 
                'Subscribes to all events.',
        }

    } // ---- End of getEventNames ---- //

    //#endregion = = = = return specific data = = = = //

    //#endregion ===== Data processing functions ===== //

    //#region ====== Set functions ===== //

    /** Set function for controlling room temperature, mode, etc. */
    async setRoom(opts) {

        //#region -- validate opts --
        let optsValid = true

        if ( !opts.room ) optsValid = false
        if ( opts.temp && ! Number.isNaN( Number(opts.temp) ) ) optsValid = false

        if ( optsValid !== true ) {
            tiEvents.emit('wiser/error/set-room', `Invalid options.` )
            this.debug('setRoom', `Invalid options`)
            return
        }

        if ( !opts.temp ) opts.temp = -20 // -20 is the temperature used for OFF
        //#endregion -- validate opts --

        // Allow for either room id or name to be used
        const room = this.returnRoom(opts.room)
        if ( room === undefined ) {
            tiEvents.emit('wiser/error/set-room', `Room not found for '${opts.room}'.` )
            this.debug('setRoom', `Room not found for '${opts.room}'.`)
            return
        }

        const roomName = room.Name
        const roomId = room.id

        // Temperature to set the room to in °C
        // Limit temperature requests (must be 5-30 °C or -200=off)
        let temp = Number(opts.temp)
        if ( temp !== -20 ) {
            if ( (temp < this.defaults.TEMP_MINIMUM) ) {
                tiEvents.emit('wiser/error/get-battery-levels',`Requested temperature too low (${temp}), setting to allowed minimum (${this.defaults.TEMP_MINIMUM}) for room: ${roomName} (${roomId}).` )
                this.debug('getBatteryLevels', `Requested temperature too low (${temp}), setting to allowed minimum (${this.defaults.TEMP_MINIMUM}) for room: ${roomName} (${roomId}).`)
                temp = this.defaults.TEMP_MINIMUM
            }
            if ( temp > this.defaults.TEMP_MAXIMUM ) {
                tiEvents.emit('wiser/error/set-room-temperature', `Requested temperature too high (${temp}), setting to max. allowed (${this.defaults.TEMP_MAXIMUM}) for room: ${roomName} (${roomId}).` )
                this.debug('setRoomTemp', `Requested temperature too high (${temp}), setting to max. allowed (${this.defaults.TEMP_MAXIMUM}) for room: ${roomName} (${roomId}).`)
                temp = this.defaults.TEMP_MAXIMUM
            }
        }

        // API path
        let roomUrl = `${this._servicePaths['rooms']}${roomId}`

        /** Data to send to controller hub */
        const patchData = {}
        /** URLs for patches - Array since we might have 2 patches to send */
        const patches = []

        patchData.RequestOverride = {
            'Type': 'Manual',
            'SetPoint': temp * 10, //toWiserTemp(boostTemp),
        }

        // if ( roomId === 14 ) {
        //     patchData.RequestOverride.CalculatedTemperature = 14
        // }

        // push main request to patches
        patches.push( axios.patch(roomUrl, patchData, this._axiosConfig) )

        let ret
        try {
            let res = await axios.all(patches)
            
            ret = {
                'result': `Temperature in room ${roomName} set to ${temp}°C`,
                'data': {
                    'roomId': roomId,
                    'roomName': roomName,
                    'numResults': res.length,
                    'lastResult': res[res.length-1].data,
                    'lastConfigResult': res[res.length-1].config.data,
                },
            }

            tiEvents.emit('wiser/set/room-temperature', ret )
            this.debug('setRoomTemp', ret.result)

        } catch (e) {
            console.error('patch error', e)
            //return Promise.reject(e)
            ret = {
                'result': `Could not set temperature in room ${roomId}. ${e.message}`,
                'data': {
                    'roomId': roomId,
                    'roomName': roomName,
                    'error': e,
                }
            }

            tiEvents.emit('wiser/error/set/room-temperature', ret )
            this.debug('setRoomTemp', ret.result)
        }

        return ret
        
    } // ---- End of setRoom ---- //

    /** Manual override of temperature for a specified room */
    async setRoomTemp(opts) {

        // Allow for either room id or name to be used
        const room = this.returnRoom(opts.room)

        if ( room === undefined ) {
            tiEvents.emit('wiser/error/set/room-temperature', `Room not found for '${opts.room}'.` )
            this.debug('setRoomTemp', `Room not found for '${opts.room}'.`)
            return
        }

        const roomName = room.Name
        const roomId = room.id

        // Temperature to set the room to in °C
        let temp = Number(opts.temp)
        if ( (temp < this.defaults.TEMP_MINIMUM) ) {
            tiEvents.emit('wiser/error/get-battery-levels',`Requested temperature too low (${temp}), setting to allowed minimum (${this.defaults.TEMP_MINIMUM}) for room: ${roomName} (${roomId}).` )
            this.debug('getBatteryLevels', `Requested temperature too low (${temp}), setting to allowed minimum (${this.defaults.TEMP_MINIMUM}) for room: ${roomName} (${roomId}).`)
            temp = this.defaults.TEMP_MINIMUM
        }
        if ( temp > this.defaults.TEMP_MAXIMUM ) {
            tiEvents.emit('wiser/error/set-room-temperature', `Requested temperature too high (${temp}), setting to max. allowed (${this.defaults.TEMP_MAXIMUM}) for room: ${roomName} (${roomId}).` )
            this.debug('setRoomTemp', `Requested temperature too high (${temp}), setting to max. allowed (${this.defaults.TEMP_MAXIMUM}) for room: ${roomName} (${roomId}).`)
            temp = this.defaults.TEMP_MAXIMUM
        }

        // API path
        let roomUrl = `${this._servicePaths['rooms']}${roomId}`

        /** Data to send to controller hub */
        const patchData = {}
        /** URLs for patches - Array since we might have 2 patches to send */
        const patches = []

        patchData.RequestOverride = {
            'Type': 'Manual',
            'SetPoint': temp * 10, //toWiserTemp(boostTemp),
        }

        // if ( roomId === 14 ) {
        //     patchData.RequestOverride.CalculatedTemperature = 14
        // }

        // push main request to patches
        patches.push( axios.patch(roomUrl, patchData, this._axiosConfig) )

        let ret
        try {
            let res = await axios.all(patches)
            
            ret = {
                'result': `Temperature in room ${roomName} set to ${temp}°C`,
                'data': {
                    'roomId': roomId,
                    'roomName': roomName,
                    'numResults': res.length,
                    'lastResult': res[res.length-1].data,
                    'lastConfigResult': res[res.length-1].config.data,
                },
            }

            tiEvents.emit('wiser/set/room-temperature', ret )
            this.debug('setRoomTemp', ret.result)

        } catch (e) {
            console.error('patch error', e)
            //return Promise.reject(e)
            ret = {
                'result': `Could not set temperature in room ${roomId}. ${e.message}`,
                'data': {
                    'roomId': roomId,
                    'roomName': roomName,
                    'error': e,
                }
            }

            tiEvents.emit('wiser/error/set/room-temperature', ret )
            this.debug('setRoomTemp', ret.result)
        }

        return ret
        
    } // ---- Rnd of setRoomTemp ---- //

    //#endregion ====== Set functions ===== //

    //#region ====== Event Listeners ====== //


    //#endregion ====== Event Listeners ====== //

    //#region ====== Instance functions ===== //

    /** Define the configuration for a specific insance of a wiser node
     * @param {wiserNode} node 
     */
    async instanceSetup(node) {

        this._axiosConfig.baseURL = this._servicePaths.baseUrl.replace('{}',node.host)
        this._axiosConfig.headers.SECRET = node.secret

        await this.apiGetAll()

        this.log.trace('[wiser:wiser-class.js:instanceSetup] Instance setup completed')
        return this.lastConnectionSuccessful
    } // ---- End of instanceSetup ---- //

    //#endregion ====== Instance functions ===== //

} // ----- End of WiserClass ----- //
 
/** Singleton model. Only 1 instance of UibWeb should ever exist.
 * Use as: `const wiserClass = require('./wiser-class.js')`
 */
// @ts-ignore
const wiserClass = new WiserClass()
module.exports = wiserClass
 
//EOF
 