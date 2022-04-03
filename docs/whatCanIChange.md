# What can be changed via the controller API?

## System

AutomaticDaylightSaving
AwayModeAffectsHotWater
AwayModeSetPointLimit
ComfortModeEnabled
DegradedModeSetpointThreshold
EcoModeEnabled
UnixTime
OverrideType
TimeZoneOffset
ValveProtectionEnabled

## TRV's (Smart Valves)

DeviceLockEnabled
Identify

## Smart Plugs

AwayAction
DeviceLockEnabled
Mode

## API URL's

# Wiser Hub Rest Api URL Constants
WISERHUBURL = "http://{}/data/v2/"
WISERHUBDOMAIN = WISERHUBURL + "domain/"
WISERHUBNETWORK = WISERHUBURL + "network/"
WISERHUBSCHEDULES = WISERHUBURL + "schedules/"
WISERSYSTEM = "System"
WISERDEVICE = "Device/{}"
WISERHOTWATER = "HotWater/{}"
WISERROOM = "Room/{}"
WISERSMARTVALVE = "SmartValve/{}"
WISERROOMSTAT = "RoomStat/{}"
WISERSMARTPLUG = "SmartPlug/{}"
WISERHEATINGACTUATOR = "HeatingActuator/{}"
WISERSHUTTER = "Shutter/{}"
WISERLIGHT = "Light/{}"