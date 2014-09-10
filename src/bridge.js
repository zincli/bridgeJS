;(function (global, JSON){

    var bridge = {};

    var log = function (){
        if(typeof console === 'object' && console.log){
            console.log(arguments);
        }
    };

    var util = {
        isArray: function (obj){
            return "[object Array]" === Object.prototype.toString.call(obj);
        }, 
        
        forEach: function (obj, process, context){
            var i, len;
            if(this.isArray(obj)){
                len = obj.length;
                for(i = 0; i < len; i++){
                    process.call(context, obj[i], i, obj);
                }
            } else if('object' === typeof obj) {
                for(i in obj){
                    if(obj.hasOwnProperty(i)){
                        process.call(context, obj[i], i, obj);
                    }
                }
            }
        },

        bind: function (fn, context){
            return function (){
                fn.apply(context, arguments);
            };
        },

        ns: function (context, namespace){
            var parts = namespace.split('.'),
                parent = context;

            if(namespace === ''){
                return context;
            }

            parts.forEach(function (part){
                if(!parent[part]){
                    parent[part] = {};
                }
                parent = parent[part];
            });

            return parent;
        }
    };

    if( 'undefined' === typeof JSON ){
        throw new Exception('JSON not exists!');
    }

    var _uuid = {
        _increasing_num: 0,
        _default_prifix: 'uuid',
        create: function ( prefix ){
            prefix = prefix || this._default_prifix;
            return prefix + (new Date()).getTime() + (this._increasing_num++);
        }
    };

    var Callback = {
        _export_name: '__callback_',
        _pool: {},
        _export: function (){
            global[this._export_name] = this._pool;
        },

        _getCallbackName: function (uuid){
            return this._export_name + '.' + uuid;
        },

        _add: function (uuid, callback){
            var self = this;

            this._pool[uuid] = function (){
                var args = [], i = arguments.length - 1;
                try{
                    for(i;i >= 0;i--){
                        args.unshift(JSON.parse(arguments[i]));
                    }
                    callback.apply(null, args);
                } catch(e){
                    log('callback throws an exception: ', e);
                } finally{
                    self.remove(uuid);
                }
            };
        },

        register: function (callback){
            var uuid = _uuid.create();
            this._add(uuid, callback);
            return this._getCallbackName(uuid);
        },

        remove: function (uuid){
            delete this._pool[uuid];
        },

        init: function (){
            this._export();
        }
    };

    Callback.init();

    //Copyright 2009 Nicholas C. Zakas. All rights reserved.
    //MIT Licensed
    function timedChunk(items, process, context, callback){
        var todo = items.concat();   //create a clone of the original

        if( todo.length === 0 ){
            return;
        }

        setTimeout(function(){

            var start = +new Date();

            do {
                process.call(context, todo.shift());
            } while (todo.length > 0 && (+new Date() - start < 50));

            if (todo.length > 0){
                setTimeout(arguments.callee, 25);
            } else {
                callback && callback(items);
            }
        }, 25);
    }

    var Event = {
        _export_name: '__event_trigger',
        _pool: {},
        _export: function (){
            global[this._export_name] = util.bind(this.trigger, this);
        },

        _hasEvent: function ( name ){
            return name in this._pool;
        },

        trigger: function (eventName){
            var args;
            if( this._hasEvent(eventName) ){
                args = Array.prototype.slice.call(arguments, 1);
                timedChunk(this._pool[eventName], function (listener){
                    try{
                        listener.handle.apply(listener.context, args);
                    } catch(e){
                        log('error occurred while calling handlers of event ', eventName);
                    }
                });
            }
        },

        on: function (eventName, handle, context){
            if(!this._hasEvent(eventName)){
                this._pool[eventName] = [];
            }
            this._pool[eventName].push({
                context: context,
                handle: handle
            });
        },

        off: function (eventName, handle){
            var i = 0, listeners, len;
            if( this._hasEvent(eventName) ){
                listeners = this._pool[eventName];

                if( undefined == handle ){
                    listeners.length = 0;
                    return true;
                }

                len = listeners.length;
                for(i;i < len;i++){
                    if( handle === listeners[i].handle ){
                        listeners.splice(i, 1);
                        if( listeners.length === 0 ){
                            delete this._pool[eventName];
                        }
                        return true;
                    }
                }
            }
            return false;
        },

        init: function (){
            this._export();
        }
    };

    Event.init();

    /**
     *
     * @param options {
     *     api: [{name: 'api', fn: some_api, args: arguments_descriptions}]
     * }
     * @constructor
     */
    var SDK = function (options){
        if( options && util.isArray(options.api) ){
            util.forEach(options.api, function (api){
                this.createAPI(api.name, api.fn, api.args);
            }, this);
        }
    };

    SDK.prototype.on = util.bind(Event.on, Event);
    SDK.prototype.off = util.bind(Event.off, Event);

    var _resolveArgs = function ( descriptions, args ){
        var result = [], arg;
        util.forEach(descriptions, function (desc){
            switch(desc.type){
                case 'callback':
                    arg = Callback.register(args[desc.index]);
                    break;
                case 'json':
                    arg = JSON.stringify(args[desc.index]);
                    break;
                case 'string':
                    arg = args[desc.index].toString();
                    break;
                default:
                    arg = args[desc.index];
            }
            result[desc.index] = arg;
        });
        return result;
    };
    SDK.prototype.createAPI = function (name, api_fn, argsDescriptions){
        var nsArray = name.split('.'),
            apiName = nsArray.pop();

        var ns = util.ns(this, nsArray.join('.'));
        ns[apiName] = function (){
            try{
                api_fn.apply(null, _resolveArgs(argsDescriptions, arguments));
            } catch(e){
                log('error occurred in api_fn call', e);
            }
        };
    };
    
    bridge.createSDK = function (options){
        return new SDK(options);
    };
    
    global.bridge = bridge;

})(window, JSON);
