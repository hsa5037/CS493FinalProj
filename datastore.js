const {Datastore} = require('@google-cloud/datastore');

const projID = 'ahmedhucs493final';

module.exports.Datastore = Datastore;
module.exports.datastore = new Datastore({projID:projID});

module.exports.fromDatastore = function fromDatastore(item){
     item.id = item[Datastore.KEY].id;
     return item;
 }