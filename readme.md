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

## Spec
- Developed and written in NodeJS version v8.9.1

## Setup
- Rename the file setup-sample.json to setup.json
- Edit values with your own [see 3d party privders for keys]
- In a terminal window, type: npm update

## Usage
- node ./app.js
- Note: the use of forever module is recommended to keep the server running in case of crashes.

Designed and created at ASFM Monterrey Mexico, 2017 @ Humberto Lobo Morales STEM LAB
