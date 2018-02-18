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


var mysql = require('mysql');
function connect(){
    return mysql.createConnection({
        host: '10.0.0.18',
        user: 'root',
        password: 'l3nyluna13296',
        database: 'VGgateway',
        port: 3306
    });
}

// comment
router.get('/', function(req, res, next) {
    var date = new Date();
    res.render('login');
    /*res.render('index',
        { title: myFile,
            date: date});*/
});

router.get('/inicio', function(req, res, next) {
    res.render('manageUsers');
});

router.get('/manageUser', function(req, res, next) {
    res.render('manageUsers');
});

router.get('/ConfiguracionTrunk', function(req, res, next) {
    res.render('Trunk-Configuration');
});

router.post('/ConfiguracionTrunk/guardar', urlencodedParser, function(req, res) {
    var data = req.body;
    /*connect().query("delete from trunk where id_trunk= 1");
    connect().query("delete from outgoing where id = 1");
    connect().query("delete from incoming where id_in = 1");*/

    connect().query('INSERT INTO outgoing VALUES (?,?,?,?,?,?,?,?)',[1,data.usernameT,data.trunkname,data.fromuser,data.secret,data.port,'peer',data.host],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
    connect().query('INSERT INTO incoming VALUES (?,?,?,?,?)',[1,data.usernameI,data.passwordI,data.context,'peer'],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
    connect().query("INSERT INTO trunk VALUES (1,1,1)");
    connect().end();
    res.redirect("/");
});

/*router.post('/form', urlencodedParser, function(req, res) {
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
});*/


module.exports = router;
