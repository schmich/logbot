var blessed = require('blessed');
var colors = require('colors');
var unorm = require('unorm');
var format = require('./format');

var program = blessed.program();

var status = '';
var stats = null;
var messages = [];
var messagesLogged = 0;
var uptime = 0;

function drawRule() {
  if (!this.rule) {
    this.rule = '';
    for (var i = 0; i < program.cols; ++i) {
      this.rule += '—';
    }
  }

  program.write(rule.grey + '\n');
}

function formatTime(mins) {
  var format = '';
  var days = Math.floor(mins / (24 * 60));
  if (days > 0) {
    format += days + 'd';
    mins -= days * 24 * 60;
  }

  var hours = Math.floor(mins / 60);
  if (hours > 0) {
    format += hours + 'h';
    mins -= hours * 60;
  }

  if (mins > 0) {
    format += mins + 'm';
  }

  return format ? format : '0m';
}

function render() {
  program.clear();

  program.move(0, 0);
  drawRule();

  var space = Math.floor(program.cols / 4.5);

  program.move(0, 1);
  program.write('Messages: '.blue + format(messagesLogged));

  if (stats) {
    program.move(space, 1);
    program.write('Total: '.blue + format(stats.count));

    program.move(space * 2, 1);
    program.write('Size: '.blue + format((stats.storageSize / 1000000), 3) + 'M');
  }

  program.move(space * 3, 1);
  program.write('Uptime: '.blue + formatTime(uptime));

  program.move(program.cols - status.length, 1);
  program.write(status.blue);

  program.move(0, 2);
  drawRule();

  for (var i = 0; i < messages.length; ++i) {
    var user = ('[' + messages[i].user + '] ').grey;
    var message = unorm.nfkc(messages[i].message);

    program.write(user + message + '\n');
  }
}

function addMessage(user, message) {
  ++messagesLogged;

  messages.push({ user: user, message: message });
  if (messages.length > 20) {
    messages.shift();
  }

  render();
}

function setStatus(text) {
  status = text;
  render();
}

function setStats(newStats) {
  stats = newStats;
  render();
}

function start() {
  process.on('SIGINT', function () {
    program.clear();
    program.showCursor();
    program.normalBuffer();
    process.exit(0);
  });

  setInterval(function() {
    ++uptime;
    render();
  }, 60 * 1000);

  program.alternateBuffer();
  program.hideCursor();
  render();
}

module.exports = {
  addMessage: addMessage,
  setStatus: setStatus,
  setStats: setStats,
  start: start
};
