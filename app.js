const EventStream = require('./lib/eventstream');

module.exports = app => {
  app.config.coreMiddleware.push('eventsource');
  app.eventsource = new EventStream({
    logger: app.logger,
    heartbeat: app.config.eventsource.heartbeat,
  });
};
