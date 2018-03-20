(function(global){
    var CONFIG = {
        baseUrl:''
    };
    var fileQueue = [];
    var defineQueue = [];
    var requireQueue = [];
    var currentPath;//当前地址
    var instanceMap = {};
    var aliasMap = {};
    var finishFileQueue = [];//已完成加载的js
    var isFunction = isType('Function');
    var isString = isType('String');
    var isArray = isType('Array');
    var xhr = new XMLHttpRequest(); 

    function isType(type) {
        return function(obj) {
            return Object.prototype.toString.call(obj) === '[object ' + type + ']';
        }
    };
    function each(arr, func){
        for(var i = 0;i < arr.length;i++) func(arr[i]);
    };
    function eachReverse(arr, func){
        for(var i = arr.length - 1;i >= 0;i--) func(arr[i]);
    };
    function createScriptNode(){
        return global.document.createElement('SCRIPT');
    };
    function getPath(path){
        if(CONFIG.baseUrl){
            return CONFIG.baseUrl + path + '.js';
        }else{
            var script = createScriptNode();
            script.src = path + '.js';
            return script.src;
        }
    };
    function getInstances(deps){
        var result = [];
        each(deps, function(id){
            result.push(instanceMap[id]);
        });
        return result;
    };
    function execDefines(){
        console.info(defineQueue);
        eachReverse(defineQueue, function(def){
            var callback = def.callback,
                deps = def.dependencies,
                id = def.id;
            instanceMap[id] = callback.apply(global, getInstances(deps));
        });
    };
    function execRequires(){
        each(requireQueue, function(req){
            var callback = req.callback,
                deps = req.dependencies;
            callback.apply(global, getInstances(deps));
        });
    };
    function contains(arr, obj) {  
        var i = arr.length;  
        while (i--) {  
            if (arr[i] === obj) {  
                return true;  
            }  
        }  
        return false;  
    };
    function ajax(fileUrl){
        xhr.open("get", fileUrl, true); 
        xhr.onreadystatechange = function(){
              if (xhr.readyState == 4){
                if (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304){
                  var script = document.createElement("script"); 
                  script.type = "text/javascript";
                  script.text = xhr.responseText;
                  global.document.body.appendChild(script);
                  if(fileQueue.length > 0){
                      loadFiles();
                  }else{
                      execDefines();
                      execRequires();
                      return;
                  };
               } 
            }
        };
        xhr.send(null);
    };
    function loadFiles(){
        if(fileQueue.length > 0){
            currentPath = fileQueue.shift();
            //判断是否已加载
            if(contains(finishFileQueue,currentPath)){
                if(fileQueue.length > 0){
                    loadFiles();
                }else{
                    execDefines();
                    execRequires();
                    return;
                }
            }else{
                finishFileQueue.push(currentPath);
                //ajax(currentPath);
                
                    var script = createScriptNode();
                    script.src = currentPath;
                    script.onload = function(){
                        if(fileQueue.length > 0){
                            loadFiles();
                        }else{
                            execDefines();
                            execRequires();
                            return;
                        }
                    };
                    global.document.getElementsByTagName('HEAD')[0].appendChild(script);
                
            };

        }
    };

    function define(id,deps,callback){
        var pathArr = [];
        if(isString(id) && isArray(deps) && isFunction(callback)){
            aliasMap[id] = currentPath;
            id = currentPath;
        }
        if(isArray(id) && isFunction(deps)){
            callback = deps;
            deps = id;
            id = currentPath;
        }
        if(isFunction(id)){
            callback = id;
            deps = [];
            id = currentPath;
        }

        if(isArray(deps)) {
            each(deps, function(path){
                pathArr.push(getPath(path));
            });
            fileQueue = fileQueue.concat(pathArr);
            //console.log(fileQueue)
        }
        if(isFunction(callback)) defineQueue.push({
            callback: callback,
            dependencies: pathArr,
            id: id
        });

    };

    function require(deps, callback){
        var pathArr = [];
        if(isArray(deps)){
            each(deps,function(path){
                pathArr.push(getPath(path))
            });
            fileQueue = fileQueue.concat(pathArr);
            console.log(fileQueue)
        };
        if(isFunction(callback)){
            requireQueue.push({
                callback: callback,
                dependencies: pathArr
            });
            console.log(requireQueue)
        };
        loadFiles();
    };

    require.config = function(config) {
        if (!config) return;
        if(config.baseUrl){
            CONFIG.baseUrl = config.baseUrl;
            console.log(CONFIG)
        };
    };

    define.amd = {};
    require.amd = {};
    global.define = define;
    global.require = require;
    //debug
    //global.instanceMap = instanceMap;

})(this);