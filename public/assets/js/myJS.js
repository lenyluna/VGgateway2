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

function table(obj){
    if(obj.checked==true) {
        document.getElementById('btnDelete').disabled = false;
        document.getElementById('btnCreate').disabled = true;
    }else {
        document.getElementById('btnDelete').disabled = true;
        document.getElementById('btnCreate').disabled = false;
    }
}