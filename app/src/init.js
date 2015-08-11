"use strict";

require('es6-shim');
require('/pixifier/app/param-ini.json');
var spawn = require('child_process').spawn;

var fs = require("fs");
var file  = "/pixifier/app/param-ini.json";
var request = require('request');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_HOST + ':9200',
    log: 'error'
});

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

var saveRange = function(pics, index, range) {

    var iMin = index * range;
    var iMax = Math.min((index+1)*range-1, pics.length-1);

    console.log(iMin,"...", iMax);

    return Promise.all(pics
        .slice(iMin, iMax) 
        .map(function(pic){

        return new Promise(function(subResolve, subReject){

            var wStream = fs.createWriteStream(pic.localPath);
            wStream.on("finish", function() {
                subResolve();
            });
            wStream.on('error', function(err) {
                console.log("ERROR:", pic.url, err);
                subReject();
            });
            request({
                url: pic.url,
                strictSSL: false
            }).pipe(wStream);
        });
        
    }))
    .then(function(){
        if (iMax === pics.length-1) return true;
        else return saveRange(pics, ++index, range);
    });
}

var loadWithAPI = function(){

    // Read json parameters
    console.log("[Build] folders with",file);
    console.time("[Build]");
    var data;
    fs.readFile(file, 'utf8', function (err, data) {
        
        if ( err != null ){ 
            console.log('Error Ini parameters: ' + err);
            return;
        }

        // Parse then build 1 folder by class
        data = JSON.parse(data);
        data.classes
            .filter(function(line){return (line.active===true);})
            .forEach(function(line){
            
            console.log("> Build", line.name);
            fs.mkdir('/pixifier/app/data/'+line.name,function(e){
                if(!e || (e && e.code === 'EEXIST')){
                    //do something with contents
                } else {
                    //debug
                    console.log(e);
                }
            });
        })
        console.timeEnd("[Build]");
        
        // Call API
        console.log("[Call]", data.urlAPI);
        
        console.time("[Call]");
        request({
            url: data.urlAPI,
            strictSSL: false
        }, function (err, response, body) {
            
            if(err){
                console.error('Call API error', err);
                return;
            }
            if(response.statusCode>=400) {
                console.log("Bad status reponse", response.statusCode);
                return;
            }
           
            // Parse all the objects
            var objects = JSON.parse(body);
            var list = [];
            
            data.classes
                .filter(function(line){return (line.active===true);})
                .forEach(function(line){

                console.log("> Call", line.name);
                var cpt = 0;
                
                objects
                .filter(function(object){
                    
                    if(line.categories.indexOf(object.category) === -1) return false;
                    return line.keywords.some(function(keyword){
                        return (object.title.strFormat().search(new RegExp(keyword, "i")) !== -1);
                    });
                })
                .forEach(function(object){
                    
                    object.pics.split(';')
                    .filter(function(text){
                        return (text !== '');
                    })
                    .forEach(function(pic){
                        if(cpt++ < data.maxPics){
                            list.push({
                                url:        data.urlPics +'/'+pic,
                                localPath:  '/pixifier/app/data/'+line.name+'/'+pic//stock object to download
                            });
                        }
                    });
                });
            });
            console.timeEnd("[Call]");


            console.log("[Download] : " + list.length + ' pics');
            console.time("[Download]");

            saveRange(list,0,1000)
            .then(function(result){
                
                console.timeEnd("[Download]");
            
                console.log("[Resize]");
                console.time("[Resize]");

                var proc = spawn('python', ['-u', '/pixifier/app/utils_python/resize.py']);
                proc.stdout.on('data', function(buffer){
                    console.log(String(buffer).replace('\n',''));
                });
                proc.stderr.on('data', function(buffer) { 
                    console.log("Error on resizing :", String(buffer).replace('\n',''));
                });
                proc.on('close', function(code) { 
                    console.timeEnd("[Resize]");
                });
            });
        });
    });
}

var loadWithRequests = function(){

    // Read json parameters
    console.log("[Build] folders with",file);
    console.time("[Build]");
    var data;
    fs.readFile(file, 'utf8', function (err, data) {
        
        if ( err != null ){ 
            console.log('Error Ini parameters: ' + err);
            return;
        }

        // Parse then build 1 folder by class
        data = JSON.parse(data);
        data.classes
            .filter(function(line){return (line.active===true);})
            .forEach(function(line){
            
            console.log("> Build", line.name);
            fs.mkdir('/pixifier/app/data/'+line.name,function(e){
                if(!e || (e && e.code === 'EEXIST')){
                    //do something with contents
                } else {
                    //debug
                    console.log(e);
                }
            });
        })
        console.timeEnd("[Build]");
        
        // Call API
        var list = [];
                    
        Promise.all(data.classes
            .filter(function(line){return (line.active===true);})
            .map(function(line){

            return new Promise(function(resolve, reject){

                var url = data.urlAPI+'/';
                for(var i=0; i<line.categories.length; ++i){
                    url += line.categories[i];
                    if(i<line.categories.length-1)
                        url+= "_OR_";
                }
                url += "/";
                for(var i=0; i<line.keywords.length; ++i){
                    url += line.keywords[i];
                    if(i<line.keywords.length-1)
                        url+= "_OR_";
                }

                console.log("[Call]", url);
            
                console.time("[Call]");
                request({
                    url: url,
                    strictSSL: false
                }, function (err, response, body) {
                    
                    if(err){
                        console.error('Call API error', err);
                        reject();
                        return;
                    }
                    if(response.statusCode>=400) {
                        console.log("Bad status reponse", response.statusCode);
                        reject()
                        return;
                    }
                   
                    // Parse all the objects
                    var objects = JSON.parse(body);
                    console.log(objects.length, 'objects for', url);
                    
                    var cpt = 0;
                    
                    objects
                    .forEach(function(object){
                        
                        object.pics.split(';')
                        .filter(function(text){
                            return (text !== '');
                        })
                        .forEach(function(pic){
                            if(cpt++ < data.maxPics){
                                list.push({
                                    url:        data.urlPics +'/'+pic,
                                    localPath:  '/pixifier/app/data/'+line.name+'/'+pic//stock object to download
                                });
                            }
                        });
                    });
                    console.timeEnd("[Call]");
                    resolve();
                });
            });

        }))
        .then(function(){

            console.log("[Download] : " + list.length + ' pics');
            console.time("[Download]");

            saveRange(list,0,1000)
            .then(function(result){

                console.timeEnd("[Download]");
            
                console.log("[Resize]");
                console.time("[Resize]");

                var proc = spawn('python', ['-u', '/pixifier/app/utils_python/resize.py']);
                proc.stdout.on('data', function(buffer){
                    console.log(String(buffer).replace('\n',''));
                });
                proc.stderr.on('data', function(buffer) { 
                    console.log("Error on resizing :", String(buffer).replace('\n',''));
                });
                proc.on('close', function(code) { 
                    console.timeEnd("[Resize]");
                });
            })
            .catch(function(err){
                console.log('Promise error Download', err);
            });
        })
        .catch(function(err){
            console.log('Promise error Call', err);
        });
    });
}

var loadWithES = function(){

    // Read json parameters
    console.log("[Build] folders with",file);
    console.time("[Build]");
    var data;
    fs.readFile(file, 'utf8', function (err, data) {
        
        if ( err != null ){ 
            console.log('Error Ini parameters: ' + err);
            return;
        }

        // Parse then build 1 folder by class
        data = JSON.parse(data);
        data.classes
            .filter(function(line){return (line.active===true);})
            .forEach(function(line){
            
            console.log("> Build", line.name);
            fs.mkdir('/pixifier/app/data/'+line.name,function(e){
                if(!e || (e && e.code === 'EEXIST')){
                    //do something with contents
                } else {
                    //debug
                    console.log(e);
                }
            });
        })
        console.timeEnd("[Build]");
        
        var client = new elasticsearch.Client({
            host: data.urlAPI,
            log: 'error'
        });

        // Call API
        var list = [];
                    
        Promise.all(data.classes
            .filter(function(line){return (line.active===true);})
            .map(function(line){

            return new Promise(function(resolve, reject){

                var url = data.urlAPI+'/';
                for(var i=0; i<line.categories.length; ++i){
                    url += line.categories[i];
                    if(i<line.categories.length-1)
                        url+= "_OR_";
                }
                url += "/";
                for(var i=0; i<line.keywords.length; ++i){
                    url += line.keywords[i];
                    if(i<line.keywords.length-1)
                        url+= "_OR_";
                }

                console.log("[Call]", url);
            
                console.time("[Call]");

                client.search({
                    index: "annonce",
                    q: "title:"+line.name
                }, function (error, response) {
                    
                    if(error){
                        console.error('Call API error', err);
                        reject();
                        return;
                    }
                    
                    var objects = response.hits.hits;
                    console.log(objects.length, 'objects for', url);
                    
                    var cpt = 0;
                    
                    objects
                    .forEach(function(object){
                        
                        object._source.pics.split(';')
                        .filter(function(text){
                            return (text !== '');
                        })
                        .forEach(function(pic){
                            if(cpt++ < data.maxPics){
                                list.push({
                                    url:        data.urlPics +'/'+pic,
                                    localPath:  '/pixifier/app/data/'+line.name+'/'+pic//stock object to download
                                });
                            }
                        });
                    });
                    console.timeEnd("[Call]");
                    resolve();
                });
            });

        }))
        .then(function(){

            console.log("[Download] : " + list.length + ' pics');
            console.time("[Download]");

            saveRange(list,0,1000)
            .then(function(result){

                console.timeEnd("[Download]");
            
                console.log("[Resize]");
                console.time("[Resize]");

                var proc = spawn('python', ['-u', '/pixifier/app/utils_python/resize.py']);
                proc.stdout.on('data', function(buffer){
                    console.log(String(buffer).replace('\n',''));
                });
                proc.stderr.on('data', function(buffer) { 
                    console.log("Error on resizing :", String(buffer).replace('\n',''));
                });
                proc.on('close', function(code) { 
                    console.timeEnd("[Resize]");
                });
            })
            .catch(function(err){
                console.log('Promise error Download', err);
            });
        })
        .catch(function(err){
            console.log('Promise error Call', err);
        });
    });
}

loadWithES();