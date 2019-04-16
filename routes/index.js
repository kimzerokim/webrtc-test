var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('signaling')
});



module.exports = router;
