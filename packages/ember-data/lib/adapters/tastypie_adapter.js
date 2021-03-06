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
   * Set this parameter if you are planning to do cross-site
   * requests to the destination domain. Remember trailing slash
   */

  serverDomain: "",

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
  parseData: function(type, model, raw){
    var self = this;
    var value;
    
    var jsonData = model.toJSON({ associations: true });
    
    var associations = get(type, 'associationsByName');

    associations.forEach(function(key, meta){
      value = jsonData[key];
      if (!!value){
        if (meta.kind === "belongsTo") {
          jsonData[key] = self.getItemUrl(type, key, value);
        }
      }
    });

    if (raw) {
      return jsonData;
    } else {
      return JSON.stringify(jsonData);
    }
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
   * If bulkCommit is set to true, this method creates
   * several objects in a single PATCH requuest
   */
  createRecords: function(store, type, models) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, models);
    }

    var root = this.rootForType(type);
    var self = this;

    var data = {};
    data = models.map(function(model) {
      return self.parseData(type, model, true);
    });

    data = JSON.stringify({objects: data});

    this.ajax(root, "PATCH", {
      data: data,
      success: function(json) {
        // TODO PATCH does not return anything
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

    var data = this.parseData(type, model);

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

  deleteRecords: function(store, type, models) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, models);
    }
//CREATE
//$.ajax({type: "PATCH", url: "/api/v1/customer/", success: function(data){console.log(data)}, data: JSON.stringify({"objects":[{name: "Arnold2", date_next_visit: "", type_next_visit:"", visitLogs:[]}]}), contentType: "application/json"})
//UPDATE
// $.ajax({type: "PATCH", url: "/api/v1/customer/", success: function(data){console.log(data)}, data: JSON.stringify({"objects":[{name: "Arnold6", date_next_visit: "", type_next_visit:"", visitLogs:[], resource_uri:"/api/v1/customer/3/"}]}), contentType: "application/json"})
//
//DELETE
//$.ajax({type: "PATCH", url: "/api/v1/customer/", success: function(data){console.log(data)}, data: JSON.stringify({"objects":[],"deleted_objects": ["/api/v1/customer/2/"]}), contentType: "application/json"})
    var self = this;
    var root = this.rootForType(type);

    var data = {};
    data = models.map(function(model) {
      //return get(model, 'id');
      return [root, get(model, 'id'), ""].join('/');
    });

    data = JSON.stringify({deleted_objects: data});
    console.log(data);

    this.ajax(root, "PATCH", {
      data: data,
      success: function(json) {
        if (json) { this.sideload(store, type, json); }
        store.didDeleteRecords(models);
      }
    });
  },

  find: function(store, type, id) {
    // FindMany array through subset of resources
    if (id instanceof Array) {
      id = "set/" + id.join(";");
    }

    var root = this.rootForType(type);
    var url = [root, id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {
        // Loads collection for findMany
        if (json.hasOwnProperty("objects")) {
          store.loadMany(type, json["objects"]);
        // Loads unique element with find by id
        } else {
          store.load(type, json);
        }
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

  getItemUrl: function(type, key, id){
    var url;
    ember_assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);
    url = this.rootForType(type.metaForProperty(key).type);
    return ["", this.tastypieApiUrl.slice(0,-1), url, id, ""].join('/');
  },

  getTastypieUrl: function(url){
    ember_assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);
    return this.serverDomain + this.tastypieApiUrl + url + "/";
 
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
