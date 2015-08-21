"use strict";

require('es6-shim');
var convnetjs = require('convnetjs');
var fs = require("fs");
var file  = "/pixifier/app/param-ini.json";
var getPixels = require("get-pixels");

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
    classes_txt.sort();

    // Search the minimum of pics in each folder
    var size = 0;
    classes_txt.forEach(function(className, index){

      var files = fs.readdirSync(path+className);
      if(size === 0 || size > files.length) size = files.length;
    });
    console.log("Size of dataset for each category:", size);

    var layer_defs, net, trainer;
    layer_defs = [];
    layer_defs.push({type:'input', out_sx:nbPixels, out_sy:nbPixels, out_depth:3});
    layer_defs.push({type:'conv', sx:5, filters:16, stride:1, pad:2, activation:'relu'});
    layer_defs.push({type:'pool', sx:2, stride:2});
    layer_defs.push({type:'conv', sx:5, filters:20, stride:1, pad:2, activation:'relu'});
    layer_defs.push({type:'pool', sx:2, stride:2});
    layer_defs.push({type:'conv', sx:5, filters:20, stride:1, pad:2, activation:'relu'});
    layer_defs.push({type:'pool', sx:2, stride:2});
    layer_defs.push({type:'softmax', num_classes:size});
    
    var net = new convnetjs.Net();
    net.makeLayers(layer_defs);
    
    trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', batch_size:10, l2_decay:0.0001});

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
          id: id,
          output: []
        }
        if(id < 0.9*size) listTrain.push(object);
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
            console.log("Error opening", object.path);
            resolve();
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
          console.log(pred==object.classId?"T ok":"T ko",pred, object.className, (index+1).toString()+'/'+listTrain.length.toString(), object.file);
          
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
              console.log("Error opening", object.path);
              resolve();
              return
            }
            
            for(var i=0; i<nbPixels; ++i)
              for(var j=0; j<nbPixels; ++j)
                for(var k=0; k<nbChannels; ++k)
                  x.set(i,j,k,pixels.get(i,j,k)/255.0-0.5);

            object.output = net.forward(x);


            var pred = net.getPrediction();
            var acc = pred==object.classId ? 1.0 : 0.0;
            //testAccWindow.add(acc);
            console.log(pred==object.classId?"V ok":"V ko",pred, object.className, (index+1).toString()+'/'+listValidate.length.toString(), object.file);
            resolve();
          });                              
        });
      }))
      .then(function(){
        fs.writeFile(path+"/Validated.json", JSON.stringify(listValidate), function(err){
          if(err) console.log(err);
        });
        console.log("results exported to JSON file");
      });
    });
  });
}

compute();