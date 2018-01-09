# NSP2017-Uplink-Node
ASFM Near Space Program 2017
Uplink Server to relay and persist capsule Messages for telemetry

## What is it?
This app is designed to keep running as a server to receive messages transmitted by the capsule at any time either via cellular modem or Iridium Satellite modem (RockBlock module).

Uses node express module for http end-point (and the particle API) to await for messages.
When a message arrives it persists them in a local file for later retrieval.
Will also relay new messages to all ground control apps connected.

Also included is an http console to interact with the capsule and the server at any time: *http://yourserver.com:4200/*
*See:* [Ground Control's Git Repository](https://github.com/ASFM-HLM-STEMLAB/NSP2017-GroundControl-iOS) 

Ground control app connects to the server using Sockets technology via Socket.io framework for realtime comunications.


## Requirements + Setup

### Sat WebHook/Delivery Groups
- Visit: [rockblock.rock7.com](https://rockblock.rock7.com) & set a delivery group to endpoing: http://yourserver.com:4200/satcom
... #### Change: *4200* to your desired port in *setup.json* file.

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
- type: *node ./app.js*
- press *enter/return*
⋅⋅⋅ Note: We recommend forever module to keep the server running in case of crashes and server reboots

## General Info
###### Designed and created at ASFM Monterrey Mexico, 2017 @ Humberto Lobo Morales STEM LAB
