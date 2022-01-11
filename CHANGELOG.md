# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

----

## TODO

* Check/Fix
  * 3x monitors running?

* Editor
  * monitor interval

* wiser-class.js
  * Extended monitor option - runs all the get.... fns as well - use for MQTT output
  * fn to list all listeners
  * Set functions
    * set room mode, required room temperatures or room boosts
  * Event listeners for set functions
  * Scheduler functions - create, amend, apply to room/device
  * Devices offline - separate notification
  * "Moments"
  * ?? Maybe ??
    * Allow setting of the room name for the controller? then add to the devices object?
    * Room->Device Map?
    * Could have an MQTT topic to add other sensor outputs?

* JS
  * Set commands
  * debug
    * on/off
  * ?? Maybe ??
    * Save deviceLastSeen to context? or could save to file?
    * Add latest to global vars? Or to context?

* Docs

## [Unreleased](https://github.com/TotallyInformation/node-red-contrib-uibuilder/compare/v0.0.0...main)

<!-- Nothing currently. -->

### Added

* Main `wiser` node connects to your Wiser controller given the IP address and secret. 
  
  * The node starts a periodic monitor that gets all of the available information from the controller
  
    * It creates a "diff" between the new and old data and outputs a `wiser/changes` event (not message) for each changed property with the change details
    * It outputs various other events depending on the success or failure of connections. Use the `event-names` control message to get an explanation of all of the events.
  
  * The node can take input control messages that produce specific output: `battery` (battery levels for all devices), `temps` (temperatures for all rooms), `event-names` (list of all available event names), `request-names` (list of all of these information requests). Msg format: `{request: 'battery'}`. All other data is passed through to the output message.

* The `wiser-listen` node allows you to specify one of the `wiser/` event names, a message is output everytime one of the subscribed events fires.
  
  Event names can include single level wildcards (`*` or `+`) or multi-level (`** or `#`).

---

uibuilder adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Types of changes

- **Added** for new features.
- **Changed** for changes in existing functionality.
- **Deprecated** for soon-to-be removed features.
- **Removed** for now removed features.
- **Fixed** for any bug fixes.
- **Security** in case of vulnerabilities.