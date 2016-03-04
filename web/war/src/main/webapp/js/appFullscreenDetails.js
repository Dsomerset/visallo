
define([
    'flight/lib/component',
    'flight/lib/registry',
    './appFullscreenDetails.ejs',
    './appFullscreenDetailsError.ejs',
    'detail/item/item',
    'util/vertex/formatters',
    'util/withDataRequest',
    'util/jquery.removePrefixedClasses'
], function(defineComponent, registry, template, errorTemplate, Detail, F, withDataRequest) {
    'use strict';

    return defineComponent(FullscreenDetails, withDataRequest);

    function filterEntity(v) {
        return !filterArtifacts(v);
    }

    function filterArtifacts(v) {
        return F.vertex.isArtifact(v);
    }

    function FullscreenDetails() {

        this.defaultAttrs({
            detailSelector: '.detail-pane .content',
            noResultsSelector: '.no-results',
            changeWorkspaceSelector: '.no-workspace-access li a'
        });

        this.after('initialize', function() {
            var self = this;

            this.$node.html(template({}));
            this.updateTitle();

            this.on('selectObjects', function(e, d) {
                e.stopPropagation();
                e.preventDefault();

                var vertexIds = d.vertexIds || (d.objects ? _.pluck(d.objects, 'id') : null);
                if (vertexIds) {
                    vertexIds = _.isArray(vertexIds) ? vertexIds : [vertexIds];
                    self.updateVertices({
                        add: vertexIds
                    })
                }
            });
            this._windowIsHidden = false;
            this.on(document, 'window-visibility-change', this.onVisibilityChange);
            this.on(document, 'vertexUrlChanged', this.onVertexUrlChange);
            this.on('click', {
                changeWorkspaceSelector: this.onChangeWorkspace
            });
            this.on('click', this.clearFlashing.bind(this));
            $(window).focus(this.clearFlashing.bind(this));

            this.objects = [];
            this.fullscreenIdentifier = Math.floor((1 + Math.random()) * 0xFFFFFF).toString(16).substring(1);
            this.$node.addClass('fullscreen-details');

            this.switchWorkspace(this.attr.workspaceId);
        });

        this.clearFlashing = function() {
            clearTimeout(this.timer);
            this._windowIsHidden = false;
        };

        this.updateLocationHash = function() {
            location.hash = F.vertexUrl.fragmentUrl(this.objects, this.attr.workspaceId);
        };

        this.updateLayout = function() {
            var entities = _.filter(this.objects, filterEntity).length,
                artifacts = _.filter(this.objects, filterArtifacts).length,
                verts = entities + artifacts;

            this.$node
                .removePrefixedClasses('vertices- artifacts- entities- has- entity-cols- onlyone')
                .toggleClass('onlyone', verts === 1)
                .addClass([
                    verts <= 4 ? 'vertices-' + verts : 'vertices-many',
                    'entities-' + entities,
                    'entity-cols-' + _.find([4, 3, 2, 1], function(i) {
                        return entities % i === 0;
                    }),
                    entities ? 'has-entities' : '',
                    'artifacts-' + artifacts,
                    artifacts ? 'has-artifacts' : ''
                ].join(' '));
        };

        this.updateTitle = function() {
            document.title = this.titleForVertices();
        };

        this.handleNoObjects = function() {
            var requiredFallback = this.attr.workspaceId !== visalloData.currentWorkspaceId;

            document.title = requiredFallback ?
                i18n('fullscreen.unauthorized') :
                i18n('fullscreen.no_vertices');

            this.select('noResultsSelector')
                .html(errorTemplate({
                    objects: this.attr.vertexIds.concat(this.attr.edgeIds),
                    somePublished: false,
                    requiredFallback: requiredFallback,
                    noWorkspaceGiven: !this.attr.workspaceId
                }))
                .addClass('visible');
        };

        this.handleVerticesFailed = function() {
            this.handleNoObjects();
        };

        this.handleObjectsLoaded = function(objects, data) {
            var self = this,
                fallbackToPublic = this.attr.workspaceId !== visalloData.currentWorkspaceId;

            Detail.teardownAll();
            this.$node.find('.detail-pane').remove();

            if (objects.length === 0) {
                return this.handleNoObjects();
            }

            this.objects = _.chain(objects)
                .sortBy(function(v) {
                    var descriptors = [],
                        concept = F.vertex.concept(v);

                    // Image/Video/Audio before documents
                    descriptors.push(
                        F.vertex.displayType(v) === 'document' ? '1' : '0'
                    );

                    // Sort by title
                    descriptors.push(F.vertex.title(v).toLowerCase());
                    return descriptors.join('');
                })
                .sortBy(function(v) {
                    return v.type === 'vertex' ? 0 : 1;
                })
                .value();

            // Find vertices not found and insert at beginning
            var objectIds = this.attr.vertexIds.concat(this.attr.edgeIds),
                notFoundIds = _.difference(objectIds, _.pluck(this.objects, 'id')),
                notFound = _.map(notFoundIds, function(nId) {
                    return {
                        id: nId,
                        notFound: true,
                        properties: {
                            title: '?'
                        }
                    };
                });

            this.objects.splice.apply(this.objects, [0, 0].concat(notFound));
            if (notFound.length || fallbackToPublic) {
                this.select('noResultsSelector')
                    .html(errorTemplate({
                        objects: notFoundIds,
                        requiredFallback: fallbackToPublic,
                        somePublished: true,
                        workspaceTitle: this.workspaceTitle,
                        noWorkspaceGiven: !this.attr.workspaceId
                    }))
                    .addClass('visible someVerticesFound');
                this.loadWorkspaces();
            }

            this.objects.forEach(function(v) {
                if (v.notFound) return;

                var node = filterEntity(v) ?
                        this.$node.find('.entities-container') :
                        this.$node.find('.artifacts-container'),
                    type = filterArtifacts(v) ? 'artifact' : 'entity',
                    subType = F.vertex.displayType(v),
                    $newPane = $('<div class="detail-pane visible highlight-none">')
                        .addClass('type-' + type +
                                  (subType ? (' subType-' + subType) : '') +
                                  ' ' + F.className.to(v.id))
                        .append('<div class="content">')
                        .appendTo(node)
                        .find('.content')
                        .append('<div class="type-content">')
                        .find('.type-content');

                this.on('finishedLoadingTypeContent', function handler() {
                    this.off('finishedLoadingTypeContent', handler);
                    this.$node.find('.org-visallo-layout-body').css('flex', 'none');
                    this.$node.find('.org-visallo-layout-root').css('overflow', 'visible');
                });

                var constraints = this.objects.length === 1 ? [] : ['width'];
                Detail.attachTo($newPane, { model: v, constraints: constraints });
            }.bind(this));

            if (data && data.preventRecursiveUrlChange !== true) {
                this.updateLocationHash();
            }
            this.updateLayout();
            this.updateTitle();
        };

        this.loadWorkspaces = function() {
            var self = this;

            this.dataRequest('workspace', 'all')
                .done(function(workspaces) {
                    if (workspaces.length > 1) {
                        var workspaceTpl = _.template(
                            '<li data-id="{workspaceId}" ' +
                            '<% if (disabled) { %>class="disabled"<% } %>>' +
                            '<a>{title}</a>' +
                            '</li>'
                        );
                        self.$node.find('.no-workspace-access')
                            .find('.caret').show()
                            .end()
                            .find('.dropdown-menu')
                            .html(_.chain(workspaces)
                                    .sortBy(function(w) {
                                        return w.title.toLowerCase();
                                    })
                                    .map(function(workspace) {
                                        workspace.disabled = workspace.workspaceId === self.actualWorkspaceId;
                                        return workspaceTpl(workspace);
                                    })
                                    .value()
                                    .join(''))
                            .prev('.dropdown-toggle').removeClass('disabled')
                    }
                });
        };

        this.onChangeWorkspace = function(event) {
            var workspaceId = $(event.target).closest('li').data('id').toString();
            this.switchWorkspace(workspaceId);
        };

        this.switchWorkspace = function(workspaceId) {
            var self = this;

            this.on(document, 'workspaceLoaded', function loaded(event, workspace) {
                self.workspaceTitle = workspace.title;
                self.actualWorkspaceId = workspace.workspaceId;
                self.off(document, 'workspaceLoaded', loaded);

                Promise.all([
                        self.attr.vertexIds.length ?
                            self.dataRequest('vertex', 'store', {
                                vertexIds: self.attr.vertexIds
                            }) : Promise.resolve([]),
                        self.attr.edgeIds.length ?
                            self.dataRequest('edge', 'store', {
                                edgeIds: self.attr.edgeIds
                            }) : Promise.resolve([])
                    ])
                    .then(function(results) {
                        var vertices = results.shift(),
                            edges = results.shift();
                        self.handleObjectsLoaded(_.compact(vertices.concat(edges)));
                    })
                    .catch(self.handleVerticesFailed.bind(self))
            });
            if (workspaceId) {
                this.trigger(document, 'switchWorkspace', { workspaceId: workspaceId });
            } else {
                this.dataRequest('workspace', 'getOrCreate')
                    .done(function(workspace) {
                        self.attr.workspaceId = workspace.workspaceId;
                        self.trigger(document, 'switchWorkspace', { workspaceId: workspace.workspaceId });
                    })
            }
        };

        this.onVertexUrlChange = function(event, data) {
            var self = this,
                deferred = $.Deferred();

            if (data.workspaceId) {
                this.attr.workspaceId = data.workspaceId;
                if (visalloData.currentWorkspaceId !== this.attr.workspaceId) {
                    this.on(document, 'workspaceLoaded', function loaded() {
                        self.off(document, 'workspaceLoaded', loaded);
                        deferred.resolve();
                    });
                    this.trigger(document, 'switchWorkspace', { workspaceId: this.attr.workspaceId });
                } else deferred.resolve();
            } else deferred.resolve();

            var toRemove = _.difference(this.attr.graphVertexIds, data.graphVertexIds),
                toAdd = _.difference(data.graphVertexIds, this.attr.graphVertexIds);

            if (data.graphVertexIds) {
                this.attr.graphVertexIds = data.graphVertexIds;
            }

            deferred.done(function() {
                self.updateVertices({
                    remove: toRemove,
                    add: toAdd,
                    preventRecursiveUrlChange: true
                });
            })
        };

        this.onVisibilityChange = function(event, data) {
            this._windowIsHidden = data.hidden;
            if (data.visible) {
                clearTimeout(this.timer);
                this.updateTitle();
            }
        };

        this.updateVertices = function(data) {
            var self = this,
                willRemove = !_.isEmpty(data.remove),
                willAdd = !_.isEmpty(data.add);

            if (!willRemove && !willAdd) {
                return;
            }

            if (willAdd) {
                return this.dataRequest('vertex', 'store', {
                    vertexIds: _.uniq(data.add.concat(_.pluck(this.objects, 'id')))
                })
                    .then(function(vertices) {
                        self.handleVerticesLoaded(vertices, data);
                    });
            }

            if (willRemove) {
                data.remove.forEach(function(vertexId) {
                    var $pane = self.$node.find('.detail-pane.' + F.className.to(vertexId));
                    if ($pane.length) {
                        $pane
                            .find('.content').teardownAllComponents()
                            .end()
                            .remove();
                    }
                });

                this.objects = _.reject(this.objects, function(v) {
                    return _.contains(data.remove, v.id);
                });
            }

            if (data.preventRecursiveUrlChange !== true) {
                self.updateLocationHash();
            }
            self.updateLayout();
            self.updateTitle();
        };

        this.addVertexIds = function(vertexIds, targetIdentifier) {
            var self = this;

            if (targetIdentifier !== this.fullscreenIdentifier) {
                return;
            }

            var existingVertexIds = _.pluck(this.objects, 'id'),
                newVertices = _.reject(vertexIds, function(v) {
                    return existingVertexIds.indexOf(v) >= 0;
                });

            if (newVertices.length === 0) {
                return;
            }

            this.dataRequest('vertex', 'store', { vertexIds: existingVertexIds.concat(newVertices) })
                .done(function(vertices) {
                    self.handleVerticesLoaded(vertices);
                    self.flashTitle(newVertices);
                })
        };

        this.flashTitle = function(newVertexIds, newVertices) {
            var self = this,
                i = 0;

            clearTimeout(this.timer);

            if (!newVertices || newVertices.length === 0) return;

            var newVerticesById = _.indexBy(newVertices, 'id');

            if (this._windowIsHidden) {
                this.timer = setTimeout(function f() {
                    if (self._windowIsHidden && i++ % 2 === 0) {
                        if (newVertexIds.length === 1) {
                            document.title = i18n(
                                'fullscreen.title.added.one',
                                F.vertex.title(newVerticesById[newVertexIds[0]])
                            );
                        } else {
                            document.title = i18n('fullscreen.title.added.some', newVertexIds.length);
                        }
                    } else {
                        self.updateTitle();
                    }

                    if (self._windowIsHidden) {
                        self.timer = setTimeout(f, 500);
                    }
                }, 500);
            }
        };

        this.titleForVertices = function() {
            if (!this.objects || this.objects.length === 0) {
                return i18n('fullscreen.loading');
            }

            var sorted = _.sortBy(this.objects, function(v) {
                return v.notFound ? 1 : -1;
            });

            if (sorted.length === 1) {
                return F.vertex.title(sorted[0]);
            } else {
                var first = '"' + F.vertex.title(sorted[0]) + '"',
                    l = sorted.length - 1;

                if (l > 1) {
                    return i18n('fullscreen.title.some', first, l)
                }

                return i18n('fullscreen.title.one', first)
            }
        };
    }
});
