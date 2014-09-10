(function (global){
    var _test_api = function (data, callback){
        setTimeout(function (){
            eval(callback)(data);
        });
    };

    var testSdk = bridge.createSDK({
        api: [{name: 'test', fn: _test_api, args: [{index: 0, type: 'json'}, {index: 1, type: 'callback'}]}]
    });

    global['testSdk'] = testSdk;
})(window);

QUnit.module('api call and callback');

QUnit.test('api should created', function (assert){
    assert.equal(typeof testSdk.test, 'function', 'api sdk.test should be function');
});

QUnit.test('api and namespace should created', function (assert){
    var sdk = bridge.createSDK({
        api: [{name: 'ns.test', fn: function(){}}]
    });
    assert.equal(typeof sdk.ns.test, 'function', 'api sdk.ns.test should be function');
});

QUnit.asyncTest('call and callback should be executed correctly', function (assert){
    var orig = {test: true};
    testSdk.test(orig, function (data){
        assert.notEqual(data, orig, 'they should not be same, as JSON.parse and JSON.stringify');
        assert.equal(data.test, true, 'data.test should be true, as data is a echo of orig');
        QUnit.start();
    });
});

QUnit.asyncTest('multiple call and callback', function (assert){
    var done1 = false, done2 = false, done3 = false;
    var done = function(){
        if( done1 && done2 && done3 ){
            QUnit.start();
        }
    };
    testSdk.test(done1, function (data){
        done1 = true;
        assert.equal(done1, true);
        done();
    });

    testSdk.test(done2, function (data){
        done2 = true;
        assert.equal(done2, true);
        done();
    });

    testSdk.test(done3, function (data){
        done3 = true;
        assert.equal(done3, true);
        done();
    });
});

QUnit.module('event test', {
    setup: function (){
        testSdk.off('test');
    },
    
    teardown: function (){
        testSdk.off('test');
    }
});

QUnit.asyncTest('event listener register', function (assert){
    assert.equal(typeof testSdk.on, 'function', 'api sdk.on should be function');

    testSdk.on('test', function (data){
        assert.equal(JSON.parse(data).test, true, 'params should be parsed from JSON');
        QUnit.start();
    });

    __event_trigger('test', '{"test": true}');
});

QUnit.asyncTest('event listener arguments', function (assert){
    testSdk.on('test', function (arg1, arg2, arg3){
        assert.equal(typeof arg1, 'string', 'arg1 should be same with sent in arg');
        assert.equal(typeof arg2, 'number', 'arg1 should be same with sent in arg');
        assert.equal(JSON.parse(arg3).test, true, 'arg3 should be json string');
        QUnit.start();
    });

    __event_trigger('test', 'hello world', 0, '{"test": true}');
});

QUnit.asyncTest('multiple event listeners', function (assert){
    var done1 = false, done2 = false, done3 = false;
    var done = function(){
        if( done1 && done2 && done3 ){
            QUnit.start();
        }
    };
    testSdk.on('test', function (data){
        done1 = true;
        assert.equal(done1, true);
        done();
    });

    testSdk.on('test', function (data){
        done2 = true;
        assert.equal(done2, true);
        done();
    });

    testSdk.on('test', function (data){
        done3 = true;
        assert.equal(done3, true);
        done();
    });

    __event_trigger('test');
});

QUnit.asyncTest('event listener un-register', function (assert){
    var event_off = true;
    var testHandle = function (data){
        event_off = false;
    };

    assert.equal(typeof testSdk.off, 'function', 'api sdk.off should be function');

    testSdk.on('test', testHandle);
    testSdk.off('test', testHandle);

    __event_trigger('test', {"test": true});

    window.setTimeout(function (){
        assert.equal(event_off, true, 'test event handle should not execute');
        QUnit.start();
    }, 1000);
});
