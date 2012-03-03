require('ember-data/adapters/tastypie-adapter');

var get = Ember.get, set = Ember.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash;
var Person, person, people;
var Role, role, roles;
var Group, group;

module("the Django Tastypie adapter", {
  setup: function() {
    ajaxUrl = undefined;
    ajaxType = undefined;
    ajaxHash = undefined;

    adapter = DS.DjangoTastypieAdapter.create({
      ajax: function(url, type, hash) {
        var success = hash.success, self = this;

        ajaxUrl = this.getTastypieUrl(url);
        ajaxType = type;
        ajaxHash = hash;

        if (success) {
          hash.success = function(json) {
            success.call(self, json);
          };
        }
      },

    });

    store = DS.Store.create({
      adapter: adapter
    });

    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    Person.toString = function() {
      return "App.Person";
    };

    Group = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany(Person)
    });

    Group.toString = function() {
      return "App.Group";
    };

    Role = DS.Model.extend({
      name: DS.attr('string'),
      primaryKey: '_id'
    });

    Role.toString = function() {
      return "App.Role";
    };
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();

    if (person) { person.destroy(); }
  }
});

var expectUrl = function(url, desc) {
  equal(ajaxUrl, url, "the URL is " + desc);
};

var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};

var expectData = function(hash) {
  deepEqual(hash, ajaxHash.data, "the hash was passed along");
};

var expectState = function(state, value, p) {
  p = p || person;

  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(get(p, flag), value, "the person is " + (value === false ? "not " : "") + state);
};

var expectStates = function(state, value) {
  people.forEach(function(person) {
    expectState(state, value, person);
  });
};

test("creating a person makes a POST to /person, with the data hash", function() {
  set(adapter, 'bulkCommit', false);

  person = store.createRecord(Person, { name: "Tom Dale" });

  expectState('new');
  store.commit();
  expectState('saving');

  expectUrl("api/v1/person/", "the collection is the same as the model name");
  expectType("POST");
  expectData(JSON.stringify({ name: "Tom Dale" }));

  ajaxHash.success({ id: 1, name: "Tom Dale" });
  expectState('saving', false);

  equal(person, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
});

test("updating a person makes a PUT to /people/:id with the data hash", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("api/v1/person/1/", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success({ id: 1, name: "Brohuda Brokatz" });
  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the hash should be updated");
});

test("updates are not required to return data", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("api/v1/person/1/", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success();
  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the data is preserved");
});

test("updating a record with custom primaryKey", function() {
  set(adapter, 'bulkCommit', false);
  store.load(Role, { _id: 1, name: "Developer" });

  role = store.find(Role, 1);

  set(role, 'name', "Manager");
  store.commit();

  expectUrl("api/v1/role/1/", "the plural of the model name with its ID");
  ajaxHash.success({ role: { _id: 1, name: "Manager" } });
});


test("deleting a person makes a DELETE to /people/:id", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Person, { id: 1, name: "Tom Dale" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  person.deleteRecord();

  expectState('dirty');
  expectState('deleted');
  store.commit();
  expectState('saving');

  expectUrl("api/v1/person/1/", "the plural of the model name with its ID");
  expectType("DELETE");

  ajaxHash.success();
  expectState('deleted');
});

test("deleting a record with custom primaryKey", function() {
  set(adapter, 'bulkCommit', false);

  store.load(Role, { _id: 1, name: "Developer" });

  role = store.find(Role, 1);

  role.deleteRecord();

  store.commit();

  expectUrl("api/v1/role/1/", "the plural of the model name with its ID");
  ajaxHash.success();
});

test("finding all people makes a GET to api/v1/person/", function() {
  people = store.find(Person);

  expectUrl("api/v1/person/", "the plural of the model name");
  
  expectType("GET");

  ajaxHash.success({"objects": [{ id: 1, name: "Yehuda Katz" }]});

  person = people.objectAt(0);

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding a person by ID makes a GET to api/v1/person/:id", function() {
  person = store.find(Person, 1);

  expectState('loaded', false);
  expectUrl("api/v1/person/1/", "the plural of the model name with the ID requested");
  expectType("GET");

  ajaxHash.success({ id: 1, name: "Yehuda Katz" });

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding many people by a list of IDs", function() {
  store.load(Group, { id: 1, people: [ 1, 2, 3 ] });

  var group = store.find(Group, 1);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  var people = get(group, 'people');

  equal(get(people, 'length'), 3, "there are three people in the association already");

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), false, "the person is being loaded");
  });

  expectUrl("api/v1/person/set/1;2;3/");
  expectType("GET");

  ajaxHash.success({"objects":
    [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]}
  );

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("finding people by a query", function() {
  var people = store.find(Person, { page: 1 });

  equal(get(people, 'length'), 0, "there are no people yet, as the query has not returned");

  expectUrl("api/v1/person/", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  ajaxHash.success({
    objects: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  equal(get(people, 'length'), 3, "the people are now loaded");

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("creating several people (with bulkCommit) makes a POST to /people, with a data hash Array", function() {
  var tom = store.createRecord(Person, { name: "Tom Dale" });
  var yehuda = store.createRecord(Person, { name: "Yehuda Katz" });

  people = [ tom, yehuda ];

  expectStates('new');
  store.commit();
  expectStates('saving');

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ people: [ { name: "Tom Dale" }, { name: "Yehuda Katz" } ] });

  ajaxHash.success({ people: [ { id: 1, name: "Tom Dale" }, { id: 2, name: "Yehuda Katz" } ] });
  expectStates('saving', false);

  equal(tom, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
  equal(yehuda, store.find(Person, 2), "it is now possible to retrieve the person by the ID supplied");
});

test("deleting several people (with bulkCommit) makes a PUT to /people/bulk", function() {
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);

  var yehuda = store.find(Person, 1);
  var carl = store.find(Person, 2);

  people = [ yehuda, carl ];

  expectStates('new', false);
  expectStates('loaded');
  expectStates('dirty', false);

  yehuda.deleteRecord();
  carl.deleteRecord();

  expectStates('dirty');
  expectStates('deleted');
  store.commit();
  expectStates('saving');

  expectUrl("/people/bulk", "the collection at the plural of the model name with 'delete'");
  expectType("DELETE");

  ajaxHash.success();

  expectStates('saving', false);
  expectStates('deleted');
  expectStates('dirty', false);
});


test("if you specify a server domain then it is prepended onto all URLs", function() {
  set(adapter, 'serverDomain', 'http://localhost:8000/');
  person = store.find(Person, 1);
  expectUrl("http://localhost:8000/api/v1/person/1/", "the namespace, followed by by the plural of the model name and the id")

  store.load(Person, { id: 1 });
});

