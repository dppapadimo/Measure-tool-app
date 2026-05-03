const canvas = new fabric.Canvas('canvas', { selection:false });

let mode = 'angle';
let zoom = 1;
let unit = 'm';

let scaleFactor = null; // meters per pixel

let angles = [];
let currentPoints = [];

let gridLines = [];
let gridVisible = false;
let snapEnabled = false;

// -------- MODE ----------
function setMode(m){
  mode = m;
  currentPoints = [];
  document.getElementById("info").innerText = "Mode: " + m;
}

// -------- UNIT ----------
function setUnit(u){
  unit = u;
  updateAll();
}

// -------- IMAGE ----------
document.getElementById('upload').addEventListener('change', e => {
  const reader = new FileReader();

  reader.onload = f => {
    fabric.Image.fromURL(f.target.result, img => {

      canvas.clear();
      angles = [];
      currentPoints = [];
      zoom = 1;

      const scale = window.innerWidth / img.width;

      canvas.setWidth(img.width * scale);
      canvas.setHeight(img.height * scale);

      img.set({
        scaleX: scale,
        scaleY: scale,
        originX:'left',
        originY:'top'
      });

      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
  };

  reader.readAsDataURL(e.target.files[0]);
});

// -------- CLICK ----------
canvas.on('mouse:down', opt => {

  const p = canvas.getPointer(opt.e);

  const c = new fabric.Circle({
    left:p.x, top:p.y,
    radius:5,
    fill:'red',
    originX:'center',
    originY:'center'
  });

  c.on('moving', () => {
    if(snapEnabled) snap(c);
    updateAll();
  });

  canvas.add(c);
  currentPoints.push(c);

  if(mode==='angle' && currentPoints.length===3){
    createAngle(currentPoints);
    currentPoints=[];
  }

  if(mode==='distance' && currentPoints.length===2){
    createDistance(currentPoints);
    currentPoints=[];
  }

  if(mode==='calibration' && currentPoints.length===2){
    calibrate(currentPoints);
    currentPoints=[];
  }
});

// -------- CALIBRATION ----------
function calibrate(p){

  const real = parseFloat(document.getElementById("realLength").value);

  if(!real){
    alert("Βάλε πραγματικό μήκος!");
    return;
  }

  const dx = p[0].left - p[1].left;
  const dy = p[0].top - p[1].top;

  const px = Math.sqrt(dx*dx + dy*dy);

  scaleFactor = real / px;

  alert("Calibration OK");
}

// -------- ANGLE ----------
function createAngle(p){
  const label = String.fromCharCode(65+angles.length);
  const obj={type:'angle',label,p};
  angles.push(obj);
  draw(obj);
}

// -------- DISTANCE ----------
function createDistance(p){
  const label = "D"+angles.length;
  const obj={type:'distance',label,p};
  angles.push(obj);
  draw(obj);
}

// -------- DRAW ----------
function draw(o){

  const line1 = new fabric.Line([0,0,0,0],{stroke:'green'});
  const line2 = new fabric.Line([0,0,0,0],{stroke:'green'});
  const text = new fabric.Text('',{fontSize:16,fill:'blue'});

  o.line1=line1;
  o.line2=line2;
  o.text=text;

  canvas.add(line1,line2,text);

  updateObject(o);
}

// -------- UPDATE ----------
function updateAll(){
  angles.forEach(updateObject);
  canvas.renderAll();
}

function updateObject(o){

  if(o.type==='angle') updateAngle(o);
  if(o.type==='distance') updateDistance(o);
}

function updateAngle(o){

  const [A,B,C]=o.p;

  const BA={x:A.left-B.left,y:A.top-B.top};
  const BC={x:C.left-B.left,y:C.top-B.top};

  const dot=BA.x*BC.x+BA.y*BC.y;
  const ang=Math.acos(dot/(Math.hypot(BA.x,BA.y)*Math.hypot(BC.x,BC.y)))*(180/Math.PI);

  o.line1.set({x1:B.left,y1:B.top,x2:A.left,y2:A.top});
  o.line2.set({x1:B.left,y1:B.top,x2:C.left,y2:C.top});

  o.text.set({
    left:B.left+10,
    top:B.top-20,
    text:`${o.label}: ${ang.toFixed(1)}°`
  });
}

function updateDistance(o){

  const [A,B]=o.p;

  const dx=A.left-B.left;
  const dy=A.top-B.top;

  let dist=Math.sqrt(dx*dx+dy*dy);

  if(scaleFactor){
    dist*=scaleFactor;

    if(unit==='cm') dist*=100;
    if(unit==='mm') dist*=1000;
  }

  o.line1.set({x1:A.left,y1:A.top,x2:B.left,y2:B.top});

  o.text.set({
    left:(A.left+B.left)/2,
    top:(A.top+B.top)/2,
    text:`${o.label}: ${dist.toFixed(2)} ${unit}`
  });
}

// -------- SNAP ----------
function snap(p){
  const s=50;
  p.left=Math.round(p.left/s)*s;
  p.top=Math.round(p.top/s)*s;
}

// -------- GRID ----------
function toggleGrid(){

  if(gridVisible){
    gridLines.forEach(l=>canvas.remove(l));
    gridLines=[];
    gridVisible=false;
    return;
  }

  for(let i=0;i<canvas.width;i+=50){
    const l=new fabric.Line([i,0,i,canvas.height],{stroke:'#ddd'});
    canvas.add(l); gridLines.push(l);
  }

  for(let j=0;j<canvas.height;j+=50){
    const l=new fabric.Line([0,j,canvas.width,j],{stroke:'#ddd'});
    canvas.add(l); gridLines.push(l);
  }

  gridVisible=true;
}

// -------- ZOOM ----------
function zoomIn(){ zoom+=0.1; canvas.setZoom(zoom); }
function zoomOut(){ zoom-=0.1; if(zoom<0.5) zoom=0.5; canvas.setZoom(zoom); }

// -------- UNDO ----------
function undo(){
  if(currentPoints.length){
    canvas.remove(currentPoints.pop());
    return;
  }
  if(angles.length){
    const a=angles.pop();
    a.p.forEach(p=>canvas.remove(p));
    canvas.remove(a.line1,a.line2,a.text);
  }
}

// -------- SAVE ----------
function saveImage(){
  const url=canvas.toDataURL({format:'png'});
  const a=document.createElement('a');
  a.href=url;
  a.download='measure.png';
  a.click();
}

// -------- RESET ----------
function resetAll(){
  canvas.clear();
  angles=[];
  currentPoints=[];
  scaleFactor=null;
}
