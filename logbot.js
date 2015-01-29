var MongoClient = require('mongodb').MongoClient;
var irc = require('irc');
var config = require('./config');
var moment = require('moment');
var logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { timestamp: function() { return moment().format(); } });

var channel = null;

if (process.argv.length < 3) {
  logger.error('Channel expected.');
  process.exit(1);
} else {
  channel = process.argv[2];
}

if (!config.oauth) {
  logger.error('Twitch OAuth token not set.');
  process.exit(1);
} else if (!config.username) {
  logger.error('Twitch username not set.');
  process.exit(1);
}

function onMessage(user, text, collection) {
  if (user == 'jtv') {
    return;
  }

  logger.info(user + ': ' + text);

  collection.insert({
    u: user,
    t: text,
    d: new Date()
  }, function() { });
}

MongoClient.connect(config.db, function(err, db) {
  if (db == null) {
    logger.error('Could not connect to Mongo database. Ensure it is running.');
    process.exit();
  }

  var collection = db.collection(channel);

  var bot = new irc.Client('irc.twitch.tv', config.username, {
    port: 6667,
    showErrors: true,
    password: 'oauth:' + config.oauth,
    userName: config.username,
    realName: config.username,
    autoConnect: false,
    showErrors: true,
    stripColors: true,
    secure: false
  });

  bot.on('error', function (message) {
    logger.error('Error: ' + message);
    process.exit();
  });

  logger.info('Connecting.');
  bot.connect(5, function() {
    logger.info('Connected.');
    logger.info('Joining #' + channel + '.');
    bot.join('#' + channel, function () {
      logger.info('#' + channel);
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
});
