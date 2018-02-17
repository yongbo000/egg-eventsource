module.exports = (app) => {
  app.eventstream = new EventStream({
    heartbeat: app.config.eventstream.heartbeat,
  });
};

class EventStream {
  constructor(opts = {}) {
    this.heartbeat = opts.heartbeat || 2000;
    this.clientId = 0;
    this.clients = {};

    setInterval(() => {
      this.broadcast('this is a heatbeat message');
    }, this.heartbeat).unref();
  }

  handler(ctx) {
    ctx.req.socket.setKeepAlive(true);
    ctx.set({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream;charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // While behind nginx, event stream should not be buffered:
      // http://nginx.org/docs/http/ngx_http_proxy_module.html#proxy_buffering
      'X-Accel-Buffering': 'no',
    });

    ctx.status = 200;
    ctx.respond = false;
    ctx.res.write('\n');

    const newId = this.clientId++;
    this.clients[newId] = ctx.res;
    ctx.req.on('close', () => {
      delete this.clients[newId];
    });
  }

  broadcast(event, fn) {
    if (arguments.length === 1) {
      fn = event;
      event = 'message';
    }
    if (typeof fn === 'string') {
      const payload = fn;
      fn = (client) => { 
        client.write(`event: ${event}`);
        client.write(`data: ${payload}`);
      };
    }
    for (const client of Object.values(this.clients)) {
      fn(client);
    }
  }
};