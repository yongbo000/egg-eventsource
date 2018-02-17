'use strict';

const mock = require('egg-mock');

describe('test/eventsource.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'apps/eventsource-test',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .expect('hi, eventsource')
      .expect(200);
  });
});
