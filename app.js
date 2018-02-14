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
    
    particle.getEventStream({ deviceId: Setup.particleDeviceId, name: 'S', auth: token }).then(function(stream) {
     stream.on('event', function(data) {
      console.log("[PARTICLE] Event Detected: " + data.data);  				
      var transmit_time = data.published_at;
      var rawData = transmit_time + " | " + "cel," + data.data;   				
      decodeTelemetryToFile('cellular', rawData);  				
    });
   });
  },
  function (err) {
    console.log('[PARTICLE API] Unable to login.', err);
  }
  );


// ********************************
// * Standard HTTP Request Routes [Express]
// * Used to read/download the log files directly from a web-browser
// *
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');   
});

app.get('/cellular', function (req, res) { //Only Cellular
  res.sendFile(__dirname + '/cellular.txt');
});

app.get('/satcom', function (req, res) { //Only Satcom
  res.sendFile(__dirname + '/satcom.txt');
});

app.get('/datalog', function (req, res) { //Both
  res.sendFile(__dirname + '/datalog.txt');
});



// ********************************
// * Telemetry End Points (Used by 3d Party provider webhooks)
// *
// * --Particle.io WebHook EndPoints--
app.post('/test', function(req, res) {
  var event = req.body.event;
  var data = req.body.data;
  var published_at = req.body.published_at;
  var coreid = req.body.coreid;
  var rawData = published_at + " | " + "cel," + data;

  decodeTelemetryToFile('cellular', rawData);
  res.send("OK");
  
});

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
  var rawData = transmit_time + " | " + "sat," + data; 

  decodeTelemetryToFile('satcom', rawData);       
  res.send("OK");
  return;  
});


// ********************************
// * COMMON TELEMETRY LOGGING METHODS
// * Used by either Cell or Sat EndPoints
// *
function decodeTelemetryToFile(source, rawData) {  
  //A MESSAGE = TimeStamp, Lat, Lon, Alt, Speed, HDG, GPS_SATS, GPS_PRECISION, BATTLVL, IRIDIUM_SATS, INT_TEMP, STAGE
  //B MESSAGE = TimeStamp, Lat, Lon, Alt, ExtTemp, ExtHum, ExtPress
  var fields = rawData.split(",");  
  var lat = fields[3]; 
  var lon = fields[4]; 
  var alt = fields[5]; 
  var spd = fields[6];
  var hdg = fields[7];
  var gpsTimeStamp = fields[2];
  
  var timeStampString = fields[0].split("|")[0].trim();
  var timeStamp = new Date(timeStampString);  

  
  // var googleMapsLink = "<http://www.google.com/maps/place/" + lat + "," +  lon + ">\n";
  // var slack = "*[" + source + "]*\n" + "`MAP:` " + googleMapsLink + "`RAW:`" + rawData + "\n";  


  var timeStampStringFormated = dateFormat(timeStamp, "mmm d @ HH:M:s");

  capsule.lat = lat;
  capsule.lon = lon;
  capsule.alt = alt;
  capsule.spd = spd;
  capsule.hdg = hdg;
  capsule.timeStamp = timeStampStringFormated;
  capsule.gpsTimeStamp = gpsTimeStamp;

  var params = {
    icon_emoji: ':rocket:'
  };

  if (source=='cellular') {
    fileName = 'cellular.txt';
  } else {
    fileName = 'satcom.txt';
  }

  fs.appendFileSync(fileName, rawData + '\n');        
  // bot.postMessageToChannel('tracking', slack, params);
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

// * Called by the app to send data/commands to the capsule's Cell Modem
socket.on('TXC', function (datas) {

if (datas.length <= 0) { return; }

 fnPr = particle.callFunction({ deviceId: Setup.particleDeviceId, name: 'c', argument: datas, auth: token });

 fnPr.then(
   function(datar) {
    var resp = String(datar.body.return_value);
	    socket.emit('response',resp); //JSON.stringify(datar, null, 4));      
    }, function(err) {
      console.log("[PARTICLE] Error: " + err);	    
	  });
});

  // *  Called by the app to send data/commands to the capsule's Cell Modem
  // * >>[Todo]<< [Not Implemented Yet]
  socket.on('TXS', function (data) {
    console.log("[TODO] A Request to send to SATCOM");
  });

  socket.on('TIMESTART', function (data) {
	startTimer();  	 
  });

});

function startTimer() {
	setInterval(() => {
		timerSeconds++;
		var resp = String(timerSeconds);		
		 fs.writeFileSync("timeSync.txt", timerSeconds);        
		 io.emit('TSYNC',resp); //JSON.stringify(datar, null, 4));      
	}, 1000);

}

function loadPersistedTime() {
	fs.readFile('timeSync.txt', function(err, buf) {
		if (!err) {
  			console.log("[SyncTime] : " + buf.toString());
  			timerSeconds = buf
  		} else {
  			console.log("[SyncTime] : NOT FOUND");
  		}
	});
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
startTimer();
// ******************************** * ******************************** * 
// * Boilerplate code to start the server
// * 
server.listen(Setup.portalPort);
console.log("[HLM1 UPLINK SERVER] Ready on: " + Setup.portalPort);
