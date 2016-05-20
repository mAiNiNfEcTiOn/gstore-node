(function() {
    'use strict';

    /*!
    * Module dependencies.
    */
    var EventEmitter = require('events').EventEmitter;
    var Entity       = require('./entity');
    var serialize    = require('./services/serialize');

    function Model(data, id) {
        Entity.call(this, data, id);
    }

    /*!
     * Inherits from Entity.
     *
     * All Model.prototype features are available on
     * top level entites.
     */
    Model.prototype = Object.create(Entity.prototype);
    Model.prototype.constructor = Model;

    /*!
    * Compiler utility.
    *
    * @param {String} name model name
    * @param {Schema} schema
    * @param {gcloud datastore} ds
    * @param {Datastools} base datastools instance
    */
    Model.compile = function compile(name, schema, ds, base) {
        // generate new class
        function ModelInstance(data, id) {
            if (!(this instanceof ModelInstance)) {
                return new ModelInstance(data, id);
            }
            Model.call(this, data, id);
        }

        ModelInstance.prototype = Object.create(Model.prototype);
        ModelInstance.prototype.constructor = ModelInstance;

        ModelInstance.hooks      = schema.s.hooks.clone(); // Not Used for now
        ModelInstance.base       = base;
        ModelInstance.entityName = ModelInstance.prototype.entityName = name;
        ModelInstance.model      = Model.prototype.model;
        ModelInstance.ds         = ModelInstance.prototype.ds = ds;

        ModelInstance.prototype.$setSchema(schema);

        // apply methods
        applyMethods(ModelInstance, schema);

        ModelInstance.schema = ModelInstance.prototype.schema;
        ModelInstance.init   = Model.init;

        return ModelInstance;
    };

    /*!
    * Register methods for this model
    *
    * @param {Model} model
    * @param {Schema} schema
    */
    var applyMethods = function(model, schema) {
        function apply(method, schema) {
            Object.defineProperty(model.prototype, method, {
                get: function() {
                    var h = {};
                    for (var k in schema.methods[method]) {
                        if (schema.methods[method].hasOwnProperty(k)) {
                            h[k] = schema.methods[method][k].bind(this);
                        }
                    }
                    return h;
                },
                configurable: true
            });
        }

        for (var method in schema.methods) {
            if (schema.methods.hasOwnProperty(method)) {
                if (typeof schema.methods[method] === 'function') {
                    model.prototype[method] = schema.methods[method];
                } else {
                    apply(method, schema);
                }
            }
        }
    };

    /*!
     * Give the constructor the ability to emit events.
     */
    for (var i in EventEmitter.prototype) {
        if (EventEmitter.prototype.hasOwnProperty(i)) {
            Model[i] = EventEmitter.prototype[i];
        }
    }

    Model.init = function() {
        this.schema.emit('init', this);
    };

    Entity.prototype.save = function(transaction, cb) {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        cb = args.pop();
        transaction = args.length > 0 ? args[0] : undefined;
        
        var _this = this;

        var entity = {
            key : this.entityKey,
            data: serialize.ds.toDatastore(this.entityData, [])
        };

        if (typeof transaction === 'undefined') {
            this.ds.save(entity, function (err) {
                if (err) {
                    return cb(err);
                }
                _this.emit('save', this);
                cb(null, entity);
            });
        } else {
             cb(null, entity);
        }
    };

    Entity.prototype.delete = function(cb) {
        console.log('deleting model');
        this.emit('delete', this);
        cb(null, {message:'todo'});
    };

    Entity.prototype.update = function(cb) {
        console.log('updating model');
        this.emit('update', this);
        cb(null, {message:'todo'});
    };

    /**
     * Returns another Model instance.
     *
     * ####Example:
     *
     *     var doc = new Tank;
     *     doc.model('User').findById(id, callback);
     *
     * @param {String} name model name
     * @api public
     */

    Model.prototype.model = function model(name) {
        return this.ds.model(name);
    };

    /*!
    * Module exports.
    */
    module.exports = exports = Model;
})();