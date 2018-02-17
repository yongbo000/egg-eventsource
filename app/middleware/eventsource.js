module.exports = (_, app) => {
  return async (ctx, next) => {
    if (ctx.path !== app.config.eventsource.path) {
      return await next();
    }
    return app.eventsource.handler(ctx);
  };
};
