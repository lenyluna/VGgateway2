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
var applyRoute = false;
var modifyRoute = false;
var myip = require('ip');
var cmdParser = require('string');
var  os = require('os'); //para leer la direccion ip del VG gateway
var setup = require ('setup'); //para poner la configuracion de la ip
var mysql = require('mysql');
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

// comment
router.get('/', function(req, res, next) {
    var date = new Date();
    res.render('login',{veri:false});
});

router.post('/login', function(req, res, next) {
    var  username = req.body.username;
    var  pass     =  req.body.password;
    connect().query("Select * from user where username=? and password=?",[username,pass],function(err,result){
        if(err) throw err;
                if (result.length==1) {
                    console.log("Login satisfactorio");
                    res.render('index');
                } else {
                    console.log("Informaciones incorrectas");
                    res.render('login', {user: username, veri: true});
                }
        connect().end();
    });
});

router.get('/inicio', function(req, res, next) {
    res.render('Device');
});

router.get('/changePass', function(req, res, next) {
    res.render('ChangePassword');
});

router.get('/Routes', function(req, res, next) {
   checkNloadRoute(res);
});

router.post('/saveRoutes', urlencodedParser, function(req, res, next) {
    var getData = req.body;
    var number = parsePhoneNum(getData.phoneNum);
    connect().query('insert into routes values (?,?,?,?,?)', [1,getData.trunkName, getData.dialPattern, number, getData.redirect], function (err,result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });
    connect().query('select id_trunk from trunk', function (err,result) {
        if (err) throw err;
        if(result.length != 0){
            connect().query('insert into trunkRoute values (?,?,?)',[1,1,1], function (err,result) {
                if (err) throw err;
                console.log("Number of records inserted: " + result.affectedRows);
                connect().end();
            });
        }
        else{
            console.log("No se ha Creado el Trunk!");
        }
        connect().end();
    });
    modifyRoute = true;
    applyRoute = true;
    console.log(number + getData.dialPattern + getData.trunkName + getData.redirect);
    res.render('Routes', {modify:modifyRoute,apply: applyRoute});
});

router.post('/modifyRoutes', urlencodedParser, function(req, res, next) {
    var getData = req.body;
    var number = parsePhoneNum(getData.phoneNum);
    connect().query('update routes set trunkName = ?, dialPattern = ?, phoneNum = ?, redirect = ? where id = 1', [getData.trunkName, getData.dialPattern, number, getData.redirect], function (err,result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });
    modifyRoute = true;
    applyRoute = true;
    console.log(number + getData.dialPattern + getData.trunkName + getData.redirect);
    checkNloadRoute(res);
});


router.get('/manageUser', function(req, res, next) {
    loadListUser (res);
});

router.get('/device', function(req, res, next) {
    InterfaceInfo(res);

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
        connect().end();
    });
    connect().query('UPDATE incoming set username=?,secret=? where id=1',[data.usernameI,data.passwordI],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });
    writeFile();

    res.redirect("/ConfiguracionTrunk");
});
router.post('/ConfiguracionTrunk/guardar', urlencodedParser, function(req, res) {
    var data = req.body;
    connect().query('INSERT INTO outgoing VALUES (?,?,?,?,?,?,?,?)',[1,data.usernameT,data.trunkname,data.fromuser,data.secret,data.port,'peer',data.host],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });

    connect().query('INSERT INTO incoming VALUES (?,?,?,?,?)',[1,data.usernameI,data.passwordI,'from-trunk','peer'],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });

    connect().query("INSERT INTO trunk VALUES (1,1,1)",function (error) {
        if(error) throw error;
        connect().end();
    });

    connect().query("select id from routes",function (error, result) {
        if(error) throw error;
        if(result.length != 0){
            connect().query("INSERT INTO trunkRoute VALUES (1,1,1)",function (error) {
                if(error) throw error;
            });
        }
        else{
            console.log("No se ha creado la Ruta !!");
        }
        connect().end();
    });

    mensajeApply = true;
    res.redirect("/ConfiguracionTrunk");
});

router.post('/device/guardar',function(req, res, next) {
    var data = req.body;
    if(data.isDHCP=='on'){
        var interfaces= setup.network.config({
            eth0: {
                auto: true,
                dhcp: true
            }
        });
    }else {
        var interfaces= setup.network.config({
            eth0: {
                auto: true,
                ipv4: {
                    address: data.address,
                    netmask: data.netmask,
                    gateway: data.defaultg
                }
            }
        });
    }
    setup.network.save(interfaces);
    command.run('/etc/init.d/networking reload');
    command.run('reboot');
    res.redirect("/device");
});


// funciones
function parsePhoneNum(phoneNum) {
    var split1 = phoneNum.split('(');
    var split2 = split1[1].split(')');
    var split3 = split2[1].split(' ');
    var split4 = split3[1].split('-');
    var parsedNumber = split2[0]+split4[0] +split4[1];
    return parsedNumber;
}

function connect(){
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'rl2013',
        database: 'VGgateway',
        port: 3306,
        insecureAuth : true
    });
}

function writeFile(){
     var infoOut ="";
    save(infoOut);
    connect().query("Select o.username,o.trunk_name,o.fromuser,o.secret,o.port,o.type,o.host,i.username as userIn,i.secret as secretIn,i.context as contextIn,i.type as typeIn " +
        "from trunk t inner join outgoing o on t.id_outgoing =o.id inner join incoming  i on i.id = t.id_incoming", function(err,result,fields) {
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
connect().end();
}

function checkNloadRoute(res) {
    connect().query('select id from routes', function (err,result) {
        if (err) throw err;
        if (result.length != 0) {
            connect().query('select trunkName,dialPattern,phoneNum,redirect from routes;', function (err,result) {
                Object.keys(result).forEach(function(key) {
                    var row = result[key];
                    console.log("To la droga: " + row.trunkName +"\n"+ row.dialPattern +"\n"+ row.phoneNum +"\n"+ row.redirect+"\n");
                    res.render('Routes',{modify:false,apply:applyRoute, trunkName:row.trunkName,dialPattern:row.dialPattern,phoneNum:row.phoneNum,redirect:row.redirect});
                });
                connect().end();
            });
        }
        else{
            res.render('Routes',{modify:modifyRoute,apply:applyRoute});
        }
        connect().end();
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
                    "from trunk t inner join outgoing o on t.id_outgoing =o.id inner join incoming  i on i.id = t.id_incoming", function(err,result,fields) {
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
    connect().end();
}

function InterfaceInfo(res){
    var eth0 = os.getNetworkInterfaces().wlan0;
    var ipAddress = eth0[0].address;
    var mask  = eth0[0].netmask;
   // var gateway //falta gateway
    res.render('Device',{ip:ipAddress,net:mask});
}

function loadListUser (res){
    connect().query("Select * from user",function(err,result){
        if (err) throw err;
        res.render('manageUsers',{list:result});
    });
    connect().end();
}
module.exports = router;
