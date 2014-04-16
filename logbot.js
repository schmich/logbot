var MongoClient = require('mongodb').MongoClient;
var irc = require('irc');
var config = require('./config');
var ui = require('./ui');

var channel = null;

if (process.argv.length < 3) {
  console.log('Channel expected.');
  process.exit(1);
} else {
  channel = process.argv[2];
}

if (!config.oauth) {
  console.log('Twitch OAuth token not set.');
  process.exit(1);
} else if (!config.username) {
  console.log('Twitch username not set.');
  process.exit(1);
}

function onMessage(user, text, collection) {
  if (user == 'jtv') {
    return;
  }

  ui.addMessage(user, text);

  collection.insert({
    u: user,
    t: text,
    d: new Date()
  }, function() { });
}

function updateStats(collection) {
  collection.stats(function(err, stats) {
    ui.setStats(stats);
  });
}

MongoClient.connect(config.db, function(err, db) {
  var collection = db.collection(channel);

  var bot = new irc.Client('irc.twitch.tv', config.username, {
    password: 'oauth:' + config.oauth,
    userName: config.username,
    realName: config.username,
    autoConnect: false,
    showErrors: true,
    stripColors: true,
    secure: false
  });

  ui.setStatus('Connecting...');
  bot.connect(5, function () {
    ui.setStatus('Connected.');
    ui.setStatus('Joining #' + channel + '...');
    bot.join('#' + channel, function () {
      ui.setStatus('#' + channel);

      updateStats(collection);
      setInterval(function() {
        updateStats(collection);
      }, 60 * 1000);
    });
  });

  bot.on('message', function (from, to, text, message) {
    onMessage(from, text, collection);
  });

  bot.on('ctcp', function (from, to, text, type, message) {
    if (type == 'privmsg') {
      onMessage(from, text.replace(/^ACTION /, ''), collection);
    }
  });

  bot.on('error', function (message) {
  });
});

ui.start();
