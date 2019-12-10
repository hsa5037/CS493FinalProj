const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

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


/* ------------- Begin Brewery Model Functions ------------- */
//Add brewery to owner
function add_brewery_to_owner(o_id, b_id, oldOwner){    
    var username = oldOwner.username;
    var firstName = oldOwner.first;
    var lastName = oldOwner.last;

    var id = oldOwner.id;
    var brewery = oldOwner.brewery;

    const key = datastore.key([OWNER, parseInt(o_id, 10)]);
    //brewery.push({"id":b_id});

    const owner = {"username": username, "first": firstName, "last": lastName, "id": id, "brewery": b_id};
    return datastore.update({"key":key, "data":owner})
        .then(() => {
            return key
        })
}


//Create a brewery
function post_brewery(brewery_name, brewery_city, brewery_size, brewery_ownerAuth, brewery_ownerID){

    var key = datastore.key(BREWERY);

    const new_brewery = {"name": brewery_name, "city": brewery_city, "size": brewery_size, "ownerAuth": brewery_ownerAuth, "owner": brewery_ownerID };
    return datastore.save({"key":key, "data":new_brewery}).then(() => {return key});
}

//Get A Brewery
function get_indiv_brewery (id) {
    const key = datastore.key([BREWERY,parseInt(id,10)]);
    const q = datastore.createQuery(BREWERY).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        //console.log(entities);
        if (entities[1].moreResults !== datastore.NO_MORE_RESULTS){
            return null;
        }
        return entities[0].map(fromDatastore);
    });
}



//Pagination for Get All
function get_breweries (req){
    var q = datastore.createQuery(BREWERY).limit(5);

    const results ={};
    if(Object.keys(req.query).includes("cursor")){
        q=q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then( (entities) =>{
        results.items = entities[0].map(data.fromDatastore);
        if(entities[1].moreResults !== data.Datastore.NO_MORE_RESULTS ){
            results.next = req.protocol + "://"+req.get("host")+req.baseUrl+"?cursor="+entities[1].endCursor;
        }
        return results;
    });
}

//return total breweries
function get_total_breweries(req){
    var q = datastore.createQuery(BREWERY);
    const results = {};

    return datastore.runQuery(q).then ((entities) => {
        results.items = entities[0].map(fromDatastore);
        //console.log(results.items.length);
        return results.items.length;
    });
}

//Get breweries no pagination. Used for displaying carrier data when GET beer requests called
function get_breweries_no_pag(){
    const q = datastore.createQuery(BREWERY);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}

//Patch brewery
function patch_brewery(id, newName, newCity, newSize, oldBrewery){
    const key = datastore.key([Brewery, parseInt(id,10)]);
    if(newName === undefined)
        newName = oldBrewery.name;
    if(newCity === undefined)
        newCity = oldBrewery.city;
    if(newSize === undefined)
        newSize = oldBrewery.size;
    const brewery = {"name": newName, "city": newCity, "size": newSize, "owner": oldBrewery.owner};
    return datastore.update({"key":key, "data":brewery}).then(()=> {return key})
}

// //Put Brewery
// function put_brewery(id, name, city, size){
//     const key = datastore.key([BREWERY, parseInt(id,10)]);
//     const brewery = {"name": name, "city": city, "size": size};
//     return datastore.update({"key":key, "data":brewery}).then(()=> {return key})
// }

function delete_brewery(id){
    const key = datastore.key([BREWERY, parseInt(id,10)]);
    return datastore.delete(key);
}


//Get beers no pagination. Used for displaying carrier data when GET brewery requests called
function get_beers_no_pag(){
    const q = datastore.createQuery(BEER);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}

//View a beer
function get_indiv_beer (id) {
    const key = datastore.key([BEER,parseInt(id,10)]);
    const q = datastore.createQuery(BEER).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}


//Get beer from brewery
function get_brewery_beer(beers, breweryID){
	var beer = null;
	for (var i = 0; i < beers; i++){
		if (beers[i].brewery === breweryID)
			beer = beers[i];
	}
	return beer;
}

//get all owners
function get_owners_no_pag(){
	    const q = datastore.createQuery(OWNER);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}

//remove beer from brewery
function delete_beer_from_brewery(brewery_id, beer_id){
    const key = datastore.key([BEER, parseInt(beer_id,10)]);
    const q = datastore.createQuery(BEER).filter('__key__','=',key);
    return datastore.runQuery(q).then((entities) =>{
        const beer=(entities[0].map(fromDatastore));
        if(beer[0].brewery === brewery_id){
            const newBeer ={'name':beer[0].name,'brewery':null, 'style':beer[0].style, 'abv':beer[0].abv};
            return datastore.update({"key":key, "data":newBeer}).then(()=>{
                return key
            })
        }
        else{
            return null;
        }
    })
}

//Update beer                        */
function put_beer(id, name, brewery, style, abv, prev){
    const key = datastore.key([BEER, parseInt(id,10)]);
    if(name === undefined) {
        name = prev.name;
    }
    if(brewery === undefined) {
        brewery = prev.brewery;
    }
    if(style === undefined) {
        style = prev.style;
    }
    if (abv === undefined) {
        abv = prev.abv;
    }
    const beer = {'name': name, 'brewery': brewery, 'style': style, 'abv': abv};
    return datastore.update({"key": key, "data": beer}).then(() => {
        return key
        });
    }

//Edit brewery
function put_brewery(id, body, oldBrewery){
    //console.log(body);
    const key = datastore.key([BREWERY, parseInt(id,10)]);

    var name = body.name;
    var city = body.city;
    var size = body.size;

    if(name === undefined) {
        name = oldBrewery.name;
    }
    if(city === undefined) {
        city = oldBrewery.city;
    }
    if(size === undefined) {
        size = oldBrewery.size;
    }
    const brewery = {'name': name, 'city': city, 'size': size, 'owner': oldBrewery.owner};
    //console.log(brewery);
    return datastore.update({"key": key, "data": brewery}).then(() => {
        return key
        });

}


//View a owner
function get_indiv_owner (id) {
    const key = datastore.key([OWNER,parseInt(id,10)]);
    const q = datastore.createQuery(OWNER).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}

/* ------------- End Brewery Model Functions ------------- */


/* ------------- Begin Controller Functions ------------- */


//Get all breweries and display beers for each
router.get('/', function(req, res){
    let beerObj;
    return get_beers_no_pag()
        .then (beers => {
            beerObj = beers;
            return get_breweries(req);
        }).then(breweriesPag =>{

            for (var i = 0; i < breweriesPag.items.length; i++){
                breweriesPag.items[i].self = req.protocol + "://" + req.get("host") + "/breweries/" + breweriesPag.items[i].id;
                let itr = 0;
                breweriesPag.items[i].beers = [];
                for (var j = 0; j < beerObj.length; j++) {
                    if (beerObj[j].brewery === breweriesPag.items[i].id){
                        breweriesPag.items[i].beers[itr] = {
                            "id": beerObj[j].id,
                            "self": req.protocol + "://" + req.get("host") + "/beers/" + beerObj[j].id 
                        };
                        itr++;
                    }
                }
            }
            const total = get_total_breweries(req)
                .then((total) => {
                    const accepts = req.accepts(['application/json']);
                    if (accepts === 'application/json'){
                        breweriesPag.total = total;
                        res.status(200).json(breweriesPag);
                    } else {
                        res.status(406).send("Not Acceptable");
                    }
                })
        })
});

//individual brewery
router.get('/:id', function(req, res){
    let breweryObj;
    const brewery = get_indiv_brewery(req.params.id)
    .then( (brewery) => {
        if (brewery[0] === undefined){
            res.status(404).send('{ "Error": "No brewery with this id exists" }')
        } else {
            breweryObj = brewery;
            brewery[0].self= req.protocol + "://" + req.get("host") + "/breweries/" +brewery[0].id;
            const breweryBeers = get_beers_no_pag()
                    .then((breweryBeers)=>{
                        let itr=0;
                        breweryObj[0].beers=[];
                        for(var i=0; i < breweryBeers.length; i++) {
                            if (breweryBeers[i].brewery === req.params.id) {
                                breweryObj[0].beers[itr] = {
                                    "id": breweryBeers[i].id,
                                    "self": req.protocol + "://" + req.get("host") + "/beers/" + breweryBeers[i].id
                                };
                                itr++;
                            }
                        }
                        const accepts = req.accepts(['application/json']);
                        if (accepts === 'application/json'){
                            res.status(200).json(breweryObj);
                        } else {
                            res.status(406).send("Not Acceptable");
                        }
                    });
        }
    });
});


//create brewery
router.post('/', checkJwt, function(req, res){
    //console.log(req.body.owner);
    if (req.body.owner === undefined){
        res.status(400).send("Bad Request: Must include owner id as 'owner'");
    }
    post_brewery(req.body.name, req.body.city, req.body.size, req.user.sub, req.body.owner)
        .then( key => {
            var oldOwner = get_indiv_owner(req.body.owner)
                .then( (oldOwner) => {
                    add_brewery_to_owner(req.body.owner, key.id, oldOwner)
                        .then (res.status(201).send('{ "id": ' + key.id + ' }'))
                })
        });
});

//delete brewery
router.delete('/:id', checkJwt, function(req, res){
    const brewery = get_indiv_brewery(req.params.id)
        .then((brewery) => {
            if (brewery[0] === undefined){
                res.status(404).send('Not Found: No brewery with that id could be found.');
            } else if (brewery[0].ownerAuth && brewery[0].ownerAuth !== req.user.sub){
                res.status(401).send("Unauthorized");
            } else {
                delete_brewery(req.params.id).then(res.status(204).end());

            }
        });
});

//Assign Beer to brewery
router.patch('/:b_id/beer/:beer_id', checkJwt, function(req,res){
    const brewery = get_indiv_brewery (req.params.b_id)
        .then ( (brewery) => {
            if (brewery[0].owner && brewery[0].ownerAuth !== req.user.sub) {
                res.status(401).sent("Unauthorized");
            } else {
                const prevBeer = get_indiv_beer(req.params.beer_id)
                    .then((prevBeer)=>{
                        if(!prevBeer[0].brewery) {
                            const newBeer = put_beer(req.params.beer_id, undefined, req.params.b_id, undefined, undefined, prevBeer[0])
                                .then((newBeer) => {
                                    res.status(200).send('{"id": ' + newBeer.id + ' }');
                                })
                        }
                        else res.status(403).send('{"Error": "Cannot assign beer to brewery.” }');
                    })
            }
        })
});


//Remove beer from brewery
router.delete('/:b_id/beer/:beer_id', function(req, res){
    const removeBeer = delete_beer_from_brewery(req.params.b_id, req.params.beer_id)
        .then(key =>{res.status(200).send('{"id": '+ key.id+' }')})
        .catch(function(){
            res.status(204).send();
        })
});

//View all beers from given brewery
router.get('/:b_id/beer/', function(req,res){
    let breweryBeers =[];
    const beer = get_beers_no_pag()
       .then( (beer)=>{
           let j = 0;
           for(var i=0; i< beer.length; i++){
                if(beer[i].brewery === req.params.b_id){
                    breweryBeers[j]={"id": beer[i].id,"name": beer[i].name, "style": beer[i].style,
                        "abv": beer[i].abv,
                        "self": req.protocol + "://" + req.get("host")+"/beers/"+ beer[i].id };

                    j++;
                }
           }
            const accepts = req.accepts(['application/json']);
            if (accepts === 'application/json'){
                res.status(200).json(breweryBeers);
            } else {
                res.status(406).send("Not Acceptable");
            }
       })
});

//PUT
router.put('/:id', checkJwt, function(req,res) {
    //console.log(req.body);
    const oldBrewery = get_indiv_brewery(req.params.id)
        .then((oldBrewery) => {
            if (oldBrewery[0].ownerAuth && oldBrewery[0].ownerAuth !== req.user.sub){
                res.status(401).send("Unauthorized");
            } else if (oldBrewery[0] !== undefined){
                //console.log(oldBrewery);
                put_brewery(req.params.id, req.body, oldBrewery[0])
                    .then(key => {res.status(303).location(req.protocol + "://" +req.get("host") + "/breweries/" + key.id).end();
                }).catch(function(error){
                    console.log(error);
                    res.status(403).send("Forbidden");
                })
            } else 
                res.status(404).send("Brewery Not Found.")
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


