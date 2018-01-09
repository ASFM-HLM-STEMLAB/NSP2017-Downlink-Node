# NSP2017-Uplink-Node
ASFM Near Space Program 2017
Uplink Server to relay and persist capsule Messages for telemetry

## What is it?
This app is ment to be kept running as a server to receive messages transmitted by the capsule
either by the cellular modem or the satellite modem. 

It will use express http end points (and particle API) to await new messages and store them on a file locally 
upon arrival. 

GroundControl apps connected to the server will also receive in realtime messages gathered and relayed by the server.
See: https://github.com/ASFM-HLM-STEMLAB/NSP2017-GroundControl-iOS


## Requirements + Setup

### Sat WebHook/Delivery Groups
- Visit: rockblock.rock7.com website and setup a delivery group with endpoing: http://yourserver.com:4200/satcom
-- Note1: Change :4200 to the defined port in setup.json file.

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
- Rename the *setup-sample.json* file to *setup.json*
- Edit values in the file with your desired values
- In a terminal window, type: *npm update* to install dependencies.

## Usage
- node ./app.js
- Note: We recommend forever module to keep the server running in case of crashes and server reboots.

## General
Designed and created at ASFM Monterrey Mexico, 2017 @ Humberto Lobo Morales STEM LAB
