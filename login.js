const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const request = require('request');

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


router.post('/', function (req, res) {
    const username = req.body.username;
    const pwd = req.body.password;

    var options = { method: 'POST',
        url: 'https://ahmedhu.auth0.com/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
            scope: 'openid',
            grant_type: 'password',
            username: username,
            password: pwd,
            client_id: "LK93g1flOaB6aESuU7l2T2k5XmR72eab",
            client_secret: 'XQzWlsNvvjKVq2S_qdEQAkYe9ggc_l6pqkCyrRFD2eT8_54hUwCVUP5Jfnh1Nz0U' },
        json: true 
    };
    request(options, (error, response, body) => {
        if (error){
            res.status(500).send(error);
        } else if (body.error === 'invalid_grant'){
        	res.status(401).send(body);
        } else {
            res.status(200).send(body);
        }
    });

});


module.exports.jwt = jwt;
module.exports = router;