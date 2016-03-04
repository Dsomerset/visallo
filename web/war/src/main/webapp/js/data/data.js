
define([
    'flight/lib/component',
    './withPublicApi',
    './withBrokenWorkerConsole',
    './withDataRequestHandler',
    './withCurrentUser',
    './withCachedConceptIcons',
    './withDocumentCopyText',
    './withWebsocket',
    './withWebsocketLegacy',
    './withKeyboardRegistration',
    './withObjectSelection',
    './withObjectsUpdated',
    './withClipboard',
    './withWorkspaces',
    './withWorkspaceFiltering',
    './withWorkspaceVertexDrop'
], function(
    defineComponent
    // mixins auto added in order (change index of slice)
) {
    'use strict';

    var DataWorker = require('worker!./web-worker/data-worker'),
        mixins = Array.prototype.slice.call(arguments, 1);

    return defineComponent.apply(null, [Data].concat(mixins));

    function Data() {

        this.after('initialize', function() {
            var self = this;

            this.setupDataWorker();

            this.dataRequestPromise = new Promise(function(fulfill, reject) {
                    if (self.visalloData.readyForDataRequests) {
                        fulfill();
                    } else {
                        var timer = _.delay(reject, 10000);
                        self.on('readyForDataRequests', function readyForDataRequests() {
                            if (timer) {
                                clearTimeout(timer);
                            }
                            fulfill();
                            self.off('readyForDataRequests', readyForDataRequests);
                        });
                    }
                }).then(function() {
                    return System.import('../util/withDataRequest');
                }).then(function(withDataRequest) {
                    return withDataRequest.dataRequest;
                });

            this.messagesPromise = this.dataRequestPromise.then(function() {
                return System.import('util/service/messagesPromise');
                }).then(this.setupMessages.bind(this));

            if (typeof DEBUG !== 'undefined') {
                DEBUG.logCacheStats = function() {
                    self.worker.postMessage({
                        type: 'postCacheStats'
                    });
                }
            }
        });

        this.setupMessages = function(i18n) {
            window.i18n = i18n;
            return i18n;
        };

        this.setupDataWorker = function() {
            this.worker = new DataWorker();
            this.worker.postMessage(JSON.stringify({
                webWorkerResources: visalloPluginResources.webWorker
            }));
            this.worker.onmessage = this.onDataWorkerMessage.bind(this);
            this.worker.onerror = this.onDataWorkerError.bind(this);
        };

        this.onDataWorkerError = function(event) {
            console.error('data-worker error', event);
        };

        this.onDataWorkerMessage = function(event) {
            var data = event.data;

            if (_.isArray(data)) {
                data.forEach(this.processWorkerMessage.bind(this));
            } else {
                this.processWorkerMessage(data);
            }
        };

        this.processWorkerMessage = function(message) {
            if (message.type && (message.type in this)) {
                this[message.type](message);
            } else {
                console.warn('Unhandled message from worker', message);
            }
        }
    }
});
