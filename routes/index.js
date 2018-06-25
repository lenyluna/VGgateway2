var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var power = false; //verificar si es administrador o no
var fs = require('fs');
var command = require('node-cmd');
var mensajeApply = false;
var applyRoute = false;
var modifyRoute = false;
var deviceApply = false;
var myip = require('ip');
var cmdParser = require('string');
var  os = require('os'); //para leer la direccion ip del VG gateway
var setup = require ('setup'); //para poner la configuracion de la ip
var mysql = require('mysql');
var listSession = [];
var urlencodedParser = bodyParser.urlencoded({
    extended: false
});

function isAuthe(req,res,next){
    if(req.session.username!=null){
        return next();
    }else {
        res.redirect('/');
    }
}
// comment
router.get('/dashboard',isAuthe,function (req,res,next) {
    trunkInf(res,req);
});

router.get('/', function(req, res, next) {
    //var date = new Date();
    if(req.session.username!=null && req.session.address== req.connection.remoteAddress){
        res.redirect('/dashboard');
    }else{
        checkApply();
        res.render('login',{veri:false,menjSession:""});
    }
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
                    }
                    if(checkS(result[0].id)){
                        res.render('login', {veri: false, menjSession:"Someone is already logged in with that user!"});
                    }else{
                        req.session.userid =result[0].id ;
                        req.session.username = result[0].username;
                        req.session.address = req.connection.remoteAddress;
                        listSession.push(result[0].id);
                        if(result[0].rol == "Admin"){
                            power=true;
                        }else {
                            power=false;
                        }
                        res.redirect('/dashboard');
                    }

                } else {
                    console.log("Informaciones incorrectas");
                    res.render('login', {user: username, veri: true,menjSession:""});
                }
        connect().end();
    });
});

router.get('/inicio',isAuthe, function(req, res, next) {
    res.render('Device');
});

router.get('/changePass',isAuthe, function(req, res, next) {
    res.render('ChangePassword',{user:req.session.username,menj:"",power:power});
});

function checkS(id){
    var exist= false;
    for(var i=0;i<listSession.length;i++){
        if(listSession[i]==id){
           return true;
        }
    }

}
/*function checkSession(id, callback){
    var exist= callback(false);
   for(var i=0;i<listSession.length;i++){
       if(listSession[i]==id){
           exist = callback(true);
       }
   }
   return exist;
}
*/
router.post('/SavePass', function(req, res, next) {
    var oldPass = req.body.oldP;
    var newPass = req.body.newP;
    var confirmPass = req.body.conP;
    var id = req.session.userid;
    if(newPass==confirmPass){
        connect().query("select * from user where password=? and  id=?",[oldPass,id],function (error,result) {
            if(error) throw error;
            if(result.length!=0 ){
                if(oldPass==newPass){
                    res.render('ChangePassword',{user:req.session.username,menj:"Old password matched new password. Please type a different onef.",power:power});
                }else {
                    connect().query('UPDATE user set password=? where id=?',
                        [newPass, id], function (err) {
                            if (err) throw err;
                            res.render('ChangePassword', {
                                user: req.session.username,
                                menj: "Password changed successfully",
                                power:power
                            });
                        });
                }
            }else {
                res.render('ChangePassword',{user:req.session.username,menj:"The old password is incorrect",power:power});
            }
        });
    }else {
        res.render('ChangePassword',{user:req.session.username,menj:"The new password doesn't match",power:power});
    }
    connect().end();
});
router.get('/Routes',isAuthe, function(req, res, next) {
   checkNloadRoute(res,req);
});

router.get('/applyRoutes',isAuthe, function(req, res, next) {
    applyRoute = false;
    writeRoutes();
    command.run('sudo asterisk -rx "core reload"');
    res.redirect("/Routes");
});

router.post('/saveRoutes', urlencodedParser, function(req, res, next) {
    var getData = req.body;
    var number = parsePhoneNum(getData.phoneNum);
    connect().query('insert into routes values (?,?,?,?)', [1,getData.trunkName, getData.dialPattern, number], function (err,result) {
        if (err) throw err;
       // console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });

    modifyRoute = true;
    applyRoute = true;
    //console.log(number + getData.dialPattern + getData.trunkName + getData.redirect);
    checkNloadRoute(res,req);
});

router.post('/modifyRoutes', urlencodedParser, function(req, res, next) {
    var getData = req.body;
    var number = parsePhoneNum(getData.phoneNum);
    connect().query('update routes set trunkName = ?, dialPattern = ?, phoneNum = ? where id = 1', [getData.trunkName, getData.dialPattern, number], function (err,result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });
    modifyRoute = false;
    applyRoute = true;
    console.log(number + getData.dialPattern + getData.trunkName + getData.redirect);
    checkNloadRoute(res,req);
});


router.get('/manageUser',isAuthe, function(req, res, next) {
    loadListUser (res,"","","",req);
});

router.get('/device', isAuthe,function(req, res, next) {
    loadDeviceConfig(res,req);
});

router.post('/submitDeviceConfig', isAuthe,function(req, res, next) {
    var data = req.body;
    console.log("el maldito gayway: " + data.defaultg);
    saveDeviceToDB(data, req, res);
    deviceApply = true;
});


router.get('/ConfiguracionTrunk',isAuthe, function(req, res, next) {
    veriTrunk(res,req);
});

router.get('/ConfiguracionTrunk/applyConf',isAuthe, function(req, res, next) {
    writeFile();
    command.run('sudo asterisk -rx "core reload"');
    mensajeApply = false;
    res.redirect("/ConfiguracionTrunk");
});

router.get('/logout',isAuthe,function(req,res,next){
    var index = listSession.indexOf(req.session.userid);
    var removed= listSession.splice(index,1);
   req.session.destroy();
   res.redirect('/');
});


router.get('/deleteUser/:id',urlencodedParser,isAuthe,function(req,res,next){
    var id= req.params.id;
    connect().query("delete from user where id=?",[id],function(err){
        if (err) throw err;
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
    mensajeApply = true;
    res.redirect("/ConfiguracionTrunk");
});
router.post('/ConfiguracionTrunk/guardar', urlencodedParser, function(req, res) {
    var data = req.body;
    connect().query('INSERT INTO outgoing VALUES (?,?,?,?,?,?,?,?)',[1,data.usernameT,data.trunkname,data.fromuser,data.secret,data.port,'user',data.host],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });

    connect().query('INSERT INTO incoming VALUES (?,?,?,?,?)',[1,data.usernameI,data.passwordI,'from-trunk','user'],function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
        connect().end();
    });
    saveTrunk();
    mensajeApply = true;
    res.redirect("/ConfiguracionTrunk");
});

function saveTrunk(){
    connect().query("INSERT INTO trunk VALUES (1,1,1)",function (error) {
        if(error) throw error;
        connect().end();
    });
}

router.get('/applyDeviceConfig',function(req, res, next) {
    connect().query("select * from eth0",function (error, result) {
        if(error) throw error;
        Object.keys(result).forEach(function (value){
            var row = result[value];
            var write ="";
            saveNetwork(write);
            if(row.type=='on'){
                write = "source-directory /etc/network/interfaces.d\n" +
                    "auto eth0\n" +
                    "iface eth0 inet dhcp\n";
                saveNetwork(write);
            }else {
                write = "source-directory /etc/network/interfaces.d\n" +
                    "auto eth0\n" +
                    "iface eth0 inet static\n" +
                    "address " + row.ip +"\n" +
                    "netmask " + row.netmask +"\n" +
                    "gateway " + row.gateway +"\n";
                saveNetwork(write);
            }
        });
        connect().end();
    });

    deviceApply = false;
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
                    loadListUser (res,"The user was created successfully","","",req);
                });
            }else {
                loadListUser (res,"The password doesn't match",username,privilegio,req);
            }
        }
        connect().end();
    });

});

// funciones

function loadDeviceConfig(res,req){
    connect().query('select * from eth0', function (err,result) {
        if (err) throw err;
            Object.keys(result).forEach(function (key) {
                var row = result[key];
                res.render('Device',{ip:row.ip,net:row.netmask, gateway: row.gateway, dhcp: row.type,user:req.session.username,power:power, apply: deviceApply});
            });
            connect().end();
        });
}

function saveDeviceToDB(data, req, res){
    connect().query('select id from eth0 where id =1', function (err, result) {
        if(err) throw err;
        if(result.length == 0){
            connect().query('insert into eth0 values (?,?,?,?,?)', [1,data.address, data.netmask, data.defaultg, data.isDHCP], function (err,result) {
                if (err) throw err;
                console.log("gateway: " + data.defaultg);
                connect().end();
                loadDeviceConfig(res,req);
            });
        }
        else{
            console.log("gateway before update: " + data.defaultg);
            connect().query('update eth0 set ip = ?, netmask = ?, gateway = ?, type = ? where id=1', [data.address, data.netmask, data.defaultg, data.isDHCP], function (err,result) {
                if (err) throw err;
                console.log("Number of records inserted: " + result.affectedRows);
                console.log("gateway after update: " + data.defaultg);
                connect().end();
                loadDeviceConfig(res,req);
            });
        }
    });
}


function saveNetwork(data){
    fs.writeFile('/etc/network/interfaces',data,function(err) {
        if (err) {
            throw err;
        } else {
            console.log('Guardado Satisfactoriamente');
        }
    });
}

function checkApply() {

    connect().query("select * from trunk",function (error, result) {
        if(error) throw error;
        if(result.length != 0){
            fs.readFile('/etc/asterisk/sip_custom.conf', function(err, data){
                if(err) throw err;
                if(data.length == 1){
                    mensajeApply = true;
                }
            });
        }
        connect().end();
    });

    connect().query("select * from routes",function (error, result) {
        if(error) throw error;
        if(result.length != 0){
            fs.readFile('/etc/asterisk/extensions_custom.conf', function(err, data){
                if(err) throw err;
                if(data.length == 1){
                    applyRoute = true;
                }
            });
        }
        connect().end();
    });


    //console.log("data afuera: " +data.gateway);
    connect().query("select * from eth0",function (error, result1) {

        if(error) throw error;
        if(result1.length != 0){
            Object.keys(result1).forEach(function (key) {
                InterfaceInfo(function (result2) {
                    var row = result1[key];
                    console.log("data: " +result2.dhcp + "\nrow: " + row.type);
                    console.log("data: " +result2.address + "\nrow: " + row.ip);
                    console.log("data: " +result2.netmask + "\nrow: " + row.netmask);
                    console.log("data: " +result2.gateway + "\nrow: " + row.gateway);
                    if(result2.address != row.ip || result2.netmask != row.netmask || result2.gateway != row.gateway || result2.dhcp != row.type){
                        deviceApply = true;
                        console.log("apply: " + deviceApply);
                        console.log("data final: " +result2.gateway + "\nrow final: " + row.gateway);
                    }
                });
            });
        }
        connect().end();
    });
}

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
        database: 'VGgatewayDB',
        port: 3306,
        insecureAuth : true
    });
}
function connectToAstDB(){
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'rl2013',
        database: 'asteriskcdr',
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
                "exten => _20XX,1,Dial(SIP/${EXTEN})"
                "\n"+
                +"exten => "+ row.dialPattern+ ",1,AGI(/var/lib/asterisk/agi-bin/LlamadaGSM.py, ${EXTEN})\n" +
                "\n" +
                +"exten => "+ row.dialPattern+ ",n,Dial(CONSOLE/DSP)\n" +
                "\n" +
                +"exten => "+ row.dialPattern+ ",n,Hangup()\n" +
                "\n" +
                +"exten => h,1,AGI(/var/lib/asterisk/agi-bin/HangupGSM.py)\n" +
                "\n"
            saveRoute(write);
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
            //console.log(infoOut);
           save(infoOut);
        });
        connect().end();
    });
    mensajeApply=true;
}

function saveRoute(data){
        fs.writeFile('/etc/asterisk/extensions_custom.conf',data,function(err) {
            if (err) {
                throw err;
            } else {
                console.log('Guardado Satisfactoriamente');
            }
        });
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
    var myData = [];
connect().query("Select trunk_name,host from outgoing", function(err,result){
    if  (err) throw err;
    if(result.length != 0){
        Object.keys(result).forEach(function(key) {
            var row = result[key];
            command.get('asterisk -rx "sip show peer '+row.trunk_name+'"',function(err, data, stderr) {
                var getStatus = cmdParser(data).between('Status', "\n").s;
                var cleanUp = getStatus.split(':');
                var trim = cleanUp[1].trim();
                connectToAstDB().query('select calldate, src, dst, disposition,duration from cdr', function (err, result2) {
                    if (err) throw err;
                    if (result2.length != 0) {
                       /* var date = new Date();
                        var year = date.getFullYear();
                        var month = date.getMonth()+ 1;
                        var day = date.getDate()+1;
                        var i = [1,2,3,4,5,6,7];
                        i.forEach(function (value) {
                            decreaseDay(day, function (yesterday) {
                                day = yesterday;
                            });
                             queryCallDates(year, month, day, function (queryResult) {
                                myData.push(queryResult);
                                console.log(queryResult);
                            });
                        });*/
                        res.render('index', {
                            trunkname: row.trunk_name,
                            saddress: myip.address(),
                            daddress: row.host,
                            status: trim,
                            user: req.session.username,
                            listCall: result2,
                            power:power});
                    }
                });
            });
        });
    }
    else{
        connectToAstDB().query('select calldate, src, dst, disposition,duration from cdr', function (err, result2) {
            if (err) throw err;
            if (result2.length != 0) {
                res.render('index', {
                    trunkname: null,
                    saddress: null,
                    daddress: null,
                    status: null,
                    user: req.session.username,
                    listCall: result2,
                    power:power
                });
            }
        });
    }
});
connect().end();
}

function print(data, callback) {
    if(data.length != 0){
        console.log("info: " + data);
        return callback(1);
    }else{
        return callback(null);
    }

}

function loop2GetData(data, callback) {

    return data;
}

function queryCallDates(year, month, day, callback) {
   connectToAstDB().query('select calldate, duration from cdr where calldate between "?-?-? 00:00:00" and "?-?-? 23:59:59"', [year,month,day,year,month,day], function (err, get) {
       console.log("today is: " +day);
       console.log("select calldate, duration from cdr where calldate between '"+year+"-"+month+"-"+day+" 00:00:00' and '"+year+"-"+month+"-"+day+" 23:59:59';");
       connectToAstDB().end();
       return callback(get);
   });
}

function decreaseDay(day, callback) {
    var decreasedDay = callback(day-1);
    return decreasedDay;
}

function checkNloadRoute(res,req) {
    connect().query('select id from routes', function (err,result) {
        if (err) throw err;
        if (result.length != 0) {
            modifyRoute = false;
            connect().query('select trunkName,dialPattern,phoneNum,redirect from routes;', function (err,result) {
                Object.keys(result).forEach(function(key) {
                    var row = result[key];
                    res.render('Routes',{modify:modifyRoute,apply:applyRoute, trunkName:row.trunkName,dialPattern:row.dialPattern,phoneNum:row.phoneNum,redirect:row.redirect,user:req.session.username,mensaje:false,power:power});
                });
                connect().end();
            });
        }
        else{
            modifyRoute = true;
            connect().query("select trunk_name from outgoing",function(err,result){
                if (err) throw err;
                if(result.length!=0) {
                    Object.keys(result).forEach(function (key) {
                        var row = result[key];
                        res.render('Routes',{modify:modifyRoute,apply:applyRoute,trunkName2:row.trunk_name,mensaje:false,power:power,user:req.session.username});
                    });
                }else {
                    res.render('Routes',{modify:modifyRoute,apply:applyRoute,trunkName2:"",mensaje:true,power:power,user:req.session.username});
                }
                connect().end();
            });


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
                res.render('Trunk-Configuration',{apply:false,modify:false,power:power,user:req.session.username});
            }else{
                connect().query("Select o.username,o.trunk_name,o.fromuser,o.secret,o.port,o.type,o.host,i.username as userIn,i.secret as secretIn,i.context as contextIn,i.type as typeIn " +
                    "from trunk t inner join outgoing o on t.id_outgoing =o.id inner join incoming  i on i.id = t.id_incoming", function(err,result,fields) {
                    if (err) throw err;
                    Object.keys(result).forEach(function(key) {
                        var row = result[key];
                        if(mensajeApply==true){
                        res.render('Trunk-Configuration',{apply:true,modify:true,trunknameS:row.trunk_name,hostS:row.host,usernameS:row.username,secretS:row.secret,
                            fromuserS:row.fromuser,portS:row.port,userInS:row.userIn,secretInS:row.secretIn,user:req.session.username,power:power});
                        }else {
                            res.render('Trunk-Configuration',{apply:false,modify:true,trunknameS:row.trunk_name,hostS:row.host,usernameS:row.username,secretS:row.secret,
                                fromuserS:row.fromuser,portS:row.port,userInS:row.userIn,secretInS:row.secretIn,user:req.session.username,power:power});
                        }
                    });
                });
            }

        }
        connect().end();
    });
    connect().end();
}

function parseGateway(callback) {
    var getGateway = "fokdisshit";
    command.get('ip route',function(err, data) {
        getGateway = callback(cmdParser(data).between('via ', ' dev').s);
    });
    return getGateway;
}

function parseDHCP(callback) {
    var isDHCP = null;
    command.get(' cat /etc/network/interfaces',function(err, data1, stderr) {
        if (cmdParser(data1).contains("dhcp")) {
            isDHCP = callback('on');
        }
        else{
            isDHCP = callback(null);
        }
    });
    console.log("parsed dhcp: " +isDHCP);
    return isDHCP;
}

function InterfaceInfo(callback){
    var eth0 = os.getNetworkInterfaces().eth0;
    var data = null;
    parseGateway(function (result1) {
        console.log("gateway: " + result1);
        parseDHCP(function (result2) {
            console.log("testest");
            console.log("dhcp: " + result2)
            data = callback({
                address: eth0[0].address,
                netmask: eth0[0].netmask,
                gateway: result1,
                dhcp: result2
            });
        });
    });
    return data;
}

function loadListUser (res,menj,username,privilegio,req){
    connect().query("Select id,username,rol from user",function(err,result){
        if (err) throw err;
        if(result.length!=0){
            res.render('manageUsers',{list:result,mensaje:menj,user1:username,privi1:privilegio,user:req.session.username,power:power,userid:req.session.userid});
        }
    });
    connect().end();
}

function loadListCall() {
    connectToAstDB().query('select calldate, src, dst, disposition,duration from cdr', function (err, result) {
        if (err) throw err;
        if (result.length != 0) {
            console.log(result[0].calldate);
            return result;

        }
        connectToAstDB().end();
    });
}

module.exports = function (){
    this.tryto = function () {
        return 10;
    }
};


module.exports = router;
