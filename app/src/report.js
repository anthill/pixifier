"use strict";

require('es6-shim');


var bodyParser	= require('body-parser');
var express 	= require('express');
var app 		= express();
var fs = require('fs');
var path = require('path');
var server 	= require('http').createServer(app);

app.use(bodyParser.json({limit: '1000mb'}));
app.use(bodyParser.urlencoded({extended: true}))

app.use('/data', express.static(__dirname + '/../data/'));
app.use('/', express.static(__dirname + '/../web/'));


app.get('/validate', function(req, res){

	fs.readFile(__dirname + "/../data/Validated.json", 'utf8', function (err, json) {
    
    if ( err != null ){ 
        console.log('Error Data: ' + err);
        return;
    }
    else
    {
      var data = JSON.parse(json);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(data));
    }
  });
});


//app.use(routes.beta403);// 404 catchall
server.listen(process.env.VIRTUAL_PORT);
console.log('Server started on', process.env.VIRTUAL_PORT);
