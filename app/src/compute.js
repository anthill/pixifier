"use strict";

require('es6-shim');
var convnetjs = require('convnetjs');
var fs = require("fs");
var file  = "/pixifier/app/param-ini.json";
var getPixels = require("get-pixels");

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

  var nbPixels = 64;
  var nbChannels = 4;
  var path = '/pixifier/app/data/';
  var data;
  fs.readFile(file, 'utf8', function (err, data) {

    if ( err != null ){ 
      console.log('Error Data: ' + err);
      return;
    }
    
    var classes_txt = [];      
    data = JSON.parse(data);
    data.classes.forEach(function(line){
      if(line.active === true)
        classes_txt.push(line.name);
    });


    var layer_defs, net, trainer;
    layer_defs = [];
    layer_defs.push({type:'input', out_sx:nbPixels, out_sy:nbPixels, out_depth:1});
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

    var nbTrain = 100;
    var nbValidate = 50;

    console.log("*** Training ***");

    var listTrain = [];
    var listValidate = [];

    classes_txt.forEach(function(className, index){

      var files = fs.readdirSync(path+className);
      files.forEach(function(file, id){

        var object = {
          path: path+className+'/'+file,
          file: file,
          classId: index,
          className: className,
          id: id
        }
        if(id < nbTrain) listTrain.push(object);
        else listValidate.push(object);
      });
    });

    listTrain.sort(function(o1,o2){
      return (o1.id-o2.id);
    });
    listValidate.sort(function(o1,o2){
      return (o2.id-o1.id);
    });
    
    Promise.all(listTrain
      .map(function(object, index){

      return new Promise(function(resolve, reject){

        var x = new convnetjs.Vol(nbPixels,nbPixels,nbChannels,0.0);
        getPixels(object.path, function(err, pixels) {
          if(err) {
            console.log("Bad image path");
            reject();
            return
          }
          
          for(var i=0; i<nbPixels; ++i)
            for(var j=0; j<nbPixels; ++j)
              for(var k=0; k<nbChannels; ++k)
                x.set(i,j,k,pixels.get(i,j,k)/255.0-0.5);


          var output = trainer.train(x, object.classId);
          
          var pred = net.getPrediction();
          var acc = pred==object.classId ? 1.0 : 0.0;
          //testAccWindow.add(acc);
          console.log(pred==object.classId?"T ok":"T ko",pred, object.className, index, object.file);
          
          resolve();
        });
      });
    }))
    .then(function(){
      console.log("*** Validation ***");
      
      Promise.all(listValidate
      .map(function(object, index){

        return new Promise(function(resolve, reject){

          var x = new convnetjs.Vol(nbPixels,nbPixels,nbChannels,0.0);
          getPixels(object.path, function(err, pixels) {
            if(err) {
              console.log("Bad image path");
              reject();
              return
            }
            
            for(var i=0; i<nbPixels; ++i)
              for(var j=0; j<nbPixels; ++j)
                for(var k=0; k<nbChannels; ++k)
                  x.set(i,j,k,pixels.get(i,j,k)/255.0-0.5);



            var output = net.forward(x);

            var pred = net.getPrediction();
            var acc = pred==object.classId ? 1.0 : 0.0;
            //testAccWindow.add(acc);
            console.log(pred==object.classId?"V ok":"V ko",pred, object.className, index, object.file);
            resolve();
          });                              
        });
      }))
      .then(function(){
        console.log("yo");
      });
    });
  });
}

compute();