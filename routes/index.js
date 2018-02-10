var express = require('express');
var router = express.Router();
var app = express();
var bodyParser = require('body-parser');

/* GET home page. */

var fs = require('fs');
var path = require('path');

var urlencodedParser = bodyParser.urlencoded({
    extended: false
});

var buffer = bufferFile('C:/Users/Leny96/Documents/Dc.Universidad/ProyectoFinal/sip.conf');
var myFile;
var j = 0;

function formatString(data){
    var cant = data.match("\n").length;
    var arr = data;
    for(var i = 0; i < cant; i++){
        switch (j){
            case 0:
                arr = data.toString().replace("\n",",");
                j++;
                break;
            case 1:
                data = arr.toString().replace("\n",",");
                j++;
                break;
            case 2:
                arr = data.toString().replace("\n",",");
                j--;
                break;
        }
    }
    data = arr.split(",");
    return data;
}

function bufferFile(myPath){
    return fs.readFile(myPath, 'utf-8', function(err, data){
        if(err){
            console.log(err);
        } else{
            myFile = data
            console.log (myFile);
        }
    });
}
// comment
router.get('/', function(req, res, next) {
    var date = new Date();
    res.render('index',
        { title: myFile,
            date: date});
});

//pruebabsksajhdfsdn

router.post('/form', urlencodedParser, function(req, res) {
    var data = req.body.trunk;
    fs.writeFile('C:/Users/Leny96/Documents/Dc.Universidad/ProyectoFinal/sip.conf',data,function(err) {
        if (err) {
            throw err;
        } else {
            console.log('Guardado Satisfactoriamente');
            buffer = bufferFile('C:/Users/Leny96/Documents/Dc.Universidad/ProyectoFinal/sip.conf');
            res.redirect('/');
        }
    });
});


module.exports = router;
