//
//  app.js
//  Part of the ASFM HLM1 Near Space Program Eco System
//  This APP is used as a central server and uplink to send and receive comunications from the capsule.
//  It is designed to run 24x7 waiting for new messages and storing them on a file.
//  Also to relay messages to the ground control apps for realtime telemetry of the capsule position and data gathering.
//
//
//
// PLEASE EDIT setup.json file with your parameters and keys. A sample file is provided setup-sample.json, edit it and rename it to 
// setup.json


// ********************************
// * Variables and Includes
// *
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var fs = require('fs');
var SlackBot = require('slackbots');
var Particle = require('particle-api-js');
var Setup = require('./setup.json');
var capsule = {lat:25.659335,lon:-100.446327, alt:0, spd:0, hdg:0, timeStamp:'never', gpsTimeStamp:0101240000};
var dateFormat = require('dateformat');
var timerSeconds = 0;
var timerId = 0;
var lastTimerTick = 0;

var particle = new Particle();

app.use(bodyParser.urlencoded({ extended: false }))

// ********************************
// * SlackBot API
// *
var bot = new SlackBot({
  token: Setup.slackApiKey, 
  name: Setup.slackBotName
});

// ********************************
// * Particle.io API 
// *
var token;

particle.login({username: Setup.particleUsername, password: Setup.particlePassword}).then(
  function(data) {    
    token = data.body.access_token;
    console.log('[PARTICLE API] Connected with KEY:.', token);
    
    particle.getEventStream({ deviceId: 'mine', name: 'S', auth: token }).then(function(stream) {
     stream.on('event', function(data) {
      console.log("[PARTICLE] Event Detected: " + data.data);         
      var transmit_time = data.published_at;
      var rawData = transmit_time + " | " + "cel," + data.data;                 
      decodeTelemetryToFile('cellular', rawData);     
    });
   });

    particle.getEventStream({ deviceId: 'mine', name: 'R', auth: token }).then(function(stream) {
     stream.on('event', function(data) {
      console.log("[PARTICLE] Radio Event Detected: " + data.data);  				
      var transmit_time = data.published_at;
      var rawData = transmit_time + " | " + "rad," + data.data;
      decodeTelemetryToFile('cellular', rawData);  				
    });
   });

  },
  function (err) {
    console.log('[PARTICLE API] Unable to login.', err);
  }
  );


// * --RockBlock Iridium Modem WebHook EndPoints--
app.post('/satcom', function(req, res) {
  var imei = req.body.imei;
  var momsn = req.body.momsn;
  var transmit_time = req.body.transmit_time;
  var iridium_latitude = req.body.iridium_latitude;
  var iridium_longitude = req.body.iridium_longitude;
  var iridium_cep = req.body.iridium_cep;
  var data = req.body.data;
  data = hex2bin(data);  
  var d = new Date();

  var timeStampStringFormated = d.toISOString();
  var rawData = timeStampStringFormated + " | " + "sat," + data;
  console.log("[SAT RAW]: " + rawData);
  decodeTelemetryToFile('satcom', rawData);       
  res.send("OK");
  return;  
});


// ********************************
// * COMMON TELEMETRY LOGGING METHODS
// * Used by either Cell or Sat EndPoints
// *
function decodeTelemetryToFile(source, rawData) {  
  // 0 Source String
  // 1 GPS timestamp
  // 2 lat
  // 3 lon
  // 4 alt
  // 5 speed
  // 6 heading
  // 7 # of GPS Sats
  // 8 GPS HDOP Value
  // 9 Capsule Battery Level
  // 10 Iridium Satellites
  // 11 Capsule Internal Temp
  // 12 Mission Stage String

  var fields = rawData.split(",");  
  var gpsTimeStamp = fields[1];
  var lat = fields[2]; 
  var lon = fields[3]; 
  var alt = fields[4]; 
  var spd = fields[5];
  var hdg = fields[6];
  
  
  var timeStampString = fields[0].split("|")[0].trim();
  var timeStamp = new Date(timeStampString);  


  var timeStampStringFormated = dateFormat(timeStamp, "mmm d @ HH:M:s");

  capsule.lat = lat;
  capsule.lon = lon;
  capsule.alt = alt;
  capsule.spd = spd;
  capsule.hdg = hdg;
  capsule.timeStamp = timeStampStringFormated;
  capsule.gpsTimeStamp = gpsTimeStamp;

  if (source=='cellular') {
    fileName = 'cellular.txt';
  } else {
    fileName = 'satcom.txt';
  }

  fs.appendFileSync(fileName, rawData + '\n');        
  fs.appendFileSync("datalog.txt", rawData + '\n');
  console.log("[INCOMING] " + rawData);

  io.emit('RAW', rawData);
  io.emit('POS',  capsule);
}


// ********************************
// * Socket.io - Used for GroundControl App
// * See: https://github.com/ASFM-HLM-STEMLAB/NSP2017-GroundControl-iOS
// * 
io.on('connection', function (socket) {
  console.log("[ACTIVITY] New Connection");
  socket.emit('HELLO', { 'version': '1.0' });
  io.emit('i',  '[NEW CONNECTION]');

  var resp = String(timerSeconds);
  socket.emit('TSYNC',resp); 
  


//  Called by the app (using withAkn) to get all the messages stored in the log files. [telemetry]
  socket.on('GETLOGFILE', function (name, fn) {
   fs.readFile("datalog.txt",function(error, filedata){
    if(error) throw error;                
          var logfile = filedata.toString();
          fn(logfile);
        });
  });

  socket.on('PING',  function (name, fn) {
    fn("PONG");
  });

  socket.on('POS', function (name, fn) {
    fn(capsule);    
  });

  socket.on('GETTIME', function (data, fn) {
    fn(timerSeconds);
  });

  socket.on('TIMESTART', function (data, fn) {
    startTimer();
    fn("OK");
  });

  socket.on('TIMEPAUSE', function (data, fn) {
    pauseTimer();
    fn("OK");
  });

  socket.on('TIMECLEAR', function (data, fn) {
    clearTimer();
    fn("OK");
  });

  socket.on('TIMESET', function (data, fn) {
    setTimer(data);
    fn("OK");
  });


// * Called by the app to send data/commands to the capsule's Cell Modem [NEW WITH AKN]
socket.on('TXCA', function (datas, fn) {
  if (datas.length <= 0) { return; }

  if (checkForTimeCommands(datas)) { 
    fn("OK");
    return;
  }

  fnPr = particle.callFunction({ deviceId: Setup.particleDeviceId, name: 'c', argument: datas, auth: token });

  fnPr.then(
    function(datar) {
      var resp = String(datar.body.return_value);
      fn(resp); 
      console.log("[PARTICLE] OK: " + resp);
    }, function(err) {
      console.log("[PARTICLE] Error: " + err);
    }).catch(function(err) {
      console.log("[PARTICLE] Error: " + err);
    });
  });

socket.on('TXCR', function (datas, fn) {
  if (datas.length <= 0) { return; }

  if (checkForTimeCommands(datas)) { 
    fn("OK");
    return;
  }

  fnPr = particle.callFunction({ deviceId: Setup.particleRelayDeviceId, name: 'rdio', argument: datas, auth: token });

  fnPr.then(
    function(datar) {
      var resp = String(datar.body.return_value);
      fn(resp); 
      console.log("[PARTICLE] OK: " + resp);
    }, function(err) {
      console.log("[PARTICLE] Error: " + err);
    }).catch(function(err) {
      console.log("[PARTICLE] Error: " + err);
    });

});

socket.on('GETTIME', function (data, fn) {
    fn(timerSeconds);
});

// // * Called by the app to send data/commands to the capsule's Cell Modem [LEGACY]
// socket.on('TXC', function (datas) {

// if (datas.length <= 0) { return; }

//  if (checkForTimeCommands(datas)) { return }

//  fnPr = particle.callFunction({ deviceId: Setup.particleDeviceId, name: 'c', argument: datas, auth: token });

//  fnPr.then(
//    function(datar) {
//     var resp = String(datar.body.return_value);
//       socket.emit('response',resp); //JSON.stringify(datar, null, 4));      
//     }, function(err) {
//       console.log("[PARTICLE] Error: " + err);      
//     });
// });


// // * Called by the app to send data/commands to the capsule's RADIO Modem
// socket.on('TXR', function (datas) {

// if (datas.length <= 0) { return; }

//  if (checkForTimeCommands(datas)) { return }

//  fnPr = particle.callFunction({ deviceId: Setup.particleDeviceId, name: 'rdio', argument: datas, auth: token });

//  fnPr.then(
//    function(datar) {
//     var resp = String(datar.body.return_value);
// 	    socket.emit('response',resp); 
//     }, function(err) {
//       console.log("[PARTICLE] Error: " + err);	    
// 	  });
// });

  // *  Called by the app to send data/commands to the capsule's Cell Modem
  // * >>[Todo]<< [Not Implemented Yet]
  // socket.on('TXS', function (data) {
  //   console.log("[TODO] A Request to send to SATCOM [NOT IMPLEMENTED]");
  // });


});


// ********************************
// * Timer Methods 
// * 
// * Keep the timer in sync for the whole mission.
function startTimer() {
  if (timerId != 0) {
    // clearInterval(timerId);
    console.log("[WARNING] Attempt to re-run the timer. [One will be flushed]")
    return;
  }

  timerId = setInterval(() => {
    var d = new Date();
    var seconds = Math.round(d.getTime() / 1000);
    var delta = seconds - lastTimerTick;
    
    if (lastTimerTick == 0) {
      delta = 1;
    }

    lastTimerTick = seconds;

    timerSeconds += delta;

    var resp = String(timerSeconds);
    persistTimer(timerSeconds);
  }, 1000);
}


function pauseTimer() {
  clearInterval(timerId);
  lastTimerTick = 0;
  timerId = 0;
}

function clearTimer() {
  clearInterval(timerId);
  timerId = 0;
  timerSeconds = 0;
  var resp = String(timerSeconds);
  fs.writeFileSync("timeSync.txt", timerSeconds); 
  io.emit('TSYNC',resp); 
}

function loadPersistedTime() {
  fs.readFile('timeSync.txt', function(err, buf) {
    if (!err) {
        console.log("[SyncTime] : " + buf.toString());
        timerSeconds = parseInt(buf);
      } else {
        console.log("[SyncTime] : NOT FOUND = 0");
      }
  });
}

function setTimer(data) {
    if (data == "")  { data = "0" }

    if (isNaN(data)) {
      console.log("[SyncTime] NaN Found. Ignoring..");
      return;
    }

    console.log("[SyncTime] Set: " + data);
    var time =  parseInt(data);    
    timerSeconds = time; 
    persistTimer(timerSeconds);
}

function persistTimer(timerSeconds) {
   fs.writeFileSync("timeSync.txt", timerSeconds); 
   var resp = String(timerSeconds);
   io.emit('TSYNC',resp); 
}

function checkForTimeCommands(datas) {

  if (datas == "timestart") { 
    startTimer();
    return true;
  }

  if (datas == "timepause") { 
    pauseTimer();
    return true;
  }

  if (datas == "timeclear") { 
    clearTimer();
    return true;
  }

  var tFields = datas.split(" ");  
  if (tFields[0] == "timeset") {    
    if (tFields.length < 1 || tFields.length > 2) { return; }    
    var value = tFields[1];         
    setTimer(value);
    return true;
  }

  return false;
}

// ********************************
// * Helper Methods 
// * 
// * hex2bin used to decode redblock satcom payload messsages as per their API
function hex2bin(hex)
{
  var bytes = [], str;

  for(var i=0; i< hex.length-1; i+=2)
    bytes.push(parseInt(hex.substr(i, 2), 16));

  return String.fromCharCode.apply(String, bytes);    
}

loadPersistedTime();
// ******************************** * ******************************** * 
// * Boilerplate code to start the server
// * 
server.listen(Setup.portalPort);
console.log("[HLM1 UPLINK SERVER] Ready on: " + Setup.portalPort);
