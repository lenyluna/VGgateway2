function validar (obj,ip,net,gateway){
var d = document.form;
if(obj.checked==true){
	d.address.value="";
    d.netmask.value="";
    d.defaultg.value="";
    d.address.disabled=true;
    d.netmask.disabled=true;
    d.defaultg.disabled=true;
}else {
    d.address.disabled=false;
    d.netmask.disabled=false;
    d.defaultg.disabled=false;
    d.address.value=ip;
    d.netmask.value=net;
    d.defaultg.value=gateway;
}

}

function mostrar(){
    document.getElementById('prueba').style.display='block';
    document.getElementById('dNolmal').style.display='none';
    document.getElementById('dadd').style.display='block';

}

function original(){
    document.getElementById('prueba').style.display='none';
    document.getElementById('dNolmal').style.display='block';
    document.getElementById('dadd').style.display='none';
    document.getElementById('menj').style.display='none';
    document.getElementById('usuarioActual').style.display='none';
}

function tableNormal(index){
    document.getElementById('dele').style.display= 'none';
    document.getElementById('dNolmal').style.display='block';
    for(var i=0;i<index;i++){
        var valor = "check"+i;
        document.getElementById(valor).style.display = 'none';
    }
    document.getElementById('titleCheck').style.display = 'none';
    document.getElementById('usuarioActual').style.display='none';

}
function tableMostrar(index) {
        document.getElementById('titleCheck').style.display = 'block';
        for(var i=0;i<index;i++){
            var valor = "check"+i;
            document.getElementById(valor).style.display = 'block';
        }
        document.getElementById('dele').style.display='block';
        document.getElementById('dNolmal').style.display='none';
}
function table(index){
    var count=0;
    for(var i=0;i<index;i++){
        var valor = "ch"+i;
        if(document.getElementById(valor).checked == true){
            count++;
        }
    }
    if(count!=0){
        document.getElementById('btnconfirm').disabled = false;
    }else{
        document.getElementById('btnconfirm').disabled = true;
    }
}


function tableDefault(index) {
    for(var i=0;i<index;i++){
        var valor = "check"+i;
        if(document.getElementById(valor)!=null){
            document.getElementById(valor).style.display = 'none';
        }
    }
    document.getElementById('dele').style.display='none';
    document.getElementById('dNolmal').style.display='block';
    document.getElementById('titleCheck').style.display = 'none';
}

function eliminar(index,id){
    var posEli = [];
    var total = document.getElementById('bootstrap-data-table').rows.length;
    for(var i=0;i<index;i++){
        var valor = "ch"+i;
        if(document.getElementById(valor).checked == true){
            if(id==document.getElementById(valor).getAttribute('name')){
                document.getElementById('usuarioActual').style.display='block';
                document.getElementById(valor).checked = false;
            }else {
                $.get("/deleteUser/" + document.getElementById(valor).getAttribute('name'));
                posEli[i] = i;
            }
        }
    }
    for(var j=posEli.length-1;j>0;j--){
        if(posEli[j]!=null){
            document.getElementById("bootstrap-data-table").deleteRow(posEli[j]+1);
        }

    }
    tableDefault(total);
}

id="usuarioActual"