const uuidv4 = require('uuid/v4');

class EventStream {
  constructor(opts = {}) {
    this.heartbeat = opts.heartbeat || 2000;
    this.clients = {};
    this.logger = opts.logger;
    this.startHeartbeat();
  }

  get count() {
    return Object.keys(this.clients).length;
  }

  destroy() {
    Object.values(this.clients).forEach(client => {
      try {
        client.end();
      } catch (e) {
        this.logger.error(e);
      }
    });
    this.clients = null;
    clearInterval(this.iTimer);
  }

  startHeartbeat() {
    this.iTimer = setInterval(() => {
      // 保持心跳
      this.broadcast((client, clientId) => {
        const data = JSON.stringify({ aliveClients: this.count, clientId, message: 'this is a heartbeat message' });
        client.write('event: heartbeat\n');
        client.write(`data: ${data}\n\n`);
      });
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

    const newId = ctx.ip + '#' + uuidv4();
    this.clients[newId] = ctx.res;
    ctx.logger.info('[egg-eventsource] there is a new client joined, clientId:%s, count:%s', newId, this.count);
    const closeCallback = () => {
      delete this.clients[newId];
      ctx.logger.info('[egg-eventsource] client closed, clientId:%s, count:%s', newId, this.count);
    };
    ctx.req.on('close', closeCallback);
    ctx.res.on('close', closeCallback);
  }

  broadcast(event, data) {
    let fn;
    if (typeof event === 'function') {
      fn = event;
    } else if (arguments.length === 1) {
      data = event;
      event = 'message';
    }
    for (const clientId of Object.keys(this.clients)) {
      const client = this.clients[clientId];
      try {
        if (fn) {
          fn(client, clientId);
        } else {
          client.write(`event: ${event}\n`);
          client.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
        }
      } catch (e) {
        this.logger.info('clientId:%s, some exception happend, error: %j', clientId, e);
        // 发生异常的话，直接断开，等客户端自己发起重连
        delete this.clients[clientId];
        client.end();
      }
    }
  }
}

module.exports = EventStream;
