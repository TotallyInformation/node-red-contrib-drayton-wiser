# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

----

There is quite a bit still to do on this node however, I want to publish early to get feedback and start to use on my live service. Treat this as an early beta.

## TODO

* Check/Fix
  * 3x monitors running?

* Editor - wiser node
  * monitor interval
* Editor - wiser-listen
  * topic - if missing, use event name as topic

* wiser-class.js
  * Extended monitor option - runs all the get.... fns as well - use for MQTT output
  * fn to list all listeners
  * fns to list all event names and requests - include descriptions
  * Set functions
    * set room mode, required room temperatures or room boosts
    * [x] set room temp - simple, manual setting
  * Event listeners for set functions
  * Scheduler functions - create, amend, apply to room/device
  * Devices offline - separate notification
  * "Moments"
  * ?? Maybe ??
    * Allow setting of the room name for the controller? then add to the devices object?
    * Room->Device Map?
    * Could have an MQTT topic to add other sensor outputs?

* JS - wiser node
  * If request/requestDetail missing, try to use topic/payload
  * Move event and request lists to fns in class
  * Set commands
  * Add smartplug handling (I now have a smartplug to test with)
  * debug
    * on/off
  * ?? Maybe ??
    * Save deviceLastSeen to context? or could save to file?
    * Add latest to global vars? Or to context?
  
  * Other
    * Command node? Same options as main node input - use set events

* Docs

## [Unreleased](https://github.com/TotallyInformation/node-red-contrib-uibuilder/compare/v0.0.0...main)

<!-- Nothing currently. -->

## v0.0.2

### Breaking

* Switch to the Wiser API v2

  Schedules are now on a separate API path and not included in the monitor. They can be requested separately.

  The schedule ID for a room is listed in the `Room` property.

  The Schedule data is an object with the schedule type as top-level properties (e.g. "Heating") containg an
  array of objects. The inner objects have properties:
  
  * `Name` that points to the room the schedule applies to.
  * `Monday` - `Sunday` objects containing `Time` and `DegreesC` (or `DegreesF`), arrays of the `hhmm` times
    and °C x 10 respectively.
  * `CurrentSetPoint` for the room
  * `Next` the next schedule object with properties `Day`, `Time`, `DegreesC` (or F).


## v0.0.1 (2022-01-12)

Initial code release. 2 basic nodes with a bunch of standard information requests and named event outputs.

Uses v1 of the Wiser API.

---

uibuilder adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Types of changes

- **Breaking** for new/amended features or supporting libraries that break compatibility with the previous version.
- **Added** for new features.
- **Changed** for changes in existing functionality.
- **Deprecated** for soon-to-be removed features.
- **Removed** for now removed features.
- **Fixed** for any bug fixes.
- **Security** in case of vulnerabilities.