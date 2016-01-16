
/*eslint no-undef:0,strict:0,quote-props:0*/
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
     } else if (typeof module === 'object' && module.exports) {
         module.exports = factory();
     } else {
         root.require = factory();
     }
}(this, function() {
    return {
        baseUrl: 'jsc',
        waitSeconds: 0,
        map: {
            '*': {
                'lodash': 'underscore',
                'jquery-ui': 'jquery-ui-bundle',
                'jquery-ui/droppable': 'jquery-ui-bundle',
                'jquery-ui/core': 'jquery-ui-bundle',
                'jquery-ui/widget': 'jquery-ui-bundle',
                'jquery-ui/mouse': 'jquery-ui-bundle',
                'jquery-ui/resizable': 'jquery-ui-bundle',
                'jquery-ui/draggable': 'jquery-ui-bundle'
            }
        },
        paths: {
            'arbor': '../libs/cytoscape/lib/arbor',
            'async': '../libs/requirejs-plugins/src/async',
            'atmosphere': '../libs/atmosphere.js/lib/atmosphere',
            'beautify': '../libs/js-beautify/js/lib/beautify',
            'bootstrap': '../libs/bootstrap/docs/assets/js/bootstrap.min',
            'bootstrap-datepicker': '../libs/bootstrap-datepicker/js/bootstrap-datepicker',
            'bootstrap-timepicker': '../libs/bootstrap-timepicker/js/bootstrap-timepicker',
            'bluebird': '../libs/bluebird/js/browser/bluebird.min',
            'chrono': '../libs/chrono-node/chrono.min',
            'colorjs': '../libs/color-js/color',
            'cytoscape': '../libs/cytoscape/dist/cytoscape.min',
            'd3': '../libs/d3/d3.min',
            'd3-tip': '../libs/d3-tip/index',
            'd3-plugins': '../libs/d3-plugins-dist/dist/mbostock',
            'duration-js': '../libs/duration-js/duration',
            'easing': '../libs/jquery.easing/jquery.easing.1.3',
            'ejs': '../libs/ejs/ejs',
            'flight': '../libs/flightjs/build/flight',
            'flight/lib': 'util/flight/compat',
            'goog': '../libs/requirejs-plugins/src/goog',
            'gremlins': '../libs/gremlins.js/gremlins.min',
            'gridstack': '../libs/gridstack/dist/gridstack.min',
            'hbs': '../libs/require-handlebars-plugin/hbs',
            'handlebars': '../libs/require-handlebars-plugin/hbs/handlebars',
            'jstz': '../libs/jstimezonedetect/dist/jstz.min',
            'jquery': '../libs/jquery/dist/jquery.min',
            'jquery-ui-bundle': '../libs/jquery-ui-bundle/jquery-ui.min',
            'jquery-scrollstop': '../libs/jquery-scrollstop/jquery.scrollstop',
            'jscache': '../libs/jscache-lru/cache',
            'less': '../libs/requirejs-less/less',
            'lessc': '../libs/requirejs-less/lessc',
            'moment': '../libs/moment/min/moment-with-locales.min',
            'moment-timezone': '../libs/moment-timezone/builds/moment-timezone-with-data.min',
            'normalize': '../libs/requirejs-less/normalize',
            'openlayers': '../libs/openlayers2/build/OpenLayers',
            'pathfinding': '../libs/pathfinding/lib/pathfinding-browser.min',
            'propertyParser': '../libs/requirejs-plugins/src/propertyParser',
            'rangy-core': '../libs/rangy/lib/rangy-core',
            'rangy-text': '../libs/rangy/lib/rangy-textrange',
            'rangy-highlighter': '../libs/rangy/lib/rangy-highlighter',
            'rangy-cssclassapplier': '../libs/rangy/lib/rangy-classapplier',
            'rangy-serializer': '../libs/rangy/lib/rangy-serializer',
            'sf': '../libs/sf/sf',
            'text': '../libs/text/text',
            'tpl': '../libs/requirejs-ejs-plugin/rejs',
            'underscore': '../libs/underscore/underscore-min',
            'underscore.inflection': '../libs/underscore.inflection/lib/underscore.inflection',
            'videojs': '../libs/video.js/dist/video'
        },
        shim: {
            'arbor': { deps: ['jquery'] },
            'atmosphere': { init: function() { return $.atmosphere; }, deps: ['jquery'] },
            'bootstrap': { exports: 'window', deps: ['jquery'] },
            'bootstrap-datepicker': { exports: 'window', deps: ['bootstrap'] },
            'bootstrap-timepicker': { exports: 'window', deps: ['bootstrap'] },
            'bluebird': { exports: 'Promise' },
            'chrono': { exports: 'chrono' },
            'colorjs': { init: function() { return this.net.brehaut.Color; } },
            'cytoscape': { exports: 'cytoscape', deps: ['arbor', 'easing'] },
            'd3': { exports: 'd3' },
            'd3-plugins/tile/amd/index': { exports: 'd3', deps: ['d3'] },
            'duration-js': { exports: 'Duration' },
            'easing': { init: function() { return $.easing; }, deps: ['jquery'] },
            'ejs': { exports: 'ejs' },
            'jquery': { exports: 'jQuery' },
            'jstz': { exports: 'jstz' },
            'openlayers': { exports: 'OpenLayers' },
            'pathfinding': { exports: 'PF' },
            'rangy-text': { deps: ['rangy-core']},
            'rangy-highlighter': { deps: ['rangy-core', 'rangy-cssclassapplier', 'rangy-serializer']},
            'rangy-cssclassapplier': { deps: ['rangy-core'] },
            'rangy-serializer': { deps: ['rangy-core'] },
            'jquery-scrollstop': { exports: 'jQuery', deps: ['jquery'] },
            'underscore': { exports: '_' },
            'videojs': { exports: 'videojs' }
        },
        amdWrap: []
    };
}));
