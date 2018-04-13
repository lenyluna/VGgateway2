function validar (obj){
var d = document.form;
if(obj.checked==true){
	d.address.disabled=true;
	d.netmask.disabled=true;
	d.defaultg.disabled=true;
}else {
	d.address.disabled=false;
	d.netmask.disabled=false;
	d.defaultg.disabled=false;
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

}

function tableNormal(index){
    document.getElementById('dele').style.display= 'none';
    document.getElementById('titleCheck').style.display = 'none';
    document.getElementById('dNolmal').style.display='block';
    for(var i=0;i<index;i++){
        var valor = "check"+i;
        document.getElementById(valor).style.display = 'none';
    }

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
function table(obj){
    if(obj.checked==true) {
        document.getElementById('btnDelete').disabled = false;
        document.getElementById('btnCreate').disabled = true;
    }else {
        document.getElementById('btnDelete').disabled = true;
        document.getElementById('btnCreate').disabled = false;
    }

}



function eliminar(index){
    for(var i=0;i<index;i++){
        var valor = "ch"+i;
        if(document.getElementById(valor).checked == true){
             $.get("/deleteUser/"+document.getElementById(valor).getAttribute('name'));
        }
       // document.getElementById("bootstrap-data-table").deleteRow(i+1);
        document.getElementById(valor).checked = false;
    }
}
