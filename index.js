const config = require('./config');
const Discord = require('discord.js');
const screenshot = require('screenshot-desktop')
const Tail = require('tail');

const fs = require('fs');
const Path = require('path');

const client = new Discord.Client();
const USERPROFILE = process.env.USERPROFILE;
const MClogdir = Path.join(USERPROFILE,'/AppData/Local/TS Support/MultiCharts64/',
config.MC64ver, '/Logs/TradingServer/');

//tail empty file in case log not found
var tails = [];
fs.closeSync(fs.openSync('./empty.txt', 'w'));
for (var i = 0; i < config.MClogfiles.length; i++) {
	tails.push(new Tail.Tail('./empty.txt'));
}

var readFileErrors = [];
for (var i = 0; i < config.MClogfiles.length; i++) {
  readFileErrors.push(false);
}

for (var index in config.MClogfiles) {
  //console.log(index);
  var files = fs.readdirSync(MClogdir)
              .map(function(v) { 
                  return { name:v,
                           time:fs.statSync(MClogdir + v).mtime.getTime()
                         }; 
               })
               .sort(function(a, b) { return b.time - a.time; })
               .filter(function(v) {return v.name.startsWith(config.MClogfiles[index]);})
               .map(function(v) { return v.name; });
  //console.log(files)

  if (files.length>0) {
    console.log('Found log ' + files[0])
    tails[index] = new Tail.Tail(MClogdir+files[0]);
  } else {
    console.error('There was an error reading the file! '+config.MClogfiles[index]);
    readFileErrors[index] = true;
  }
}

var sendonce = false;
var resendtimer;
var count = 0;
//0
var sendonce0 = false;
var resendtimer0;
var count0 = 0;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

//keep alive alert for MC
const readpath = './keepalive.txt';
fs.closeSync(fs.openSync(readpath, 'w'));
client.on('ready', () => {
  var tail=new Tail.Tail(readpath);
  let mctime = Date.now() - new Date().getTimezoneOffset() * 60000;
  let localtime = Date.now() - new Date().getTimezoneOffset() * 60000;
  tail.on('line', data => {
    mctime = data*1000*86400 + new Date('1899-12-30').getTime() ;//- 201600000;
    console.log('Last alive time: ', new Date(mctime));
  })
  client.setInterval(()=>{
    localtime = Date.now() - new Date().getTimezoneOffset() * 60000;
    //console.log(new Date(localtime), new Date(mctime));
    if (localtime - mctime > 10 * 1000) {
      client.channels.get('490059781894176768').send('<@488651090548752384>, MC timeout.');
      console.log('MC timeout');
    }
  }, 5 * 1000);
});
//x
client.on('ready', () => {
  if (readFileErrors[0]===true){
    client.channels.get('490059781894176768').send('<@488651090548752384>, '+ config.MClogfiles[0]+' is not found');
  }

  tails[0].on('line', data =>{
    if (data.indexOf('Rejected') > -1 ) {
      client.channels.get('490059781894176768').send('<@488651090548752384>, Order Rejected!').
      then((newMessage) => {
        sendonce = true;
        console.log(Date()+'Alert send, Rejected');
        count = 0;
        function resend(){
          count++;
          if (sendonce === true ){
            client.channels.get('490059781894176768').send('<@488651090548752384>, Order Rejected! (Resend)');
            console.log(Date()+'Resend, Rejected');
          };
          if (count >= config.resendlimit || sendonce==false) { 
            clearInterval(this); 
          }
          //pin msg
          //if (count==5) {newMessage.pin()};
        }
        clearInterval(resendtimer);
        resendtimer = setInterval(resend, config.resendtimers * 60 * 1000);
      })
    }
  })
});
//0
client.on('ready', () => {
  if (readFileErrors[1]===true){
    client.channels.get('490059781894176768').send('<@488651090548752384>, '+ config.MClogfiles[1]+' is not found');
  }
  tails[1].on('line', data =>{
    if (data.indexOf('Status=[Inactive]') > -1 ) {
      client.channels.get('490059781894176768').send('<@488651090548752384>, Order Inactive!').
      then((newMessage) => {
        sendonce0 = true;
        console.log(Date()+'Alert send, Inactive');
        count0 = 0;
        function resend(){
          count0++;
          if (sendonce0 === true ){
            client.channels.get('490059781894176768').send('<@488651090548752384>, Order Inactive! (Resend)');
            console.log(Date()+'Resend, Inactive');
          };
          if (count0 >= config.resendlimit || sendonce0==false) { 
            clearInterval(this); 
          }
          //pin msg
          //if (count0==5) {newMessage.pin()};
        }
        clearInterval(resendtimer0);
        resendtimer0 = setInterval(resend, config.resendtimers * 60 * 1000);
      })
    }
  });
});

client.on('message', message => {
  if (!message.content.startsWith(config.prefix)) return;
  if (message.author.bot) return;
  if (message.content.startsWith(config.prefix + 'ack')) {
    sendonce = false;
    sendonce0 = false;

    //report files not found
    for (var index in config.MClogfiles) {
      if (readFileErrors[index]) {
        message.reply(config.MClogfiles[index]+' is not found');
      }
	}
	
	return message.reply('Alerts Clear.');
  };
  if (message.content.startsWith(`${config.prefix}print`)) {
	let timenow = new Date(Date.now());
	if (!fs.existsSync('./shots')){
		fs.mkdirSync('./shots');
	}
	let shotfile = './shots/shot-'+timenow.toLocaleString( { timeZone : 'Asia/Shanghai' })+'.png';
	shotfile = shotfile.replace(/ /g,'-');
	shotfile = shotfile.replace(/:/g,'-');
	screenshot({ filename: shotfile }).then((imgPath) => {
		// img: Buffer filled with png
		return message.channel.send('', {files: [imgPath]});
	  }).catch((err) => {
		// ...
	  })
  };
});

// send to discord
client.on('ready', () => {
	client.setInterval(function () {
		let timenow = new Date(Date.now());
		// screenshot({ filename: 'shot.jpg' }).then((imgPath) => {
		screenshot().then((img) => {
			// img: Buffer filled with jpg goodness
			client.channels.get('493707202360639488')
			.send(`${timenow.toLocaleString( { timeZone : 'Asia/Shanghai' })}`, {files: [img]});
		})
	}, config.screenshot * 60 * 1000);
});

client.login(config.token);