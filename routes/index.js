var express = require('express');
var router = express.Router();
var app = express();
var bodyParser = require('body-parser');
var cleave = require('cleave.js');

/* GET home page. */

var fs = require('fs');
var path = require('path');
var command = require('node-cmd');
var mensajeApply = false;
var myip = require('ip');
var cmdParser = require('string');

var urlencodedParser = bodyParser.urlencoded({
    extended: false
});

var buffer = bufferFile('/etc/asterisk/sip_custom.conf');
var myFile;
var j = 0;

var encrypt = require('bcrypt');
function encriptar(info){
    var saltRounds = 10;
    encrypt.hash(info,saltRounds,function(err,hash){
        if(err) throw err;
        return hash;
    });
}

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
    res.render('login',{veri:false});
});

router.post('/login', function(req, res, next) {
    var  username = req.body.username;
    var  pass     =  req.body.password;
    connect().query("Select * from user where username=?",[username],function(err,result){
        if(err) throw err;
        Object.keys(result).forEach(function(key) {
            var row = result[key];
            encrypt.compare(pass,row.password,function(err,respuesta){
                if(err) throw err;
                if (result.length==1 && respuesta ) {
                    console.log("Login satisfactorio");
                    res.render('manageUsers');
                } else {
                    console.log("Informaciones incorrectas");
                    res.render('login', {user: username, veri: true});
                }
            });
        });

    });

});
router.get('/inicio', function(req, res, next) {
    res.render('manageUsers');
});

router.get('/Routes', function(req, res, next) {
    cleave = new Cleave('.input-delimiter', {
        delimiter: '.',
        blocks: [3, 3, 3],
        uppercase: true
    });
    res.render('Routes', {formar: cleave});
});

router.get('/manageUser', function(req, res, next) {
    res.render('manageUsers');
});
router.get('/device', function(req, res, next) {
    res.render('Device');
});

router.get('/Trunks', function(req, res, next) {
    trunkInf(res);
    //res.render('Trunk-List',{trunkname:"prueba",saddress:"192.168.1.0",daddress:"10.0.0.20",status:"Ni idea"});
});

router.get('/ConfiguracionTrunk', function(req, res, next) {
    veriTrunk(res);
});

router.get('/ConfiguracionTrunk/applyConf', function(req, res, next) {
    command.run('sudo asterisk -rx "core reload"');
    mensajeApply = false;
    res.redirect("/ConfiguracionTrunk");
});


router.post('/ConfiguracionTrunk/actualizar', function(req, res, next) {
    var data = req.body;
    connect().query('UPDATE outgoing  set username=?, trunk_name=?, fromuser=?,secret=?,port=?,host=? where id=1',
        [data.usernameT,data.trunkname,data.fromuser,data.secret,data.port,data.host],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
    connect().query('UPDATE incoming set username=?,secret=? where id_in=1',[data.usernameI,data.passwordI],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
    writeFile();
    connect().end();
    res.redirect("/ConfiguracionTrunk");
});
router.post('/ConfiguracionTrunk/guardar', urlencodedParser, function(req, res) {
    var data = req.body;
    connect().query('INSERT INTO outgoing VALUES (?,?,?,?,?,?,?,?)',[1,data.usernameT,data.trunkname,data.fromuser,data.secret,data.port,'peer',data.host],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
    connect().query('INSERT INTO incoming VALUES (?,?,?,?,?)',[1,data.usernameI,data.passwordI,'from-trunk','peer'],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
    });
    connect().query("INSERT INTO trunk VALUES (1,1,1)",function (error) {
         if(error) throw error;
    });
    connect().end();
    res.redirect("/ConfiguracionTrunk");
});

// funciones
function connect(){
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'rl2013',
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
    mensajeApply=true;
    connect().end();
}

function save(data){
    fs.writeFile('/etc/asterisk/sip_custom.conf',data,function(err) {
        if (err) {
            throw err;
        } else {
            console.log('Guardado Satisfactoriamente');
        }
    });
}

function trunkInf(res){
connect().query("Select trunk_name,host from outgoing", function(err,result){
    if  (err) throw err;
    Object.keys(result).forEach(function(key) {
        var row = result[key];
        command.get('asterisk -rx "sip show peer '+row.trunk_name+'"',function(err, data, stderr) {
            var getStatus = cmdParser(data).between('Status', "\n").s;
            var cleanUp = getStatus.split(':');
            var trim = cleanUp[1].trim();
            res.render('Trunk-List',{trunkname:row.trunk_name,saddress:myip.address(),daddress:row.host,status:trim});
        });
    });
});
}
function veriTrunk(res){
    connect().query("Select * from trunk",function(err,result){
        if(err){
            throw err;
        } else {
            if(result.length==0){
                res.render('Trunk-Configuration',{apply:false,modify:false});
            }else{
                connect().query("Select o.username,o.trunk_name,o.fromuser,o.secret,o.port,o.type,o.host,i.username as userIn,i.secret as secretIn,i.context as contextIn,i.type as typeIn " +
                    "from trunk t inner join outgoing o on t.id_outgoing =o.id inner join incoming  i on i.id_in = t.id_incoming", function(err,result,fields) {
                    if (err) throw err;
                    Object.keys(result).forEach(function(key) {
                        var row = result[key];
                        if(mensajeApply==true){
                        res.render('Trunk-Configuration',{apply:true,modify:true,trunknameS:row.trunk_name,hostS:row.host,usernameS:row.username,secretS:row.secret,
                            fromuserS:row.fromuser,portS:row.port,userInS:row.userIn,secretInS:row.secretIn});
                        }else {
                            res.render('Trunk-Configuration',{apply:false,modify:true,trunknameS:row.trunk_name,hostS:row.host,usernameS:row.username,secretS:row.secret,
                                fromuserS:row.fromuser,portS:row.port,userInS:row.userIn,secretInS:row.secretIn});
                        }
                    });
                });
            }

        }
        connect().end();
    });
}

module.exports = router;
