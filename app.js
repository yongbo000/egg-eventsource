const EventStream = require('./lib/eventstream');
const eventName = 'eventsource#sendToAllWorkers';

module.exports = app => {
  app.config.coreMiddleware.push('eventsource');
  app.eventsource = new EventStream({
    logger: app.logger,
    heartbeat: app.config.eventsource.heartbeat,
    defaultDataId: app.config.eventsource.defaultDataId,
    dataIdSeparator: app.config.eventsource.dataIdSeparator,
  });
  Object.defineProperty(app.eventsource, 'sendToAllWorkers', {
    value: (event, data) => {
      app.messenger.broadcast(eventName, {
        event,
        data,
      });
    },
  });
  app.messenger.on(eventName, ({ event, data }) => {
    if (app.eventsource.count) {
      app.eventsource.broadcast(event, data);
    }
  });
  app.beforeClose(() => {
    app.eventsource.destroy();
    app.logger.info('[egg-eventsource] is destroied');
  });
};
