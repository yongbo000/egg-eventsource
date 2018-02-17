const EventStream = require('./lib/eventstream');

module.exports = app => {
  app.config.coreMiddleware.push('eventsource');
  app.eventsource = new EventStream({
    heartbeat: app.config.eventsource.heartbeat,
  });
};
