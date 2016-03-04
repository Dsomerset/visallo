/**
 * Add some promise helpers, done, finally, and progress
 *
 * Example:
 *
 *  var p = new Promise(function(f, r) {
 *      var duration = 4,
 *          startTime = Date.now(),
 *          t = setInterval(function() {
 *              var now = Date.now(),
 *                  dt = (now - startTime) / (duration * 1000);

 *              if (dt < 1.0) {
 *                  f.updateProgress(dt);
 *              } else {
 *                  f(true)
 *              }
 *          }, 16);
 *  }).progress(function(percent) {
 *      console.log('Updated', percent);
 *  }).then(function() {
 *      console.log('finished');
 *  }).finally(function() {
 *      console.log('finally')
 *  })
 */
/*globals Promise:true self:true*/
var self = this;
define([
    'bluebird',
    'underscore'
], function(P, _) {
    'use strict';

    var Promise = P || self.Promise;

    if (P) {
        Promise.config({
            cancellation: true,
            warnings: {
                wForgottenReturn: false
            }
        });
    }

    addProgress();
    addTimeout();

    self.Promise = Promise;
    return Promise;

    function addProgress() {
        if (typeof Promise.prototype.progress !== 'function') {
            Promise.prototype.progress = function(progress) {
                this._progressCallbacks = this._progressCallbacks || [];
                this._progressCallbacks.push(progress);
                return this;
            };
        } else console.warn('Native implementation of progress');

        // Wrap Promise constructor to add progress support
        var OldPromise = Promise;
        Promise = function(callback) {

            var reject,
                that = new OldPromise(function() {
                // Update progress is a function on fulfill function
                var f = arguments[0];
                f.updateProgress = updateProgress;

                callback.apply(null, arguments);
            });

            that
                .then(function() {
                    updateProgress(1);
                })
                .catch(function() {});

            return that;

            function updateProgress(percent) {
                if (that._progressCallbacks) {
                    that._progressCallbacks.forEach(function(c) {
                        c(percent || 0);
                    })
                }
            }
        }

        'all race reject resolve'.split(' ').forEach(function(key) {
            Promise[key] = OldPromise[key];
        })
        Promise.prototype = OldPromise.prototype;
    }

    function addTimeout() {
        if (typeof Promise.timeout !== 'function') {
            Promise.timeout = function(millis) {
                return new Promise(function(fulfill) {
                    setTimeout(fulfill, millis);
                });
            }
        } else console.warn('Native implementation of timeout');
    }

});
