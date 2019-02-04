var express = require('express');
var router = express.Router();



console.log('NODE_ENV:' + process.env.NODE_ENV);

//this is the clean autogenreated code
/* GET home page. */
router.get('/', function(req, res, next) {
   //Note something like this also works
  //res.send('Hello World');
  

  res.render('index', { title: 'Express' });
});

module.exports = router;
