"use strict";

require('es6-shim');
var convnetjs = require('convnetjs');
var fs = require("fs");
var file  = "/pixifier/app/param-ini.json";

var sample_training_instance = function() {
  // find an unloaded batch
  var bi = Math.floor(Math.random()*loaded_train_batches.length);
  var b = loaded_train_batches[bi];
  var k = Math.floor(Math.random()*num_samples_per_batch); // sample within the batch
  var n = b*num_samples_per_batch+k;

  // load more batches over time
  if(step_num%(2 * num_samples_per_batch)===0 && step_num>0) {
    for(var i=0;i<num_batches;i++) {
      if(!loaded[i]) {
        // load it
        load_data_batch(i);
        break; // okay for now
      }
    }
  }

  // fetch the appropriate row of the training image and reshape into a Vol
  var p = img_data[b].data;
  var x = new convnetjs.Vol(image_dimension,image_dimension,image_channels,0.0);
  var W = image_dimension*image_dimension;
  var j=0;
  for(var dc=0;dc<image_channels;dc++) {
    var i=0;
    for(var xc=0;xc<image_dimension;xc++) {
      for(var yc=0;yc<image_dimension;yc++) {
        var ix = ((W * k) + i) * 4 + dc;
        x.set(yc,xc,dc,p[ix]/255.0-0.5);
        i++;
      }
    }
  }

  /*
  if(random_position){
    var dx = Math.floor(Math.random()*5-2);
    var dy = Math.floor(Math.random()*5-2);
    x = convnetjs.augment(x, image_dimension, dx, dy, false); //maybe change position
  }

  if(random_flip){
    x = convnetjs.augment(x, image_dimension, 0, 0, Math.random()<0.5); //maybe flip horizontally
  }*/

  var isval = use_validation_data && n%10===0 ? true : false;
  return {x:x, label:labels[n], isval:isval};
}

var compute = function(){

  var path = '/pixifier/app/data/';
  var data;
  fs.readFile(file, 'utf8', function (err, data) {

    if ( err != null ){ 
      console.log('Error Data: ' + err);
      return;
    }
    
    var classes_txt = [];      
    data = JSON.parse(data);
    data.classes.map(function(line, index){
      classes_txt.push(line.name);
    });

    classes_txt.forEach(function(className){

      console.log(">", className);
      var files = fs.readdirSync(path+className);
      
      var content;
      fs.readFile(path+className+'/'+files[0], function (err, content) {
        if (err) console.log(err);
        console.log(content);
      });


    });

    
    /*
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
    
    trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', batch_size:1, l2_decay:0.0001});

    var lossWindow = new Window();
    for(var iter=0; iter<10; iter++) {


    }
    var data_img_elts = new Array(num_batches);
    var img_data = new Array(num_batches);
    var loaded = new Array(num_batches);
    var loaded_train_batches = [];

    for(var k=0;k<loaded.length;k++) { loaded[k] = false; }

    load_data_batch(0); // async load train set batch 0
    load_data_batch(test_batch); // async load test set
    start_fun();

    // Training code here !

    console.log("Saving model");
    var result = net.toJSON();
    var modelPath = "/pixifier/app/data/results.json";
    fs.writeFile(modelPath, JSON.stringify(result), function(err) {
      if (err) console.log(err);
      console.log("Model saved in ", modelPath);
    });
    */
  });
}

compute();