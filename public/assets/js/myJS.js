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