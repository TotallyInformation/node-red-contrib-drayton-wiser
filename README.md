# node-red-contrib-drayton-wiser
Monitor and control Drayton Wiser smart heating systems from Node-RED.

> WARNING: Things are still changing in this node, sometimes quite drastically. Use with caution until I can stabilise things a bit more.
> Also, limited `set` functions are available so far. More are are coming though :-)

> Treat the 0.2 release as an early beta. I want to publish early to get feedback and start to use on my live service.

## Summary

Gives you information about what has changed between calls to the controller (something that is hard to do as the controller itself doesn't provide that), keeps a copy of all of the current data, has commands to get information summaries such as battery state and room temperatures as well as listing the available commands and events. Has a "listener" node that lets you subscribe to any of the updates and errors. It polls the controller on a default 60s cycle.

Initial version lets you set room mode, required room temperatures or room boosts. Later versions will control schedules.


## Limitations

Tested on a system with only 1-channel heating (a combi boiler so no hot water channel) and no Wiser smart plugs. Feedback always welcome.


## Nodes

All of the nodes appear under the "home automation" section of the Node-RED pallet.

### `wiser`

This is the main node. You need one of these in your flow to talk to a Drayton Wiser heating controller over Wi-Fi. 
You simply give it the IP address and secret of the controller.

The instructions for finding the controller's access secret are in the node's help panel in the Node-RED Editor.

#### Input Messages

The `wiser` node allows you to send specifically formatted messages to it and will produce an output message in response.
See the Main Node Request Types section below for the requests you can send.

The format of the input message is (example will return the rooms with a temperature < 18.0 °C):

```json
{
    "request": "temps",
    "requestDetail": ["<",18]
}
```

Only the `msg.payload` property is changed on the output message, all other input message properties are passed through. 

Some of the request commands also allow a `requestDetail` property to be added that amends the request. Typically the value will be either a string or a JSON array. 
E.g. `["<",18]` for the `temps` request.

### `wiser-listen`

This enables you to subscribe to one or more of the events produced by the main node.
You can have as many of these nodes as you need in your flows.

Use one of the event names listed in the next section as the event name to monitor. You don't need to include the `wiser/` part, that is fixed for you.

Event names can include single level wildcards (`*` or `+`) or multi-level (`** or `#`).


## Event Names

* `wiser/monitor-interval-created` - When the monitor is create. Data is a reference to the monitor\'s interval object.
* `wiser/monitor-interval-removed` - When the monitor is removed
* `wiser/monitor-intervalmonitor-interval` - Every time the monitor gets a full update from the controller
* `wiser/cloudConnection` - When the status of the controller to Wiser Cloud connection changes
* `wiser/changes` - Value difference between previous and current calls to the controller. Data is an object detailing the change.
* `wiser/online` - When the online status of the controller changes. Data is `true` if the controller can be contacted. 
* `wiser/debug` - All debug messages. May include extra data.
* `wiser/success/get-all` - If a call to the controller for all data succeeds
* `wiser/error/get-all` - If a call to the controller for all data fails. Reason given in the data
* `wiser/success/room-map` - If the device->room map successfully updated.
* `wiser/error/room-map` - If the device->room map failed to update.
* `wiser/error/gateway-unreachable` - When the server\'s default gateway is inaccessible (e.g. the network is unavailable). Output on each call to the controller.
* `wiser/error/controller-unreachable` - When the controller cannot be reached over the network but the gateway is OK. Output on each call to the controller.
* `wiser/error/*` - Subscribes to all error events. Data contains details.
* `wiser/success/*` - Subscribes to all successe events.
* `wiser/**` - Subscribes to all events.

TBC:

```
{
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
```

## Main Node Request Types (commands)

* `battery` - Output battery levels for all devices.

  Optional `requestDetails` - One or more batter levels. Eg `["Dead"`, "Low"]` or `"Dead"`

  The name of the battery levels match those emitted by the Wiser API. `Normal`, `Low`, `OneThird`, `TwoThirds`. 
  In addition, `Dead` is used when the battery level is too low to run the device (this is not part of the standard API).

  The `SignalStrength` is one of `VeryGood`, `Good`, `Poor`, `NoSignal`, `Offline` (if battery dead, not part of standard API).

  The output object for each device has the format:

  ```json
  {
      "Room": "Master Bedroom", "BatteryVoltage": 0,
      "BatteryLevel": "Dead", "SignalStrength": "Poor", 
      "DeviceType": "iTRV", "DeviceId": 52963
  }
  ```

  The output object also has an `updated` property which is the timestamp of the last successful call to the controller API (in ISO format).

* `temps` - Output a list of room objects that have temperature sensors (TRV's or Roomstats).

  Optional `requestDetails` - Limit the returned rooms to those which have less-than or greater-than the supplied temperature.

  E.g. `["<",18]` or `[">",18]`

  Each room object takes the format:

  ```json
  {
      "Room": "Front Hall", "Temperature": 17.8, "SetPoint": 18.0, "Mode": "Auto", 
      "PercentageDemand": 20, "ControlOutputState": "Off", "SetpointOrigin": "FromSchedule",
      "ScheduleId": 5, "ScheduledSetPoint": 18.0,"WindowState": "Closed"
  }
  ```

  Temperatures are in °C rather than the °C x 10 that the API reports.

  The output object also has an `updated` property which is the timestamp of the last successful call to the controller API (in ISO format).

* `offline-devices` - Lists any devices (TRV's, Roomstats, etc) that are currently not connected to the controller over the Zigbee network

* `isonline` - Is the controller currently online?

* `system-state` - Data about the current state of the overall system

* `latest` - Output the current full list of properties. This includes some extra data for convenience that the API doesn't include.

* `event-names` - Output a list of all event names with brief explanations.

* `request-names` - Output a list of all request types with brief explanations.

## Amendments to API Data

### Enhance `Device` data

The API data doesn't include the allocated room name on the device data, this node adds the `Room` property to each device. The room name will be 'Undefined' if the device is not included in a room (e.g. the controller).

If the battery is dead, the API drops the `BatteryVoltage`, `BatteryLevel` and DisplayedSignalStrength properties. The node adds these back in with values: `BatteryVoltage = 0`, `BatteryLevel = 'Dead'` and `DisplayedSignalStrength = 'Offline'`.

## References

A couple of other libraries exist for access and control of Wiser systems.

* https://github.com/msp1974/wiserheatapiv2 - Uses v2 of the API which has a number of changes
* https://github.com/asantaga/wiserheatingap - Uses v1 of the API (with some examples here: https://github.com/steversig/wiserheatingapi-examples)
* 