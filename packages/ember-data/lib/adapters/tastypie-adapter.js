require("ember-data/core");
require("ember-data/system/adapters");

/*global jQuery*/
var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

/*
 * The DjangoTastypie Adapter extends the default RESTAdapter
 * from Ember.js in order to work with a REST interface provided
 * by django-tastypie.
 *
 * Some details of implementation of that library that differ
 * from the Rails oriented RESTAdapter are:
 * - Sent data must be stringified.
 * - Sent data must include a CONTENT_TYPE='application/json' header
 * - There are no plurals for collection of objects
 * - Returned objects are not inside a json[root] object
 * - Bulk Commits are not supported by default
 *
 */

DS.DjangoTastypieAdapter = DS.RESTAdapter.extend({
  /* 
   * This is the default Tastypie url found in the documentation.
   * You may change it if necessary when creating the adapter
   */
  tastypieApiUrl: "api/v1/",

  
  /*
   * Bulk commits are not supported at this time by the adapter.
   * Changing this setting will not work
   */
  bulkCommit: false,

  /**
   * Objects with related objects generate a JSON circular parse error.
   * This function captures that problem and transforms the association
   * fields to the django-tastypie format
   */
  parseData: function(type, model){
    var subtypeRoot;
    var self = this;
    
    var data = get(model, 'data');
    $.each(data, function(index, item){
      // TODO It must be an easier way to access the type of the attributes of a model
      if (type.PrototypeMixin.mixins.objectAt(1).properties[index].hasOwnProperty('_meta')) {
        subtypeUrl = self.rootForType(type.PrototypeMixin.mixins.objectAt(1).properties[index]._meta.type);
        subtypeUrl = [subtypeUrl, item.get('id')].join('/');
        data[index] = '/' + self.getTastypieUrl(subtypeUrl);
      }
    });
    return JSON.stringify(data);
  },

  /* 
   * Create a record in the Django server. POST actions must
   * be enabled in the Resource
   */
  createRecord: function(store, type, model) {
    var root = this.rootForType(type);

    var data = this.parseData(type, model);

    this.ajax(root, "POST", {
      data: data,
      success: function(json) {
        store.didCreateRecord(model, json);
      }
    });
  },
 
  /* 
   * Edit a record in the Django server. PUT actions must
   * be enabled in the Resource
   */
  updateRecord: function(store, type, model) {
    var id = get(model, 'id');
    var root = this.rootForType(type);

    var data = JSON.stringify(get(model, 'data'));

    var url = [root, id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        store.didUpdateRecord(model, json);
      }
    });
  },

  /* 
   * Delete a record in the Django server. DELETE actions
   * must be enabled in the Resource
   */
  deleteRecord: function(store, type, model) {
    var id = get(model, 'id');
    var root = this.rootForType(type);

    var url = [root, id].join("/");

    this.ajax(url, "DELETE", {
      success: function(json) {
        store.didDeleteRecord(model);
      }
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type);
    var url = [root, id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {
        store.load(type, json);
      }
    });
  },

  findMany: function() {
    this.find.apply(this, arguments);
  },

  findAll: function(store, type) {
    var root = this.rootForType(type);

    this.ajax(root, "GET", {
      success: function(json) {
        store.loadMany(type, json["objects"]);
      }
    });
  },

  findQuery: function(store, type, query, modelArray){
    var root = this.rootForType(type);

    this.ajax(root, "GET", {
      data: query,
      success: function(json) {
        modelArray.load(json["objects"]);
      }
    });
  },

  getTastypieUrl: function(url){
    ember_assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);
    return this.tastypieApiUrl + url + "/";
 
  },

  ajax: function(url, type, hash) {
    hash.url = this.getTastypieUrl(url);
    hash.type = type;
    hash.dataType = "json";
    hash.contentType = 'application/json';
    jQuery.ajax(hash);
  },

  pluralize: function(name) {
    return name;
  }
});
