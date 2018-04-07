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



/*function encriptar(info){
    var saltRounds = 10;
    encrypt.hash(info,saltRounds,function(err,hash){
        if(err) throw err;
        return hash;
    });
}*/

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
router.get('/dashboard',function (req,res,next) {
    console.log("Cookies :  ", req.cookies);
    trunkInf(res,req);
})
router.get('/', function(req, res, next) {
    var date = new Date();
    res.render('login',{veri:false});
});

router.post('/login', function(req, res, next) {
    var  username = req.body.username;
    var  pass     =  req.body.password;
    var save = req.body.isSelect;
    connect().query("Select * from user where username=? and password=?",[username,pass],function(err,result){
        if(err) throw err;
                if (result.length==1) {
                    console.log("Login satisfactorio");
                    if(save=='on'){
                        console.log("prueba");
                        res.cookie("id_User",result[0].id,{expire : new Date() + 9999}).sendDate;
                    }
                    req.session.userid =result[0].id ;
                    req.session.username = result[0].username;
                    res.redirect('/dashboard');
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
    res.render('ChangePassword',{user:req.session.username});
});

router.get('/Routes', function(req, res, next) {
    applyRoute = false;
   checkNloadRoute(res,req);
});

router.get('/applyRoutes', function(req, res, next) {
    applyRoute = false;
    writeRoutes();
    command.run('sudo asterisk -rx "core reload"');
    res.redirect("/Routes");
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
    checkNloadRoute(res,req);
});

router.post('/modifyRoutes', urlencodedParser, function(req, res, next) {
    var getData = req.body;
    var number = parsePhoneNum(getData.phoneNum);
    connect().query('update routes set trunkName = ?, dialPattern = ?, phoneNum = ?, redirect = ? where id = 1', [getData.trunkName, getData.dialPattern, number, getData.redirect], function (err,result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });
    modifyRoute = false;
    applyRoute = true;
    console.log(number + getData.dialPattern + getData.trunkName + getData.redirect);
    checkNloadRoute(res,req);
});


router.get('/manageUser', function(req, res, next) {
    loadListUser (res,"","","",req);
});

router.get('/device', function(req, res, next) {
    InterfaceInfo(res,req);

});

router.get('/Trunks', function(req, res, next) {
    trunkInf(res,req);
    //res.render('Trunk-List',{trunkname:"prueba",saddress:"192.168.1.0",daddress:"10.0.0.20",status:"Ni idea"});
});

router.get('/ConfiguracionTrunk', function(req, res, next) {
    veriTrunk(res,req);
});

router.get('/ConfiguracionTrunk/applyConf', function(req, res, next) {
    command.run('sudo asterisk -rx "core reload"');
    mensajeApply = false;
    res.redirect("/ConfiguracionTrunk");
});

router.get('/logout',function(req,res,next){
   req.session.destroy();
   res.redirect('/');

});


router.get('/deleteU/:id',function(req,res,next){
    connect().query("delete from user where  id=?",[req.params.id],function(err){
        if (err) throw err;
        res.redirect('/manageUser');
    });
    connect().end();
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

router.post('/newUser',function(req, res, next){
    var username = req.body.username;
    var password = req.body.pass;
    var confirm = req.body.confir;
    var privilegio = req.body.privilegio;

    connect().query("Select * from user where username=?",[username],function(err,result){
        if(err) throw err;
        if(result.length != 0){
            loadListUser (res,"Username already exist",username,privilegio,req);
        }else {
            if(password==confirm){
                connect().query("INSERT INTO user(username,password,rol) VALUES (?,?,?)",[username,password,privilegio],function (error) {
                    if(error) throw error;
                    connect().end();
                    loadListUser (res,"The Username was created successfully","","",req);
                });
            }else {
                loadListUser (res,"The password doesn't match",username,privilegio,req);
            }
        }
        connect().end();
    });

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
function connectToAstDB(){
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'rl2013',
        database: 'asteriskcdrdb',
        port: 3306,
        insecureAuth : true
    });
}

function writeRoutes() {
    var write = "";
    saveRoute(write);
    connect().query('select * from routes', function (err, result) {
        if (err) throw err;
        Object.keys(result).forEach(function (value) {
            var row = result[value];
            write = "[inbound]\n" +
                "exten => _10XX,1,Log(NOTICE, Incoming call from ${CALLERID(all)})\n" +
                "exten => _10XX,n,Dial(SIP/user2)\n" +
                "exten => _10XX,n,Hangup()\n" +
                "\n" +
                "[from-trunk]\n" +
                "exten => _10XX,1,Dial(SIP/"+row.trunkName+"/${EXTEN})\n" + //lo que esta de aqui para arriba solo es para prueba
                "\n" +                                                   //hay que quitarlo a futuro.
                "exten => "+ row.dialPattern+ ",1,Goto(outbound-dongle,${EXTEN},1)\n" +
                "\n" +
                "[outbound-dongle]\n" +
                "exten => "+ row.dialPattern+ ",1,Log(Notice, outbound call from ${CALLERID(all)})\n" +
                "exten => "+ row.dialPattern+ ",n,Dial(dongle/dongle0/${EXTEN})\n" +
                "exten => "+ row.dialPattern+ ",n,Hangup()\n" +
                "\n" +
                "\n" +
                "[from-trunk-dongle]\n" +
                "exten => _.,1,Log(El numero que usted marco es: ${EXTEN})\n" +
                "exten => _.,n,Dial(SIP/"+ row.trunkName+ "/"+row.redirect+")\n";
            saveRoute(write,1);
            write = "[general]\n" +
                "\n" +
                "interval=15              \n" +
                "\n" +
                "[defaults]\n" +
                "\n" +
                "context=from-trunk-dongle\n" +
                "group=0                  \n" +
                "rxgain=0                 \n" +
                "txgain=0                 \n" +
                "autodeletesms=yes        \n" +
                "resetdongle=yes          \n" +
                "u2diag=-1                \n" +
                "usecallingpres=yes       \n" +
                "callingpres=allowed_passed_screen\n" +
                "disablesms=no     \n" +
                "\n" +
                "language=en       \n" +
                "smsaspdu=yes      \n" +
                "mindtmfgap=45     \n" +
                "mindtmfduration=80\n" +
                "mindtmfinterval=20\n" +
                "\n" +
                "callwaiting=auto  \n" +
                "\n" +
                "disable=no        \n" +
                "\n" +
                "initstate=start   \n" +
                "\n" +
                "exten=+1"+row.phoneNum+"\n" +
                "\n" +
                "dtmf=relax        \n" +
                "\n" +
                "[dongle0]\n" +
                "audio=/dev/ttyUSB1\n" +
                "data=/dev/ttyUSB2";
            saveRoute(write,2);
        });
        connect().end();
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
        connect().end();
    });
    mensajeApply=true;
}

function saveRoute(data,num){
    if(num == 1){
        fs.writeFile('/etc/asterisk/extensions_custom.conf',data,function(err) {
            if (err) {
                throw err;
            } else {
                console.log('Guardado Satisfactoriamente');
            }
        });
    }
    if(num == 2){
        fs.writeFile('/etc/asterisk/dongle.conf',data,function(err) {
            if (err) {
                throw err;
            } else {
                console.log('Guardado Satisfactoriamente');
            }
        });
    }
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

function trunkInf(res,req){
connect().query("Select trunk_name,host from outgoing", function(err,result){
    if  (err) throw err;
    Object.keys(result).forEach(function(key) {
        var row = result[key];
        command.get('asterisk -rx "sip show peer '+row.trunk_name+'"',function(err, data, stderr) {
            var getStatus = cmdParser(data).between('Status', "\n").s;
            var cleanUp = getStatus.split(':');
            var trim = cleanUp[1].trim();
            connectToAstDB().query('select calldate, src, dst, disposition,duration from cdr', function (err, result2) {
                if (err) throw err;
                if (result2.length != 0) {
                    res.render('index', {
                        trunkname: row.trunk_name,
                        saddress: myip.address(),
                        daddress: row.host,
                        status: trim,
                        user: req.session.username,
                        listCall: result2});
                }
            });
        });
    });
});
connect().end();
}

function checkNloadRoute(res,req) {
    connect().query('select id from routes', function (err,result) {
        if (err) throw err;
        if (result.length != 0) {
            modifyRoute = false;
            connect().query('select trunkName,dialPattern,phoneNum,redirect from routes;', function (err,result) {
                Object.keys(result).forEach(function(key) {
                    var row = result[key];
                    console.log("To la droga: " + row.trunkName +"\n"+ row.dialPattern +"\n"+ row.phoneNum +"\n"+ row.redirect+"\n");
                    res.render('Routes',{modify:modifyRoute,apply:applyRoute, trunkName:row.trunkName,dialPattern:row.dialPattern,phoneNum:row.phoneNum,redirect:row.redirect,user:req.session.username});
                });
                connect().end();
            });
        }
        else{
            modifyRoute = true;
            res.render('Routes',{modify:modifyRoute,apply:applyRoute});
        }
        connect().end();
    });
}
function veriTrunk(res,req){
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
                            fromuserS:row.fromuser,portS:row.port,userInS:row.userIn,secretInS:row.secretIn,user:req.session.username});
                        }else {
                            res.render('Trunk-Configuration',{apply:false,modify:true,trunknameS:row.trunk_name,hostS:row.host,usernameS:row.username,secretS:row.secret,
                                fromuserS:row.fromuser,portS:row.port,userInS:row.userIn,secretInS:row.secretIn,user:req.session.username});
                        }
                    });
                });
            }

        }
        connect().end();
    });
    connect().end();
}

function InterfaceInfo(res,req){
    var eth0 = os.getNetworkInterfaces().wlan0;
    var ipAddress = eth0[0].address;
    var mask  = eth0[0].netmask;
   // var gateway //falta gateway
    res.render('Device',{ip:ipAddress,net:mask,user:req.session.username});
}

function loadListUser (res,menj,username,privilegio,req){
    connect().query("Select id,username,rol from user",function(err,result){
        if (err) throw err;
       res.render('manageUsers',{list:result,mensaje:menj,user1:username,privi1:privilegio,user:req.session.username});
    });
    connect().end();
}


function loadListCall() {
    connectToAstDB().query('select calldate, src, dst, disposition,duration from cdr', function (err, result) {
        if (err) throw err;
        if (result.length != 0) {
                return result;
        }
        connectToAstDB().end();
    });

}


module.exports = router;
