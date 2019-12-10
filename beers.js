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


/* ------------- Begin Beer Model Functions ------------- */

//View a beer
function get_indiv_beer (id) {
    const key = datastore.key([BEER,parseInt(id,10)]);
    const q = datastore.createQuery(BEER).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        return entities[0].map(fromDatastore);
    });
}


//Pagination for Get All
function get_beers (req){
    var q = datastore.createQuery(BEER).limit(5);

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

//get total beers
function get_total_beers(req) {
	var q = datastore.createQuery(BEER);
    const results = {};

    return datastore.runQuery(q).then ((entities) => {
        results.items = entities[0].map(fromDatastore);
        //console.log(results.items.length);
        return results.items.length;
    });
}

//Create a beer
function post_beer(name, style, abv){
    var key = datastore.key(BEER);
    const new_beer ={"name": name, "style": style, "abv": abv, "brewery": null};
    return datastore.save({"key":key, "data":new_beer}).then( ()=>{return key});
}

//Delete beer
function delete_beer(id){
    const key = datastore.key([BEER, parseInt(id,10)]);
    return datastore.delete(key);
}

//Get breweries no pagination. Used for displaying carrier data when GET beer requests called
function get_breweries_no_pag(){
    const q = datastore.createQuery(BREWERY);
	return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore);
		});
}

//Get A Brewery
function get_indiv_brewery (id) {
    const key = datastore.key([BREWERY,parseInt(id,10)]);
    const q = datastore.createQuery(BREWERY).filter('__key__','=', key);
    return datastore.runQuery(q).then( (entities) =>{
        console.log(entities);
        if (entities[1].moreResults !== datastore.NO_MORE_RESULTS){
            return null;
        }
        return entities[0].map(fromDatastore);
    });
}

//remove beer from brewery
function delete_beer_from_brewery(brewery_id, beer_id){
    const key = datastore.key([BEER, parseInt(l_id,10)]);
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
function put_beer(id, body, prev){
    const key = datastore.key([BEER, parseInt(id,10)]);
    console.log(body);
    var name = body.name;
    var brewery = body.brewery;
    var style = body.style;
    var abv = body.abv;

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
    //console.log(beer);
    return datastore.update({"key": key, "data": beer}).then(() => {
        return key
        });
    }

/* ------------- END Beer Model Functions ------------- */

//Get all beers
router.get('/', function(req, res){
    let beerObj;
    return get_beers(req)
        .then( beers => {
            beerObj = beers;
            return get_breweries_no_pag();
        }).then(breweries => {
            for (var i = 0; i < beerObj.items.length; i++){
                beerObj.items[i].self = req.protocol + "://" + req.get("host") + "/beers/" + beerObj.items[i].id;
                if (beerObj.items[i].brewery){
                    for (var j = 0; j < breweries.length; j++){
                        if (beerObj.items[i].brewery === breweries[j].id){
                            beerObj.items[i].brewery = {
                                "id": breweries[j].id,
                                "name": breweries[j].name,
                                "self": req.protocol + "://" + req.get("host") + "/breweries/" + breweries[j].id
                            };
                        }
                    }
                }
            }
            const total = get_total_beers(req)
                .then((total) => {
                	const accepts = req.accepts(['application/json']);
                    if (accepts === 'application/json'){
                        beerObj.total = total;
                    	res.status(200).json(beerObj);
                    } else {
                        res.status(406).send("Not Acceptable");
					}
                })
        });
});


//individual beer
router.get('/:id', function(req, res){
    let beerObj;
    const beer = get_indiv_beer(req.params.id)
        .then( beer => {
        	const accepts = req.accepts(['application/json']);
        	if (accepts === 'application/json'){
	            beerObj = beer;
	            beerObj[0].self = req.protocol + "://" + req.get("host") + "/beers/" + beerObj[0].id;
	            if (beerObj[0].brewery){
	                return get_indiv_brewery(beerObj[0].brewery)
	                    .then( brewery => {
	                        beerObj[0].brewery = {
	                            "id": brewery[0].id,
	                            "name": brewery[0].name,
	                            "self": req.protocol + "://" + req.get("host") + "/breweries/" + brewery[0].id
	                        };
	                        res.status(200).json(beerObj);
	                    });
	            }
	            else
	                res.status(200).json(beerObj);
	        } else {
	        	res.status(406).send("Not Acceptable");
	        }
        })
});

//create beers
router.post('/', function(req, res){
    post_beer(req.body.name, req.body.style, req.body.abv)
    .then( key => {res.status(201).send('{ "id": ' + key.id + ' }')} );
});

//delete beer
router.delete('/:id', function(req, res){
    const beer = get_indiv_beer(req.params.id)
        .then( beer => {
            if (beer[0].brewery){
                return get_indiv_brewery(beer[0].brewery)
                    .then( brewery => {
                        delete_beer_from_brewery(brewery[0].id, req.params.id);
                    });
            }
       });
    delete_beer(req.params.id).then(res.status(204).send())
});

//PUT beer
router.put('/:id', function (req, res) {
	const oldBeer = get_indiv_beer(req.params.id)
		.then( (oldBeer) => {
			if (oldBeer[0] === undefined) {
				res.status(404).send("Beer not found");
			} else {
				//console.log(oldBeer[0]);
				put_beer(req.params.id, req.body, oldBeer[0])
					.then( key => {
						res.status(303).location(req.protocol + "://" + req.get('host') + '/beers/' + key.id).end();
					}).catch( function (error) {
						res.status(500).send("Server Error");
					})
			}
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


