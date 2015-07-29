"use strict";

require('es6-shim');
require('/pixifier/app/param-ini.json');
var spawn = require('child_process').spawn;

var fs = require("fs");
var file  = "/pixifier/app/param-ini.json";
var request = require('request');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var image_dimension = 64;

String.prototype.strFormat = function(){
    
    var accent = [
        /[\300-\306]/g, /[\340-\346]/g, // A, a
        /[\310-\313]/g, /[\350-\353]/g, // E, e
        /[\314-\317]/g, /[\354-\357]/g, // I, i
        /[\322-\330]/g, /[\362-\370]/g, // O, o
        /[\331-\334]/g, /[\371-\374]/g, // U, u
        /[\321]/g, /[\361]/g, // N, n
        /[\307]/g, /[\347]/g, // C, c
    ];
    var noaccent = ['A','a','E','e','I','i','O','o','U','u','N','n','C','c'];
   
    var str = this;
    for(var i = 0; i < accent.length; i++){
        str = str.replace(accent[i], noaccent[i]);
    }
 
    return str;
}

var saveImage = function(pics, index) {
    
    var thisIndex = index.value;
    var wStream = fs.createWriteStream(pics[thisIndex].localPath);

    wStream.on("finish", function() {
        wStream.end();
        if (index.value < pics.length)
            eventEmitter.emit("new", pics, index);
        eventEmitter.emit("download");    
    });

    request({
        url: pics[thisIndex].url,
        strictSSL: false
    }).pipe(wStream);
}

var resizeImages = function(){

    console.log("Resizing pictures");

    var proc = spawn('python', ['-u', '/pixifier/app/utils_python/resize.py']);
    proc.stdout.on('data', function(buffer){
        console.log(String(buffer).replace('\n',''));
    });
    proc.stderr.on('data', function(buffer) { 
        console.log("Error on resizing :", String(buffer).replace('\n',''));
    });
    proc.on('close', function(code) { 
        console.log("End of resizing");
    });
}

//resizeImages();

var loadImages = function(){
    var data;
    fs.readFile(file, 'utf8', function (err, data) {
        if ( err != null ){ 
            console.log('Error Data: ' + err);
            return;
        }

        data = JSON.parse(data);
        data.classes.forEach(function(line){
            console.log("> Building ", line.name);
            fs.mkdir('/pixifier/app/data/'+line.name,function(e){
                if(!e || (e && e.code === 'EEXIST')){
                    //do something with contents
                } else {
                    //debug
                    console.log(e);
                }
            });
        })
        
        console.log("Calling", data.urlAPI);
        request({
            url: data.urlAPI,
            strictSSL: false
        }, function (err, response, body) {
            
            if(err){
                console.error('Calling API error', err);
                return;
            }
            if(response.statusCode>=400) {
                console.log("bad status reponse", response.statusCode);
                return;
            }

            var objects = JSON.parse(body);
            var list = [];
            var index = {value: 0}; // not picIndex = 0 in order to be able to change the value inside of a function
            var cpt = {value: 0};
            var maxNbFiles = 1000;

            data.classes.map(function(line){

                console.log("> Crawling ", line.name);
                
                objects
                .filter(function(object){
                    
                    if(line.categories.indexOf(object.category) === -1) return false;
                    return line.keywords.some(function(keyword){
                        return (object.title.strFormat().search(new RegExp(keyword, "i")) !== -1);
                    });
                })
                .map(function(object){
                    
                    object.pics.split(';')
                    .filter(function(text){
                        return (text !== '');
                    })
                    .forEach(function(pic){

                        list.push({
                            url:        data.urlPics +'/'+pic,
                            localPath:  '/pixifier/app/data/'+line.name+'/'+pic//stock object to download
                        });
                    });
                });
            });

            console.log("Pics to download : " + list.length)

            // when one picture is saved, start another one
            eventEmitter.on("new", function(pics, index) {
                saveImage(pics, index);
                ++index.value;
            });

            eventEmitter.on("download", function() {
                ++cpt.value;
                if(cpt.value === list.length)
                    resizeImages();
            });

            // send the first pics to save
            for (var img = 0; img <= maxNbFiles; ++img) {
                eventEmitter.emit("new", list, index);
            }

        });
    });
}

loadImages();