/* globals assert:true, expect:true, i18n:true*/
var tests = Object.keys(window.__karma__.files).filter(function(file) {
    return (/^\/base\/test\/unit\/spec\/.*\.js$/).test(file);
});

requirejs.config({
    shim: {
        '/base/js/require.config.js': { exports: 'require' }
    }
});

requirejs(['/base/js/require.config.js'], function(cfg) {

    var requireConfig = $.extend(true, {}, cfg, {

        // Karma serves files from '/base'
        baseUrl: '/base/js',

        paths: {
            chai: '../libs/chai/chai',
            'chai-datetime': '../libs/chai-datetime/chai-datetime',
            'mocha-flight': '../test/unit/utils/mocha-flight',

            // MOCKS
            'util/service/dataPromise': '../test/unit/mocks/dataPromise',
            'util/service/messagesPromise': '../test/unit/mocks/messagePromise',
            'util/service/ontologyPromise': '../test/unit/mocks/ontologyPromise',
            //'util/service/ontology.json': '../test/unit/mocks/ontology.json',
            'util/messages': '../test/unit/mocks/messages',
            'data/web-worker/util/ajax': '../test/unit/mocks/ajax',
            testutils: '../test/unit/utils'
        },

        shim: {},

        deps: [
            'chai',
            '../libs/underscore/underscore'
        ],

        callback: function(chai) {
            if (typeof Function.prototype.bind !== 'function') {
                /*eslint no-extend-native:0 */
                Function.prototype.bind = function() {
                    var args = _.toArray(arguments),
                        bindArgs = [this, args.shift()].concat(args);
                    return _.bind.apply(_, bindArgs);
                }
            }

            window.visalloData = {
                currentWorkspaceId: 'w1'
            };

            _.templateSettings.escape = /\{([\s\S]+?)\}/g;
            _.templateSettings.evaluate = /<%([\s\S]+?)%>/g;
            _.templateSettings.interpolate = /\{-([\s\S]+?)\}/g;

            require([
                'chai-datetime',
                'util/handlebars/before_auth_helpers',
                'util/handlebars/after_auth_helpers',
                'util/jquery.flight',
                'mocha-flight'
            ], function(chaiDateTime) {

                chai.should();
                chai.use(chaiDateTime);

                // Globals for assertions
                assert = chai.assert;
                expect = chai.expect;

                i18n = function(key) {
                    return key;
                };

                // Use the twitter flight interface to mocha
                mocha.ui('mocha-flight');
                mocha.options.globals.push('ejs', 'cytoscape', 'DEBUG');

                // Run tests after loading
                if (tests.length) {
                    require(tests, function() {
                        window.__karma__.start();
                    });
                } else window.__karma__.start();
            });

        }

    });
    requireConfig.deps = requireConfig.deps.concat(cfg.deps);
    delete requireConfig.urlArgs;

    window.require = requirejs;
    requirejs.config(requireConfig);
});
