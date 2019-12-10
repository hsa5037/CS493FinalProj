const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const fetch = require('node-fetch');
const request = require('request');

const BREWERY = "Brewery";
const BEER = "Beer";
const OWNER = "Owner";

const data = require('./datastore');
const datastore = data.datastore;
const {fromDatastore} = require('./datastore');


var jwt = require('express-jwt');
var jwksRsa = require('jwks-rsa');

router.use(bodyParser.json());

//MIDDLEWARE
//Verifies the access token against the JWK set
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://ahmedhu.auth0.com/.well-known/jwks.json`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://ahmedhu.auth0.com/`,
    algorithms: ['RS256']
  });

/* --------------------------Begin Owner Model Functions ------------------------ */
//Create a owner
function post_owner(id, req){
    var key = datastore.key(OWNER);
    const new_owner ={"auth_id": id, "username": req.body.username, "first": req.body.first, "last": req.body.last, "brewery": []};
    return datastore.save({"key":key, "data":new_owner}).then( ()=>{return key});
}



//View a owner
function get_indiv_owner (id) {
    const key = datastore.key([OWNER,parseInt(id,10)]);
    const q = datastore.createQuery(OWNER).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

//Get breweries no pagination. Used for displaying carrier data when GET beer requests called
function get_breweries_no_pag(){
    const q = datastore.createQuery(BREWERY);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}

//get total owners
function get_total_owners(req) {
	var q = datastore.createQuery(OWNER);
    const results = {};

    return datastore.runQuery(q).then ((entities) => {
        results.items = entities[0].map(fromDatastore);
        //console.log(results.items.length);
        return results.items.length;
    });
}

//Get owners no pagination. 
function get_owners_no_pag(){
    const q = datastore.createQuery(OWNER);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}

//Pagination for Get All
function get_owners (req){
    var q = datastore.createQuery(OWNER).limit(5);

    const results ={};
    if(Object.keys(req.query).includes("cursor")){
        q=q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) =>{
        results.items = entities[0].map(fromDatastore);
        if(entities[1].moreResults !== datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://"+req.get("host")+req.baseUrl+"?cursor="+entities[1].endCursor;
        }
        return results;
    });
}

//Edit owner
function put_owner(id, body, oldOwner){
    const key = datastore.key([OWNER, parseInt(id,10)]);

    var username = oldOwner.username;
    var first = body.first;
    var last = body.last;
    var id = oldOwner.id;
    var brewery = oldOwner.brewery;

    if(first === undefined) {
        name = oldOwner.first;
    }
    if(last === undefined) {
        city = oldOwner.last;
    }
    const owner = {'username': username, 'first': first, 'last': last, 'id': id, "brewery": brewery};
    return datastore.update({"key": key, "data": owner}).then(() => {
        return key
        });

}

//delete owner
function delete_owner (id) {
	const key = datastore.key([OWNER, parseInt(id,10)]);
    return datastore.delete(key);
}

//is brewery owned
function isBreweryOwned(owners, brewery_id){
	var owned = false;

	for (var i = 0; i < owners.items.length; i++){
		for (var j = 0; j < owners.items[i].brewery.length; j++){
			if (owners.items[i].brewery[j].id === brewery_id){
				owned = true;
			}
		}
	}

	return owned;
}

//Add brewery to owner
function add_brewery_to_owner(o_id, b_id, oldOwner){	
	var username = oldOwner.username;
	var firstName = oldOwner.first;
	var lastName = oldOwner.last;

	var id = oldOwner.id;
	var brewery = oldOwner.brewery;

	const key = datastore.key([OWNER, parseInt(o_id, 10)]);
	brewery.push({"id":b_id});

	const owner = {"username": username, "first": firstName, "last": lastName, "id": id, "brewery": brewery};
	return datastore.update({"key":key, "data":owner})
		.then(() => {
			return key
		})
}

//create auth0 account if new user
function createAccount (token, name, email, username, password){
	var bearerToken = 'Bearer ' + token;

	var body = "connection=Username-Password-Authentication&email=" + email + "&username=" + username + "&password=" + password + "&name=" + name;

	return fetch('https://ahmedhu.auth0.com/api/v2/users', {
		method: "POST",
		mode: "cors",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Authorization": bearerToken
		},
		body: body,
	}).then(res => res.json());
}


//delete auth0 account
function deleteAccount (token, id) {
	var bearerToken = 'Bearer ' + token;

	var options = { method: 'DELETE',
		url: 'https://white6.auth0.com/api/v2/users/' + id,
		headers: { 'Content-Type': "application/json",
			'Authorization': bearerToken
		}
	};

	request(options, function (error, res, body) {
		if (error) {
			throw new Error(error);
		}
		console.log(body);
		return body;
	})
}

//returns breweries owned by owner
function get_owners_breweries (req) {
	var breweries = get_breweries_no_pag();
	var owner = get_indiv_owner(req.params.o_id);

	var ownersBreweries = [];

	return Promise.all( [owner, breweries])
		.then(function (values) {
			owner = values [0][0];
			breweries = values[1].items;

			for (var i = 0; i < owner.brewery.length; i++){
				for (var j = 0; j < breweries.length; j++){
					if (owner.brewery[i].b_id === breweries[j].id ) {
						ownersBreweries.push(breweries[j]);
					}
				}
			}
			for (var i = 0; i < ownersBreweries.length; i++){
				ownersBreweries[i].self = req.protocol + '://' + req.get('host') + '/breweries/' + ownersBreweries[i].id;
			}
			return ownersBreweries;
		})
}


/* --------------------------END Owner Model Functions ------------------------ */

/* --------------------------Begin Owner Controller Functions ------------------------ */

////Get all owners
router.get('/', function(req, res){
    return get_owners(req)
        .then( owners => {
        	for (var i = 0; i < owners.items.length; i++){
        		owners.items[i].self = req.protocol + "://" + req.get('host') + "/owners/" + owners.items[i].id;
        		for (var j = 0; j < owners.items[i].brewery.length; j++){
        			owners.items[i].brewery[j].self = req.protocol + "://" + req.get('host') + "/breweries/" + owners.items[i].brewery[j].id;
        		}
        	}
        	const total = get_total_owners(req)
        		.then( (total) => {
        			owners.total = total;
        			const accepts = res.accepts(['application/json']);
        			if (accepts === 'application/json'){
        				res.status(200).json(owners);
        			} else {
        				res.status(406).send("Not Acceptable");
        			}
        		})

            
        }).catch(function(error){
        	res.status(403).send("Forbidden");
        })
});

//Get indiv owner
router.get('/:id', checkJwt, function (req, res) {
	const owner = get_indiv_owner(req.params.id)
		.then( (owner) => {
			const accepts = res.accepts(['application/json']);
			var o_id = owner[0].id;

			if (o_id && o_id !== req.user.sub){
				res.status(401).send("Unauthorized");
			} else if (accepts === 'application/json'){
				owner[0].self = req.protocol + "://" + req.get('host') + "/owners/" + owner[0].id;

				for (var i = 0; i < owner[0].brewery.length; i++){
					owner[0].brewery[i].self = req.protocol + "://" + req.get('host') + "/breweries/" + owner[0].brewery[i].id;
				}
				res.status(200).json(owner[0]);
			} else {
				res.status(406).send("Not Acceptable");
			}
		}).catch(function(error){
			res.status(403).send("Forbidden");
		})
});


//POST owner
router.post('/', function (req, res){
	var name = req.body.first + ' ' + req.body.last;

	var options = { method: 'POST',
		url: 'https://ahmedhu.auth0.com/oauth/token',
		headers: { 'Content-Type': 'application/json' },
		body: {
			grant_type: 'client_credentials',
			client_id: 'LK93g1flOaB6aESuU7l2T2k5XmR72eab',
			client_secret: 'XQzWlsNvvjKVq2S_qdEQAkYe9ggc_l6pqkCyrRFD2eT8_54hUwCVUP5Jfnh1Nz0U',
			audience: 'https://ahmedhu.auth0.com/api/v2/' 
		},
		json: true
	};

	request (options, (error, response, body) => {
		if (error){
			res.status(500).send(error);
		}
		createAccount(body.access_token, name, req.body.email, req.body.username, req.body.password)
			.then( (loginInfo) => {
				console.log(loginInfo);
				var o_id = loginInfo.user_id;
				post_owner(o_id, req)
					.then( key => {
						res.status(201).send( '{ "id": "' + key.id + '", "self": "' + req.protocol + '://' + req.get('host') + '/owners/' +key.id + '" }')
					})
			}).catch(function (error) {
				res.status(403).send("Forbidden");
			})
	})
})



//PUT
router.put('/:id', checkJwt, function(req,res) {
    const oldOwner = get_indiv_owner(req.params.id)
        .then((oldOwner) => {
        	if (oldOwner[0].id && oldOwner[0].id !== req.user.sub){
        		res.status(401).send("Unauthorized");
        	} else if (oldOwner !== undefined){
                console.log(oldOwner);
                put_owner(req.params.id, req.body, oldOwner[0])
                    .then(key => {res.status(303).location(req.protocol + "://" +req.get("host") + "/owners/" + key.id).end();
                }).catch(function(error){
                    console.log(error);
                    res.status(403).send("Forbidden");
                })
            } else 
            	res.status(404).send("Owner Not Found.");
        })
});

//DELETE OWNERS
router.delete('/:id', checkJwt, function (req, res) {
	var userID = req.user.sub;

	var options = { method: 'POST',
		url: 'https://ahmedhu.auth0.com/oauth/token',
		headers: { 'Content-Type': 'application/json' },
		body: {
			grant_type: 'client_credentials',
			client_id: 'LK93g1flOaB6aESuU7l2T2k5XmR72eab',
			client_secret: 'XQzWlsNvvjKVq2S_qdEQAkYe9ggc_l6pqkCyrRFD2eT8_54hUwCVUP5Jfnh1Nz0U',
			audience: 'https://ahmedhu.auth0.com/api/v2/' 
		},
		json: true
	};

	request(options, function (error, response, body) {
		if (error) {
			res.status(404).send("User not found");
			throw new Error(error);
		}

		get_indiv_owner(req.params.id)
			.then( (owner) => {
				if (owner[0].id && owner[0].id !== userID ) {
					res.status(401).send("Unauthorized");
				} else {
					var bearerToken = 'Bearer ' + body.access_token;

					var opt2 = { method: 'DELETE',
						url: 'https://ahmedhu.auth0.com/api/v2/users/' + owner[0].id,
						headers: {
							'Content-Type': 'application/json',
							'Authorization': bearerToken
						}
					};

					request (options, function (error, response, body) {
						if (error) {
							res.status(404).send("User Not Found");
							throw new Error(error);
						}
						delete_owner(req.params.id)
							.then(() => {
								res.status(204).end()
							})
					})
				}
			}).catch( function (error) {
				res.status(403).send("Forbidden");
			})
	})
});

//POST brewery to owner
router.post('/:o_id/breweries/:b_id', checkJwt, function(req, res) {
	get_owners_no_pag()
		.then( (owners) => {
			if (isBreweryOwned(owners, req.params.b_id)) {
				res.status(403).send("Forbidden: Brewery Already Has Owner");
			} else {
				get_indiv_owner(req.params.o_id)
					.then( (owner) => {
						if (owner[0].id && owner[0].id !== req.user.sub) {
							res.status(401).send("Unauthorized");
						} else {
							add_brewery_to_owner(req.params.o_id, req.params.b_id, owner[0])
								.then ( (key) => {
									res.status(201).send('{ "self": "' + req.protocol + '://' + req.get("host") + '/owners/' + key.id + '" }')
								});
						}
					});
			}
		}).catch(function (error) {
			res.status(403).send("Forbidden")
		})
});


//GET owners breweries
router.get('/:o_id/breweries', checkJwt, function (req, res) {
	get_indiv_owner(req.params.o_id)
		.then( (owner) => {
			const accepts = req.accepts(['application/json']);
			if (owner[0].o_id && owner[0].o_id != req.user.sub) {
				res.status(401).send('Unauthorized');
			} else if (accepts === 'application/json') {
				get_owners_breweries(req)
					.then( (owner) => {
						res.status(200).send(owner);
					});
			}
		}).catch(function (error) {
			res.status(403).send("Forbidden")
		})
});



//Error handling
router.put('/',function(req,res){
    res.set('Accept','GET,POST');
    res.status(405).end();
});

//error handling
router.delete('/', function(req,res){
    res.set('Accept','GET, POST');
    res.status(405).end();
});


module.exports = router;










