(function(global){

    var CONFIG = {
        baseUrl:'',
        paths:{},
        pathsArr:[],
        pathsArrScript:[]
    };
    var fileQueue = [];
    var defineQueue = []; 
    var requireQueue = [];
    var currentPath;//当前地址
    var fileLength;//文件长度
    var instanceMap = {};
    var versionMap = {}; //本地存储版本管理文件
    var fetchArray = []; //需要combo的js
    var loadedModsCount=0; //当前已加载的js数量

    var isFunction = isType('Function');
    var isString = isType('String');
    var isArray = isType('Array');
    var util = {
        isLs:function(){
            if(global.localStorage && (global.localStorage.setItem('isLlocalStorage', 1) , global.localStorage.getItem('isLlocalStorage') == 1)){
                return true;
            }else{
                return false;
            }
        },
        setLs:function(k,v){
            global.localStorage.setItem(k,v);
        },
        getLs:function(k){
            return global.localStorage.getItem(k);
        },
        removeLs:function(k){
            return global.localStorage.removeItem(k);
        },
        haveLs:function(k){
            return global.localStorage.hasOwnProperty(k);
        }
    };
    function isType(type) {
        return function(obj) {
            return Object.prototype.toString.call(obj) === '[object ' +  type + ']';
        }
    };
    function each(arr, func){
        for(var i = 0;i < arr.length;i++) func(arr[i]);
    };
    function eachReverse(arr, func){
        for(var i = arr.length - 1;i >= 0;i--) func(arr[i]);
    };
    function arrIndexOf(arr,item){
        if(Array.prototype.indexOf){
            return arr.indexOf(item);
        }else{ 
            for( var i=0;i<arr.length;i++){
                if(arr[i]===item)
                return i;
                else return -1;
            }
        }
    };
    function createScriptNode(){
        return global.document.createElement('SCRIPT');
    };
    function getPath(path){
        if(CONFIG.baseUrl){
            return CONFIG.baseUrl + path ;
        }else{
            var script = createScriptNode();
            script.src = path ;
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
    function noLsLoad(){
        var _url = CONFIG.pathsArrScript;
        if(_url.length > 0){
            currentPath = getPath(CONFIG.paths[_url.shift()]);
            var script = createScriptNode();
            script.src = currentPath;
            script.onload = function(){
                if(_url.length > 0){
                    noLsLoad();
                }else{
                    execDefines();
                    execRequires();
                    return;
                }
            };
            global.document.getElementsByTagName('HEAD')[0].appendChild(script);
        }
    };

    function loadFiles(url){

        console.log('添加文件:  ' + url + '实际对应值：'+CONFIG.paths[url]);

        //本地ls不存在记录combo文件
        if(!util.haveLs(CONFIG.paths[url])) {
            fetchCombo(url);
            return;
        };

        // 本地ls有效
        var scriptText = util.getLs(CONFIG.paths[url]);
        try {
            eval(scriptText);
            jsExecuted();
            fetchCombo();
        } catch (e) {
             console.log(e)
            //fetchCombo(url);
        };

    };

    function fetchCombo(item){

        //判断是否加载完
        item && fetchArray.push(item);

        //已加载的和combo != 总长度 || 没有combo的模块
        if ( !(loadedModsCount + fetchArray.length == fileLength && fetchArray.length)) {
            return;
        }

        console.log("%c 可以ajax ---- combo了",'color:red')
        for(var i = 0; i<fetchArray.length; i++){
            fetchArray[i] = CONFIG.paths[fetchArray[i]]
        };
        var fileUrl = CONFIG.baseUrl +"/combo/?js=" + fetchArray.join();
        console.log(fetchArray)
        var xhr = new XMLHttpRequest(); 
        xhr.open("get", fileUrl, true); 
        xhr.onreadystatechange = function(){
              if (xhr.readyState == 4){
                if (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304){
                  var text = xhr.responseText;
                  var arr = text.split('\n/*==content==*/\n');
                  console.log(arr);
                  for (var i=0; i<arr.length;i++){
                        eval(arr[i]);
                        util.setLs(fetchArray[i],arr[i]);
                        jsExecuted();
                  };
               }
            }
        };
        xhr.send(null);

    };

    function jsExecuted(){
        loadedModsCount++;
        //执行完  最终执行
        if(loadedModsCount != fileLength) { return; }
        console.log(instanceMap)
        console.log("执行加载逻辑");
        setTimeout(function(){
            execDefines();
            execRequires();
        },0);

    }

    function versionAdmin(){
        //确保LS会有配置文件，而且是最新的
        var __isUpdate = 0, // 1则更新版本文件
            __maps = function(url){
            //配置文件和缓存文件不相等，删除配置文件
            if(CONFIG.paths[url] != versionMap[url]){
                if(util.haveLs(versionMap[url])){
                    util.removeLs(versionMap[url]);
                };
                __isUpdate = 1;
            }
        };
        if(!util.haveLs("versionMap")){
            util.setLs("versionMap",JSON.stringify(CONFIG.paths));
            versionMap = CONFIG.paths;
        }else{
            versionMap = JSON.parse(util.getLs("versionMap"));
            for(var i = 0 ; i<CONFIG.pathsArr.length; i++){
                __maps(CONFIG.pathsArr[i]);
            }
            if(__isUpdate==1){
                util.setLs("versionMap",JSON.stringify(CONFIG.paths));
            }
        };

    };

    function define(id,deps,callback){

        var pathArr = [];

        if(isString(id) && isArray(deps) && isFunction(callback)){

            each(deps, function(path){
                pathArr.push(path);
            });

            var len = arrIndexOf(CONFIG.pathsArr,id); //获取这个define执行的位置

            defineQueue.splice(len,1,{
                callback: callback,
                dependencies: pathArr,
                id: id
            })

        }else{
            console.error("Parameter error")
        }
    };

    function require(deps, callback){

        var pathArr = [];

        if(isArray(deps)){
            each(deps,function(path){
                pathArr.push(path);
            });
            console.log('加载顺序1-2-3-5-4-6');
        };

        if(isFunction(callback)){
            requireQueue.push({
                callback: callback,
                dependencies: pathArr
            });
        };

    };

    require.config = function(config) {

        if (!config || !config.baseUrl || !config.paths) return;

        CONFIG.baseUrl = config.baseUrl;
        CONFIG.paths = config.paths;

        for(var k in CONFIG.paths){
            CONFIG.pathsArr.push(k);
            CONFIG.pathsArrScript.push(k);
        };

        fileLength = CONFIG.pathsArr.length;
        defineQueue.length = fileLength;

        if(!util.isLs()) {
            noLsLoad();
            return;
        };

        //版本管理
        versionAdmin();
        //模块加载
        for(var i = 0 ; i<CONFIG.pathsArr.length; i++){
            loadFiles(CONFIG.pathsArr[i]);
        };

    };

    define.amd = {};
    require.amd = {};

    global.define = define;
    global.require = require;

    //debug
    global.CONFIG = CONFIG;

})(this);