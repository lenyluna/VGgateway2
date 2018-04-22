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
    document.getElementById('dNolmal').style.display='block';
    for(var i=index-1;i>0;i--){
        var valor = "check"+i;
        alert("ckeck"+i);
        document.getElementById(valor).style.display = 'none';
    }
    document.getElementById('titleCheck').style.display = 'none';

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

function eliminar(index){
    var posEli = [];
    for(var i=0;i<index;i++){
        var valor = "ch"+i;
        if(document.getElementById(valor).checked == true){
             $.get("/deleteUser/"+document.getElementById(valor).getAttribute('name'));
             posEli[i] = i;
        }
    }
    for(var j=posEli.length-1;j>0;j--){
        if(posEli[j]!=null){
            document.getElementById("bootstrap-data-table").deleteRow(posEli[j]+1);
            index--;
        }

    }
  tableNormal(index-posEli.length);
}
