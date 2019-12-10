const express = require('express');
const app = express();

// const {Datastore} = require('@google-cloud/datastore');
// const bodyParser = require('body-parser');
// const projectId = 'ahmedhucs493final';
// const datastore = new Datastore({projectId:projectId});

// const router = express.Router();

// function fromDatastore(item){
//     item.id = item[Datastore.KEY].id;
//     return item;
// }

// router.use('/breweries', require('./breweries'));
// router.use('/beers', require('./beers'));
//router.use('/owners', require('./owners'));
//router.use('/login', require('./login'));

app.use('/', require('./index'));




// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
