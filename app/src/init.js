"use strict";

require('es6-shim');
require('/pixifier/app/param-ini.json');

var fs = require("fs");

var file  = "/pixifier/app/param-ini.json";
var request = require('request');

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

var data;
fs.readFile(file, 'utf8', function (err, data) {
    if ( err != null ){ 
        console.log('Error Data: ' + err);
        return;
    }

    var names = [];
    var categories = [];
    var keywords = [];
    data = JSON.parse(data);
    data.classes.map(function(line, index){
        console.log(">", line.category);
        names.push(line.name);
        categories.push(line.category);
        keywords.push(line.keywords);
        fs.mkdir('./data/'+line.name,function(e){
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
        }
        else if(response.statusCode>=400) {
            console.log("bad status reponse", response.statusCode);
        }
        else
        {
            var objects = JSON.parse(body);
            objects.forEach(function(object){
                var index = categories.indexOf(object.category);
                if(index !== -1){
                    var keyword = keywords[index];
                    keyword.forEach(function(kword) {
                        var match = object.title.strFormat().search(new RegExp(kword, "i")) !== -1;
                        if( match 
                            && object.pics !== null
                            && object.pics !== '-'){
                            object.pics.split(';').forEach(function(pic){
                                if(pic !== ''){
                                    var path = data.urlPics +'/'+pic;
                                    var localPath = './data/'+names[index]+'/'+pic;
                                    request({
                                        url: path,
                                        strictSSL: false
                                    }).pipe(fs.createWriteStream(localPath));
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});