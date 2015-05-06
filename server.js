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
  response.end(JSON.stringify(error));
}

app.get('*', function(req, res, next) {
  try {
    var url = getUrl(req.url);
    var options = {
      url: url,
      method: 'GET',
      headers: getHeaders(req.headers)
    };

    request(options, function(error, response, body) {
      if (error) throw error.message;
      addHeaders(res, getHeaders(response.headers));
      body = JSON.parse(body);
      body = v1hal.assetJson2CleanJson('https://www14.v1host.com', body);
      body = JSON.stringify(body);
      res.set('Content-Type', 'application/hal+json');
      res.status(200).send(body);
    });
  } catch (exception) {
    responseError(res, exception);
  }
});

app.post('*', function(req, res, next) {
  try {
    var options = {
      url: getUrl(req.url),
      method: 'POST',
      body: req.body,
      headers: getHeaders(req.headers)
    };

    request(options, function(error, response, body) {
      if (error) throw error.message;
      addHeaders(res, getHeaders(response.headers));
      body = v1hal.json2AssetXml(body);
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