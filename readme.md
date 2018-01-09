# NSP2017-Uplink-Node
ASFM Near Space Program 2017
Uplink/Downlink Server to relay and persist capsule Messages for telemetry and realtime monitoring.

## What is it?
Node.js APP Designed to keep running as a server or daemon to receive messages transmitted by the capsule at any time either thru cellular modem or Iridium Satellite modem (RockBlock module).

When a message arrives it persists them in a local file and also broadcast it or relay it to all connected ground control connected apps.

Also includes a WebApp console to interact with the capsule: *http://yourserver.com:4200/*
*See:* [Ground Control's Git Repository](https://github.com/ASFM-HLM-STEMLAB/NSP2017-GroundControl-iOS) 

Also serves the socket communications to all Ground Control Apps.

## Requirements + Setup

### Sat WebHook/Delivery Groups
- Visit: [rockblock.rock7.com](https://rockblock.rock7.com) & set a delivery group to endpoing: http://yourserver.com:4200/satcom
- Change: *4200* to your desired port in *setup.json* file.

### Cell Modem (Particle.io) WebHook/Integration
- Visit www.particle.io 
- Create an account and register your electron device. 
- Note the deviceId to include in the *setup.json* file

### Slack Integration/Slackbot API
- Visit: Slack.com and get an SlackBot API Key.
- Note your slackBot API Key

### Requirements
- Node JS (Tested with v8.9.1 on MacOS High Sierra)

### Setup
- open a terminal window
- cd to the directory where *app.js* file is contained
- Rename the *setup-sample.json* file to *setup.json*
- Edit values in the file with your desired values
- In a terminal window, type: *npm update* to install dependencies.

## Usage
- open a terminal window
- cd to the directory where *app.js* file is contained
- type: *node ./app.js* & press *enter/return*
- We recommend [forever](https://github.com/foreverjs/forever) Node module to keep the server alive on crashes or server reboots

## General Info
###### Designed and created at ASFM Monterrey Mexico, 2017 @ Humberto Lobo Morales STEM LAB
