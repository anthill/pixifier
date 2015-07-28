"use strict";

require('es6-shim');
var convnetjs = require('convnetjs');

var fs = require("fs");
var file  = "/pixifier/app/param-ini.json";

var compute = function(){

  var data;
  fs.readFile(file, 'utf8', function (err, data) {

    if ( err != null ){ 
      console.log('Error Data: ' + err);
      return;
    }
    
    var classes_txt = [];      
    data = JSON.parse(data);
    data.classes.map(function(line, index){
      console.log(">", line.name);
      classes_txt.push(line.name);
    });

    var dataset_name = "yo";
    var num_batches = 51; // 20 training batches, 1 test
    var test_batch = 50;
    var num_samples_per_batch = 1000;
    var image_dimension = 32;
    var image_channels = 3;
    var use_validation_data = true;
    var random_flip = true;
    var random_position = true;

    var layer_defs, net, trainer;
    layer_defs = [];
    layer_defs.push({type:'input', out_sx:32, out_sy:32, out_depth:3});
    layer_defs.push({type:'conv', sx:5, filters:16, stride:1, pad:2, activation:'relu'});
    layer_defs.push({type:'pool', sx:2, stride:2});
    layer_defs.push({type:'conv', sx:5, filters:20, stride:1, pad:2, activation:'relu'});
    layer_defs.push({type:'pool', sx:2, stride:2});
    layer_defs.push({type:'conv', sx:5, filters:20, stride:1, pad:2, activation:'relu'});
    layer_defs.push({type:'pool', sx:2, stride:2});
    layer_defs.push({type:'softmax', num_classes:classes_txt.length});
    
    var net = new convnetjs.Net();
    net.makeLayers(layer_defs);
    
    trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', batch_size:4, l2_decay:0.0001});

    // Training code here !

    console.log("Saving model");
    var result = net.toJSON();
    var modelPath = "/pixifier/app/data/results.json";
    fs.writeFile(modelPath, JSON.stringify(result), function(err) {
      if (err) console.log(err);
      console.log("Model saved in ", modelPath);
    });
  });
}

compute();