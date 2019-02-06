const express = require('express');
const router = express.Router();

var request = require('request');
var cassandra = require( 'cassandra-driver');

//TODO Extract connection handling into a separate db class
var client = new cassandra.Client({contactPoints:['127.0.0.1'], localDataCenter: 'datacenter1'});
client.connect(function(err, result){
  if(err){
    console.log('index: cassandra not connected', err);
  }
  else{
    console.log('index: cassandra connected');
  }
});


/* GET all prices */
router.get('/', function(req, res, next) {
  var getAllPrices = 'SELECT id, currency_price FROM myretail.prices';

  //the empty array would contain something if you were doing a post request, but since we are doing a get it is empty
  client.execute (getAllPrices, [], {prepare: true}, function(err, result){
      if(err){
        res.status(404).send({msg:err});
      }
      else{
          res.send(prices);
          //res.render('index', {prices: result.rows});
      }
  });
});

/* GET product by id */
router.get('/:id', function(req, res, next) {
  //Construct the CQL  query
  var getPrice = 'SELECT * FROM myretail.prices WHERE id=?';
  
  //Run the query
  client.execute (getPrice, [parseInt(req.params.id)], {prepare: true}, function(err, result){
    if(err){
      res.status(404).send({msg:err});
    }
    else{
      if(result.rows.length == 0){
        res.status(404).send('Product with this id does not exist in myRetail');
      }
      else{
        //Get the title from redsky.target.com
        //TODO Shouldn't hard code this here.  Work out a better way to store it
        var externalapi = 'http://redsky.target.com/v2/pdp/tcin/' + req.params.id +'?excludes=taxonomy,price,promotion,bulk_ship,rating_and_review_reviews,rating_and_review_statistics,question_answer_statistics'

        request(externalapi, function (error, response, body){
          if(error){
            res.status(404).send({msg:err});
          }

          var title = 'Unknown title';
          try{
            title = JSON.parse(body).product.item.product_description.title;   
          }
          catch(ex){
            console.log('Error: unable to read product title from redsky.target.com');
          }

          //Check a single product is returned for this id
          if(result.rows.length > 1){console.log('Error: More than one product exists with id' + id);}
          
          var id = '00000000';
          try{id = result.rows[0].id;}
          catch(ex){console.log('error reading product id from myretail');}

          var value = 0.0;
          try{value = result.rows[0].currency_price;}
          catch(ex){console.log('error reading currency price from myretail');}          
          
          var currency_code = '';
          try{currency_code = result.rows[0].currency_code;}
          catch(ex){console.log('error reading currency code from myretail');}       


          //Form the JSON object from the results
          var productdetails = {
            "id": id,
            "name": title,
            "current_price":{
              "value": value,
              "currency_code": currency_code,
            }
          }

          //Return the JSON object
          res.send(productdetails);
        });
      }
    }
  });
});

/* PUT price*/
router.put('/', function(req, res, next) {

  var createPrice = 'INSERT INTO myretail.prices(id, datetime, currency_code, currency_price) VALUES (?, dateOf(now()), ?, ?)';
 
  //Run the query
  client.execute (createPrice, [parseInt(req.body.id),
      req.body.currency_code, 
      parseFloat(req.body.currency_price)], {prepare: true}, function(err, result){
    
    if(err){
      res.status(404).send({msg:err});
    }

    //Read back the product details and return
    var getPrice = 'SELECT * FROM myretail.prices WHERE id=?';
  
    //Run the query
    client.execute (getPrice, [parseInt(req.body.id)], {prepare: true}, function(err, result){
      if(err){
        res.status(404).send({msg:err});
      }

      //Get the title from redsky.target.com
      //TODO Shouldn't hard code this here.  Work out a better way to store it
      var externalapi = 'http://redsky.target.com/v2/pdp/tcin/' + req.params.id +'?excludes=taxonomy,price,promotion,bulk_ship,rating_and_review_reviews,rating_and_review_statistics,question_answer_statistics'

      request(externalapi, function (error, response, body){
        if(error){
          res.status(404).send({msg:err});
        }

        try{
          const title = JSON.parse(body).product.item.product_description.title;   
        }
        catch(ex){
          res.status(500).send('error reading product title from redsky.target.com')
        }

        //Form the JSON object from the results
        var productdetails = {
          "id": result.rows[0].id,
          "name": title,
          "current_price":{
            "value": result.rows[0].currency_price,
            "currency_code": result.rows[0].currency_code
          }
        };
      
        //Return the JSON object
        res.send(productdetails);  
      });
    });
  });
});


/* CREATE prices. */
router.post('/', function(req, res, next) {

  var createPrice = 'INSERT INTO myretail.prices(id, datetime, currency_code, currency_price) VALUES (?, dateOf(now()), ?, ?)';
 
  //Run the query
  client.execute (createPrice, [parseInt(req.body.id),req.body.currency_code, parseFloat(req.body.currency_price)], {prepare: true}, function(err, result){
    if(err){
      res.status(404).send({msg:err});
    }

    //Read back the product details and return
    var getPrice = 'SELECT * FROM myretail.prices WHERE id=?';
  
    //Run the query
    client.execute (getPrice, [parseInt(req.body.id)], {prepare: true}, function(err, result){
      if(err){
        res.status(404).send({msg:err});
      }

      //Get the title from redsky.target.com
      //TODO Shouldn't hard code this here.  Work out a better way to store it
      var externalapi = 'http://redsky.target.com/v2/pdp/tcin/' + req.params.id +'?excludes=taxonomy,price,promotion,bulk_ship,rating_and_review_reviews,rating_and_review_statistics,question_answer_statistics'
      
      request(externalapi, function (error, response, body){
        if(error){
          res.status(404).send({msg:err});
        }

        //TODO Extract this code into a redsky wrapper module
        try{
          const title = JSON.parse(body).product.item.product_description.title;   
        }
        catch(ex){
          //TODO just log this error and set some default title instead of returning here
          res.status(500).send('error reading product title from redsky.target.com')
        } 

        //Form the JSON object from the results
        var productdetails = {
          "id": result.rows[0].id,
          "name": title,
          "current_price":{
            "value": result.rows[0].currency_price,
            "currency_code": result.rows[0].currency_code
          }
        };
      
        //Return the JSON object
        res.send(productdetails);  
      });
    });
  });
});

/* DELETE product */
router.delete('/:id', function(req, res, next) {
  //Construct the CQL  query
  var deletePrice = 'DELETE FROM myretail.prices WHERE id=? IF EXISTS';

  //Run the query
  client.execute (deletePrice, [req.params.id], {prepare: true}, function(err, result){
    if(err){
      res.status(404).send({msg:err});
    }
    res.send(result);
  });
});
    
module.exports = router;