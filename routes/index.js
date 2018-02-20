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
console.log(writeFile());
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

// funciones
function connect(){
    return mysql.createConnection({
        host: '10.0.0.18',
        user: 'root',
        password: 'l3nyluna13296',
        database: 'VGgateway',
        port: 3306
    });
}

function writeFile(){
     var infoOut ="";
    save(infoOut);
    connect().query("Select o.username,o.trunk_name,o.fromuser,o.secret,o.port,o.type,o.host,i.username as userIn,i.secret as secretIn,i.context as contextIn,i.type as typeIn " +
        "from trunk t inner join outgoing o on t.id_outgoing =o.id inner join incoming  i on i.id_in = t.id_incoming", function(err,result,fields) {
        if (err) throw err;
       Object.keys(result).forEach(function(key) {
            var row = result[key];
            infoOut="[general]\n\n"+"["+row.trunk_name+"]\n"+"host="+row.host+"\nsecret="+row.secret+"\nusername="
                +row.username+"\nfromuser="+row.fromuser+"\ntype="+row.type+"\nqualify=yes\n"+"port="+row.port+"\ncontext=inbound\n"
                +"\n["+row.userIn+"]\n"+"secret="+row.secretIn+"\ntype="+row.typeIn+"\ncontext="+row.contextIn+"\n\n[2021]\n"+"type=friend\n"
                +"host=dynamic\n"+"secret=rl123\n"+"context=from-trunk\n"+"callerid='Ricardo Luna'<2021>\n"
                +"\n[2022]\n"+"type=friend\n"+"host=dynamic\n"+"secret=leny123\n"+"context=from-internal\n"+"callerid='Leny Luna' <2022>";
            console.log(infoOut);
           save(infoOut);
        });
    });
    connect().end();
}

function save(data){
    fs.writeFile('C:/Users/Leny96/Documents/Dc.Universidad/ProyectoFinal/sip.conf',data,function(err) {
        if (err) {
            throw err;
        } else {
            console.log('Guardado Satisfactoriamente');
        }
    });
}
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
