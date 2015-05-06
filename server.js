var bodyParser = require('body-parser'),
  request = require('request'),
  express = require('express'),
  app = express(),
  v1hal = require('./lib/v1hal'),
  cors = require('cors');

app.use(bodyParser.text({
  type: 'application/xml'
}));
app.use(cors());

function getBaseUrl(url) {
  var match = url.match('(https?:\/\/.*?)\/.*', 'i');
  // TODO: clean up
  if (match !== null) return match[1];
  return '';
}

function getUrl(url) {
  //remove the initial slash    
  url = url.substr(1);
  var accepts = 'accept=application/json';
  if (url.indexOf('?') < 0) {
    accepts = '?' + accepts;
  } else {
    accepts = '&' + accepts;
  }
  url += accepts;

  return url;
}

function getHeaders(headers) {
  var result = {};
  for (h in headers) {
    if (h == 'host' || h == 'origin' || h == 'referer' || h == 'accept-encoding')
      continue;
    result[h] = headers[h];
  }
  return result;
}

function href(req, path) {
  var protocol = req.protocol;
  var host = req.get('host');
  return protocol + "://" + host + path;
}

function addHeaders(response, headers) {
  for (h in headers) {
    response.setHeader(h, headers[h]);
  }
}

function responseError(response, msg) {
  response.type('application/json; charset=utf-8');
  var error = {
    error: msg
  };
  response.status(400).send(JSON.stringify(error));
}

app.get('*', function(req, res, next) {
  try {
    var url = getUrl(req.url);
    var baseUrl = href(req, '/' + getBaseUrl(url));
    var options = {
      url: url,
      method: 'GET',
      headers: getHeaders(req.headers)
    };

    request(options, function(error, response, body) {
      if (error) throw error.message;
      addHeaders(res, getHeaders(response.headers));
      body = JSON.parse(body);
      body = v1hal.assetJson2CleanJson(baseUrl, body);
      body = JSON.stringify(body);
      res.set('Content-Type', 'application/hal+json');
      res.status(200).send(body);
    });
  } catch (exception) {
    responseError(res, exception);
  }
});

app.post('*', bodyParser.json(), function(req, res, next) {
  try {
    var obj = req.body;
    var body = v1hal.json2AssetXml(obj);

    var url = getUrl(req.url);
    var baseUrl = href(req, '/' + getBaseUrl(url));

    var options = {
      url: url,
      method: 'POST',
      body: body,
      headers: getHeaders(req.headers)
    };

    // Important to reset these before sending to V1:
    options.headers['Content-Type'] = 'application/xml';
    options.headers['Content-Length'] = body.length;

    request(options, function(error, response, body) {
      if (error) throw error.message;
      addHeaders(res, getHeaders(response.headers));
      body = JSON.parse(body);
      body = v1hal.assetJson2CleanJson(baseUrl, body);
      body = JSON.stringify(body);
      res.set('Content-Type', 'application/hal+json');
      res.status(200).send(body);
    });
  } catch (exception) {
    responseError(res, exception);
  }

});

var port = Number(process.env.PORT || 5000);

app.listen(port, function() {
  console.log('VersionOne REST API HAL Proxy listening on port ' + port);
});