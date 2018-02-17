class EventStream {
  constructor(opts = {}) {
    this.heartbeat = opts.heartbeat || 2000;
    this.clientId = 0;
    this.clients = {};
    this.msgId = 0;

    setInterval(() => {
      // 保持心跳
      this.broadcast('heartbeat', 'this is a heartbeat message');
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

    const newId = ctx.ip + '#' + this.clientId++;
    this.clients[newId] = ctx.res;
    ctx.logger.info('[egg-eventsource] there is a new client joined, clientId:%s', newId);
    ctx.req.on('close', () => {
      ctx.logger.info('[egg-eventsource] client closed, clientId:%s', newId);
      delete this.clients[newId];
    });
  }

  get messageId() {
    return this.msgId++;
  }

  broadcast(event, data) {
    if (arguments.length === 1) {
      data = event;
      event = 'message';
    }
    const fn = client => {
      client.write(`event: ${event}\n`);
      client.write(`data: ${data}\n`);
      client.write(`id: ${this.messageId}\n\n`);
    };
    for (const client of Object.values(this.clients)) {
      fn(client);
    }
  }
}

module.exports = EventStream;
